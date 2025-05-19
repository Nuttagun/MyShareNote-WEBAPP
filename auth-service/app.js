const express = require('express');
const { Client } = require('pg');
const amqp = require('amqplib');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
// # เพิ่ม dependencies สำหรับ Prometheus metrics
const client = require('prom-client');
const axios = require('axios');

const JWT_SECRET = 'jwt_very_very_secret'; 
const PORT = 5003;

const app = express();

app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
}));

app.use(express.json());

// # สร้าง Registry สำหรับเก็บ metrics ทั้งหมด
const register = new client.Registry();

// # เพิ่ม default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// # สร้าง metrics สำหรับ HTTP requests
const httpRequestCounter = new client.Counter({
  name: 'auth_http_requests_total', // # ชื่อ metric
  help: 'Total number of HTTP requests to auth service', // # คำอธิบาย metric
  labelNames: ['method', 'route', 'status'], // # labels สำหรับแยกประเภท
  registers: [register] // # เพิ่มเข้า registry
});

// # สร้าง metrics สำหรับเวลาที่ใช้ในการตอบสนอง
const httpRequestDuration = new client.Histogram({
  name: 'auth_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for auth service',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // # ช่วงเวลาที่ต้องการวัด
  registers: [register]
});

// Successful logins
const loginSuccessCounter = new client.Counter({
  name: 'auth_login_success_total',
  help: 'Total successful logins',
  registers: [register]
});

// Failed logins
const loginFailureCounter = new client.Counter({
  name: 'auth_login_failure_total',
  help: 'Total failed login attempts',
  registers: [register]
});

// Successful registration
const registerSuccessCounter = new client.Counter({
  name: 'auth_register_success_total',
  help: 'Total successful registrations',
  registers: [register]
});

// Failed registration
const registerFailureCounter = new client.Counter({
  name: 'auth_register_failure_total',
  help: 'Total failed registration attempts',
  registers: [register]
});

// # ฟังก์ชันสำหรับส่ง metrics ไปยัง Pushgateway
async function pushMetrics() {
  try {
    // # ดึง metrics ทั้งหมดจาก registry
    const metrics = await register.metrics();
    
    // # ส่ง metrics ไปยัง Pushgateway
    await axios.post('http://pushgateway:9091/metrics/job/auth_service', metrics, {
      headers: { 'Content-Type': 'text/plain' }
    });
    
    console.log('Metrics pushed to Pushgateway successfully');
  } catch (error) {
    console.error('Error pushing metrics to Pushgateway:', error.message);
  }
}

// # ส่ง metrics ทุก 15 วินาที
function startMetricsPusher() {
  setInterval(() => {
    pushMetrics();
  }, 15000); // # 15000 ms = 15 วินาที
}

// # Middleware สำหรับวัดเวลาและนับจำนวน requests
app.use((req, res, next) => {
  const start = Date.now();
  
  // # เมื่อ response เสร็จสิ้น
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000; // # แปลงเป็นวินาที
    
    // # เพิ่มค่า counter
    httpRequestCounter.inc({ 
      method: req.method, 
      route: req.path, 
      status: res.statusCode 
    });
    
    // # บันทึกเวลาที่ใช้
    httpRequestDuration.observe({ 
      method: req.method, 
      route: req.path, 
      status: res.statusCode 
    }, duration);
  });
  
  next();
});
// PostgreSQL connection
const pgClient = new Client({
  user: 'postgres',
  host: 'note-db',
  database: 'note_db',
  password: 'password',
  port: 5432,
});

const connectDB = async () => {
  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL', err);
    process.exit(1);
  }
};

// RabbitMQ connection for RPC
let channel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect('amqp://guest:guest@rabbitmq');
    channel = await connection.createChannel();
    await channel.assertQueue('auth_rpc_queue');
    console.log('Connected to RabbitMQ');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
    process.exit(1);
  }
};

// HELLO API
app.get('/hello', (req, res) => {
  res.status(200).json({ message: 'Hello, world!' });
});

// REGISTER
app.post('/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    // INSERT แล้วดึง user_id ที่ DB สร้างมาให้
    const result = await pgClient.query(
      `INSERT INTO users (username, email, password_hash)
       VALUES ($1, $2, $3)
       RETURNING user_id`,
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].user_id;  

    // สร้าง token โดยฝัง user_id, username, email
    const token = jwt.sign(
      { user_id: userId, username, email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );
    registerSuccessCounter.inc();
    res.status(201).json({
      message: 'User registered successfully',
      token,
      token_type: 'Bearer'
    });

  } catch (err) {
    console.error('Register error:', err);
    registerFailureCounter.inc();
    res.status(500).json({ error: 'Registration failed' });
  }
});


// LOGIN
app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pgClient.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    const user = result.rows[0];
    if (!user) {
      loginFailureCounter.inc();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      loginFailureCounter.inc();
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { user_id: user.user_id, username: user.username,email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    // ✅ เพิ่ม token_type
    loginSuccessCounter.inc();  // login success
    res.json({ token, token_type: 'Bearer' });
  } catch (err) {
    console.error('Login error:', err);
    loginFailureCounter.inc();
    res.status(500).json({ error: 'Login failed' });
  }

});


// Middleware for protected routes
const authenticate = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader?.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Missing token' });

  try {
    const user = jwt.verify(token, JWT_SECRET);
    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

app.get('/auth/users', async (req, res) => {
  try {
    const result = await pgClient.query(
      'SELECT user_id, username, email FROM users ORDER BY username'
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Get all users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// RPC handler
const handleRPCRequest = async (msg) => {
  try {
    const nodeId = msg.content.toString();
    const result = await pgClient.query('SELECT * FROM notes WHERE node_id = $1', [nodeId]);
    const response = result.rows.length > 0 ? result.rows[0] : { error: 'Note not found' };

    channel.sendToQueue(
      msg.properties.replyTo,
      Buffer.from(JSON.stringify(response)),
      { correlationId: msg.properties.correlationId }
    );
    channel.ack(msg);
  } catch (err) {
    console.error('RPC Handling Error:', err);
  }
};

app.get('/auth/users/:id', authenticate, async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await pgClient.query(
      'SELECT user_id, username, email FROM users WHERE user_id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Get user by ID error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// # เพิ่ม endpoint สำหรับ metrics (optional)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start consuming RPC requests
const startRPCServer = async () => {
  await connectRabbitMQ();
  channel.consume('auth_rpc_queue', handleRPCRequest);
  console.log('Auth Service is waiting for RPC requests...');
};

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (pgClient) await pgClient.end();
  if (channel) await channel.close();
  process.exit(0);
});

// Start Services
const startServer = async () => {
  await connectDB();
  await startRPCServer();
  startMetricsPusher(); // <-- เพิ่มบรรทัดนี้เพื่อให้เริ่มส่ง Metrics ไปยัง Pushgateway

  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
  });
};

startServer();
