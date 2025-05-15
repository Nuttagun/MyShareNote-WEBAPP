const express = require('express');
const cors = require('cors');  
const { Client } = require('pg');
const amqp = require('amqplib');

const app = express();

app.use(cors({
  origin: 'http://localhost:5173',
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

// CRUD Routes

app.post('/api/notes', async (req, res) => {
  const { noteId, title, description, status, userId } = req.body;
  if (!noteId || !title || !description || !status || !userId) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await client.query(
      'INSERT INTO notes (note_id, title, description, status, user_id) VALUES ($1, $2, $3, $4, $5)',
      [noteId, title, description, status, userId]
    );
    res.status(201).json({ message: 'Note created successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM notes');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  try {
    const result = await client.query('SELECT * FROM notes WHERE note_id = $1', [noteId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  const { title, description, status } = req.body;
  if (!title || !description || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await client.query(
      'UPDATE notes SET title = $1, description = $2, status = $3 WHERE note_id = $4',
      [title, description, status, noteId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:noteId', async (req, res) => {
  const { noteId } = req.params;
  try {
    const result = await client.query('DELETE FROM notes WHERE note_id = $1', [noteId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note deleted successfully' });
  } catch (err) {
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
