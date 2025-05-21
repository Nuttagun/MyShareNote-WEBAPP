
const express = require('express');
const { Client } = require('pg');
const amqp = require('amqplib');
const cors = require('cors');  
const app = express();
// # เพิ่ม dependencies สำหรับ Prometheus metrics
const client = require('prom-client');
const axios = require('axios');

app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
}));


app.use(express.json());

const PORT = 5004;

// # สร้าง Registry สำหรับเก็บ metrics ทั้งหมด
const register = new client.Registry();

// # เพิ่ม default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// # สร้าง metrics สำหรับ HTTP requests
const httpRequestCounter = new client.Counter({
  name: 'notification_http_requests_total', // # ชื่อ metric
  help: 'Total number of HTTP requests to notification service', // # คำอธิบาย metric
  labelNames: ['method', 'route', 'status'], // # labels สำหรับแยกประเภท
  registers: [register] // # เพิ่มเข้า registry
});

// # สร้าง metrics สำหรับเวลาที่ใช้ในการตอบสนอง
const httpRequestDuration = new client.Histogram({
  name: 'notification_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for notification service',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // # ช่วงเวลาที่ต้องการวัด
  registers: [register]
});

const notificationCreatedCounter = new client.Counter({
  name: 'notification_created_total',
  help: 'Total number of notifications created',
  registers: [register],
});


// # ฟังก์ชันสำหรับส่ง metrics ไปยัง Pushgateway
async function pushMetrics() {
  try {
    // # ดึง metrics ทั้งหมดจาก registry
    const metrics = await register.metrics();
    
    // # ส่ง metrics ไปยัง Pushgateway
    await axios.post('http://pushgateway:9091/metrics/job/notification_service', metrics, {
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
    await channel.assertQueue('note_rpc_queue');
    await channel.assertQueue('notification_event_queue');
    console.log('Connected to RabbitMQ');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
    process.exit(1);
  }
};

// CRUD Operations
// app.get('/api/notifications', async (req, res) => {
//   try {
//     const result = await client.query('SELECT * FROM notes');
//     res.json({ message: 'notification service', data: result.rows });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });
// ดึงไลค์ทั้งหมดของ user คนนี้
// app.get('/api/social/user-likes/:userId', async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const result = await pgClient.query(
//       'SELECT note_id, created_at FROM likes WHERE user_id = $1',
//       [userId]
//     );
//     res.json({ likes: result.rows }); 
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// });

app.get('/api/notifications/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pgClient.query(
      'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    res.json({ notifications: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});




// RPC handler
const handleRPCRequest = async (msg) => {
  try {
    const nodeId = msg.content.toString();
    const result = await pgClient.lient.query('SELECT * FROM notes WHERE node_id = $1', [nodeId]);
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

const startEventConsumer = async () => {
  const eventQueue = 'notification_event_queue';

  await channel.assertQueue(eventQueue,  { durable: true });

  channel.consume(eventQueue, async msg => {
    const data = JSON.parse(msg.content.toString());
    console.log('Received event:', data);
    if (data.type === 'note_liked') {
      const message = `${data.fromUser} liked your note "${data.noteTitle}"`;  // ใช้ชื่อผู้ใช้จาก fromUser
      console.log(`👍 ไลก์โน้ต: ${message}`);
      await saveNotification(data.user_id, message);  // บันทึกแจ้งเตือน
    }
    channel.ack(msg);
  });

  console.log('✅ Listening for notification events...');
};

const saveNotification = async (userId, message) => {
  try {
    await pgClient.query(
      'INSERT INTO notifications (user_id, message) VALUES ($1, $2)',
      [userId, message]
    );
    console.log(`✅ แจ้งเตือนถูกบันทึกให้ ${userId}`);
  } catch (err) {
    console.error('❌ บันทึกแจ้งเตือนล้มเหลว:', err);
  }
};

// # เพิ่ม endpoint สำหรับ metrics (optional)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});


// Start consuming RPC requests
const startRPCServer = async () => {
  await connectRabbitMQ();
  channel.consume('note_rpc_queue', handleRPCRequest);
  console.log('Note Service is waiting for RPC requests...');
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
  await startEventConsumer();
  startMetricsPusher(); // <-- เพิ่มบรรทัดนี้เพื่อให้เริ่มส่ง Metrics ไปยัง Pushgateway

  app.listen(PORT, () => {
    console.log(`Note Service running on port ${PORT}`);
  });
};

startServer();
