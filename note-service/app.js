const express = require('express');
const cors = require('cors');  
const { Client } = require('pg');
const amqp = require('amqplib');
// # เพิ่ม dependencies สำหรับ Prometheus metrics
const client = require('prom-client');
const axios = require('axios');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
}));

app.use(express.json());

const PORT = 5002;

// # สร้าง Registry สำหรับเก็บ metrics ทั้งหมด
const register = new client.Registry();

// # เพิ่ม default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register });

// # สร้าง metrics สำหรับ HTTP requests
const httpRequestCounter = new client.Counter({
  name: 'note_http_requests_total', // # ชื่อ metric
  help: 'Total number of HTTP requests to note service', // # คำอธิบาย metric
  labelNames: ['method', 'route', 'status'], // # labels สำหรับแยกประเภท
  registers: [register] // # เพิ่มเข้า registry
});

// # สร้าง metrics สำหรับเวลาที่ใช้ในการตอบสนอง
const httpRequestDuration = new client.Histogram({
  name: 'note_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds for note service',
  labelNames: ['method', 'route', 'status'],
  buckets: [0.1, 0.3, 0.5, 0.7, 1, 3, 5, 7, 10], // # ช่วงเวลาที่ต้องการวัด
  registers: [register]
});

// นับจำนวนโน้ตที่ถูกสร้าง
const noteCreatedCounter = new client.Counter({
  name: 'note_created_total',
  help: 'Total number of notes created',
  registers: [register],
});

// นับจำนวนโน้ตที่ถูกลบ
const noteDeletedCounter = new client.Counter({
  name: 'note_deleted_total',
  help: 'Total number of notes deleted',
  registers: [register],
});

// นับจำนวนครั้งที่มีการเรียกดูทั้งหมด
const noteReadCounter = new client.Counter({
  name: 'note_read_total',
  help: 'Total number of notes retrieved',
  registers: [register],
});


// # ฟังก์ชันสำหรับส่ง metrics ไปยัง Pushgateway
async function pushMetrics() {
  try {
    // # ดึง metrics ทั้งหมดจาก registry
    const metrics = await register.metrics();
    
    // # ส่ง metrics ไปยัง Pushgateway
    await axios.post('http://pushgateway:9091/metrics/job/note_service', metrics, {
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

// RabbitMQ connection
let channel;
const connectRabbitMQ = async () => {
  try {
    const connection = await amqp.connect('amqp://guest:guest@rabbitmq');
    channel = await connection.createChannel();
    await channel.assertQueue('note_rpc_queue');
    console.log('Connected to RabbitMQ');
  } catch (err) {
    console.error('Failed to connect to RabbitMQ', err);
    process.exit(1);
  }
};
// CREATE Note
app.post('/api/notes', async (req, res) => {
  let { title, description, status, picture, userId } = req.body;
  userId = Number(userId); // แปลง userId เป็นตัวเลข

  if (!title || !description || !status || !userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Missing required fields or invalid userId' });
  }

  try {
    const result = await pgClient.query(
      `INSERT INTO notes (title, description, status, picture, user_id)
       VALUES ($1, $2, $3, $4, $5) RETURNING note_id`,
      [title, description, status, picture || null, userId]
    );

    res.status(201).json({
      message: 'Note created successfully',
      noteId: result.rows[0].note_id
    });
    noteCreatedCounter.inc(); // เพิ่ม metric หลังสร้างสำเร็จ
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// READ all notes พร้อม username
app.get('/api/notes', async (req, res) => {
  try {
    const result = await pgClient.query(`
      SELECT n.*, u.username 
      FROM notes n
      JOIN users u ON n.user_id = u.user_id
      ORDER BY n.note_id
    `);
    res.json(result.rows);
    noteReadCounter.inc(); // บันทึก metric

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// READ note by id
app.get('/api/notes/:noteId', async (req, res) => {
  const noteId = Number(req.params.noteId);
  if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid noteId' });

  try {
    const result = await pgClient.query('SELECT * FROM notes WHERE note_id = $1', [noteId]);

    if (result.rows.length > 0) {
      res.json(result.rows[0]);
      noteReadCounter.inc(); // บันทึก metric
      
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// UPDATE note (partial update)
app.patch('/api/notes/:noteId', async (req, res) => {
  const noteId = Number(req.params.noteId);
  if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid noteId' });

  const { title, description, status, picture } = req.body;

  const fields = [];
  const values = [];
  let index = 1;

  if (title !== undefined) {
    fields.push(`title = $${index++}`);
    values.push(title);
  }
  if (description !== undefined) {
    fields.push(`description = $${index++}`);
    values.push(description);
  }
  if (status !== undefined) {
    fields.push(`status = $${index++}`);
    values.push(status);
  }
  if (picture !== undefined) {
    fields.push(`picture = $${index++}`);
    values.push(picture);
  }

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  values.push(noteId);
  const query = `UPDATE notes SET ${fields.join(', ')} WHERE note_id = $${index}`;

  try {
    const result = await pgClient.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note updated successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE note
app.delete('/api/notes/:noteId', async (req, res) => {
  const noteId = Number(req.params.noteId);
  if (isNaN(noteId)) return res.status(400).json({ error: 'Invalid noteId' });

  try {
    // ลบ likes ที่เกี่ยวข้องก่อน
    await pgClient.query('DELETE FROM likes WHERE note_id = $1', [noteId]);

    // ลบ note
    const result = await pgClient.query('DELETE FROM notes WHERE note_id = $1', [noteId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    noteDeletedCounter.inc(); // <<< แค่ตรงนี้พอ
    res.json({ message: 'Note and related likes deleted successfully' });
    noteDeletedCounter.inc(); // <<< เพิ่มตรงนี้หลังลบสำเร็จ
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});



// RPC handler
const handleRPCRequest = async (msg) => {
  try {
    const noteId = msg.content.toString();
    const result = await pgClient.query('SELECT * FROM notes WHERE note_id = $1', [noteId]);
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

// # เพิ่ม endpoint สำหรับ metrics (optional)
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
});


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
  startMetricsPusher(); // <-- เพิ่มบรรทัดนี้เพื่อให้เริ่มส่ง Metrics ไปยัง Pushgateway
  app.listen(PORT, () => {
    console.log(`Note Service running on port ${PORT}`);
  });
};



startServer();
