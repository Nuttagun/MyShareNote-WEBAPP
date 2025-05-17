const express = require('express');
const cors = require('cors');  
const { Client } = require('pg');
const amqp = require('amqplib');

const app = express();

app.use(cors({
  origin: ['http://localhost:5173','http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
}));

app.use(express.json());

const PORT = 5002;

// PostgreSQL connection
const client = new Client({
  user: 'postgres',
  host: 'note-db',
  database: 'note_db',
  password: 'password',
  port: 5432,
});

const connectDB = async () => {
  try {
    await client.connect();
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
  let { title, description, status, userId } = req.body;
  userId = Number(userId); // แปลงเป็น number

  if (!title || !description || !status || !userId || isNaN(userId)) {
    return res.status(400).json({ error: 'Missing required fields or invalid userId' });
  }

  try {
    const result = await client.query(
      'INSERT INTO notes (title, description, status, user_id) VALUES ($1, $2, $3, $4) RETURNING note_id',
      [title, description, status, userId]
    );

    res.status(201).json({ message: 'Note created successfully', noteId: result.rows[0].note_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// READ all notes พร้อม username
app.get('/api/notes', async (req, res) => {
  try {
    const result = await client.query(`
      SELECT n.*, u.username 
      FROM notes n
      JOIN users u ON n.user_id = u.user_id
      ORDER BY n.note_id
    `);
    res.json(result.rows);
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
    const result = await client.query('SELECT * FROM notes WHERE note_id = $1', [noteId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
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

  const { title, description, status } = req.body;

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

  if (fields.length === 0) {
    return res.status(400).json({ error: 'No fields provided to update' });
  }

  values.push(noteId);
  const query = `UPDATE notes SET ${fields.join(', ')} WHERE note_id = $${index}`;

  try {
    const result = await client.query(query, values);
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
    const result = await client.query('DELETE FROM notes WHERE note_id = $1', [noteId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// RPC handler
const handleRPCRequest = async (msg) => {
  try {
    const noteId = msg.content.toString();
    const result = await client.query('SELECT * FROM notes WHERE note_id = $1', [noteId]);
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

const startRPCServer = async () => {
  await connectRabbitMQ();
  channel.consume('note_rpc_queue', handleRPCRequest);
  console.log('Note Service is waiting for RPC requests...');
};

// Graceful Shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (client) await client.end();
  if (channel) await channel.close();
  process.exit(0);
});

// Start Services
const startServer = async () => {
  await connectDB();
  await startRPCServer();
  app.listen(PORT, () => {
    console.log(`Note Service running on port ${PORT}`);
  });
};

startServer();
