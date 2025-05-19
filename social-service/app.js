const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const amqp = require('amqplib');
// # เพิ่ม dependencies สำหรับ Prometheus metrics
const client = require('prom-client');
const axios = require('axios');

// Comments in English for better maintainability
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
}));

app.use(express.json());

const PORT = 5001;

// # สร้าง Registry สำหรับเก็บ metrics ทั้งหมด
const register = new client.Registry();

// # เพิ่ม default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// # สร้าง metrics สำหรับ HTTP requests
const httpRequestCounter = new client.Counter({
  name: 'social_http_requests_total', // # ชื่อ metric
  help: 'Total number of HTTP requests to social service', // # คำอธิบาย metric
  labelNames: ['method', 'route', 'status'], // # labels สำหรับแยกประเภท
  registers: [register] // # เพิ่มเข้า registry
});

// # สร้าง metrics สำหรับเวลาที่ใช้ในการตอบสนอง
const httpRequestDuration = new client.Histogram({
  name: 'social_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for social service',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // # ช่วงเวลาที่ต้องการวัด
  registers: [register]
});

// # สร้าง metrics สำหรับการกดไลค์
const likeCounter = new client.Counter({
  name: 'social_likes_total',
  help: 'Total number of likes',
  labelNames: ['note_id', 'user_id'], // # เก็บข้อมูลว่าใครกดไลค์โน้ตไหน
  registers: [register]
});

// # สร้าง metrics สำหรับการยกเลิกไลค์
const unlikeCounter = new client.Counter({
  name: 'social_unlikes_total',
  help: 'Total number of unlikes',
  labelNames: ['note_id', 'user_id'],
  registers: [register]
});

// # สร้าง gauge สำหรับเก็บจำนวนไลค์ปัจจุบันของแต่ละโน้ต
const noteLikesGauge = new client.Gauge({
  name: 'social_note_likes_count',
  help: 'Current number of likes for each note',
  labelNames: ['note_id'],
  registers: [register]
});

// # ฟังก์ชันสำหรับส่ง metrics ไปยัง Pushgateway
async function pushMetrics() {
  try {
    // # ดึง metrics ทั้งหมดจาก registry
    const metrics = await register.metrics();
    
    // # ส่ง metrics ไปยัง Pushgateway
    await axios.post('http://pushgateway:9091/metrics/job/social_service', metrics, {
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

// RabbitMQ connection
let channel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect('amqp://guest:guest@rabbitmq');
    channel = await connection.createChannel();
    await channel.assertQueue('social_event_queue');
    console.log('Connected to RabbitMQ');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
    process.exit(1);
  }
};

const connectDB = async () => {
  try {
    await pgClient.connect();
    console.log('Connected to PostgreSQL');
  } catch (err) {
    console.error('Failed to connect to PostgreSQL', err);
    process.exit(1);
  }
};

// API Routes
// Get likes count for a note
app.get('/api/social/likes/:noteId', async (req, res) => {
  try {
    const { noteId } = req.params;
    const result = await pgClient.query(
      'SELECT COUNT(*) as likes FROM likes WHERE note_id = $1',
      [noteId]
    );
    const likesCount = parseInt(result.rows[0].likes);
    
    // # อัปเดต gauge สำหรับจำนวนไลค์ของโน้ต
    noteLikesGauge.set({ note_id: noteId }, likesCount);
    
    res.json({ likes: likesCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like a note
app.post('/api/social/like', async (req, res) => {
  try {
    const { noteId, userId, noteTitle, noteOwnerId } = req.body;
    await pgClient.query(
      'INSERT INTO likes (note_id, user_id) VALUES ($1, $2)',
      [noteId, userId]
    );

    // # เพิ่ม metric สำหรับการกดไลค์
    likeCounter.inc({ note_id: noteId, user_id: userId });

    // Send notification event
    channel.sendToQueue('social_event_queue', 
      Buffer.from(JSON.stringify({
        type: 'note_liked',
        noteId,
        fromUser: userId,
        user_id: noteOwnerId,
        noteTitle
      }))
    );

    // # อัปเดตจำนวนไลค์ปัจจุบันของโน้ต
    const result = await pgClient.query(
      'SELECT COUNT(*) as likes FROM likes WHERE note_id = $1',
      [noteId]
    );
    const likesCount = parseInt(result.rows[0].likes);
    noteLikesGauge.set({ note_id: noteId }, likesCount);

    res.json({ message: 'Note liked successfully' });
  } catch (err) {
    if (err.code === '23505') { // Unique violation
      res.status(400).json({ error: 'Already liked this note' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

// Unlike a note
app.delete('/api/social/unlike/:noteId/:userId', async (req, res) => {
  try {
    const { noteId, userId } = req.params;
    await pgClient.query(
      'DELETE FROM likes WHERE note_id = $1 AND user_id = $2',
      [noteId, userId]
    );
    
    // # เพิ่ม metric สำหรับการยกเลิกไลค์
    unlikeCounter.inc({ note_id: noteId, user_id: userId });
    
    // # อัปเดตจำนวนไลค์ปัจจุบันของโน้ต
    const result = await pgClient.query(
      'SELECT COUNT(*) as likes FROM likes WHERE note_id = $1',
      [noteId]
    );
    const likesCount = parseInt(result.rows[0].likes);
    noteLikesGauge.set({ note_id: noteId }, likesCount);
    
    res.json({ message: 'Like removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all likes by user
app.get('/api/social/user-likes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await pgClient.query(
      'SELECT note_id, created_at FROM likes WHERE user_id = $1',
      [userId]
    );
    res.json({ likes: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// # เพิ่ม endpoint สำหรับ metrics (optional)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});

// Start server
const startServer = async () => {
  await connectDB();
  await connectRabbitMQ();
  
  // # เริ่มต้นส่ง metrics ไปยัง Pushgateway
  startMetricsPusher();

  app.listen(PORT, () => {
    console.log(`Social Service running on port ${PORT}`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (pgClient) await pgClient.end();
  if (channel) await channel.close();
  process.exit(0);
});

startServer();
