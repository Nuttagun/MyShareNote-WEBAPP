const express = require('express');
const { Client } = require('pg');
const amqp = require('amqplib');

const app = express();
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

// RabbitMQ connection for RPC
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
// HELLO API
app.get('/hello', (req, res) => {
  res.status(200).json({ message: 'Hello, world!' });
});

// CRUD Operations
app.post('/api/notes', async (req, res) => {
  const { nodeId, name, status } = req.body;
  if (!nodeId || !name || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await client.query(
      'INSERT INTO notes (node_id, name, status) VALUES ($1, $2, $3)',
      [nodeId, name, status]
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

app.get('/api/notes/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  try {
    const result = await client.query('SELECT * FROM notes WHERE node_id = $1', [nodeId]);
    if (result.rows.length > 0) {
      res.json(result.rows[0]);
    } else {
      res.status(404).json({ error: 'Note not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/notes/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  const { name, status } = req.body;
  if (!name || !status) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    const result = await client.query(
      'UPDATE notes SET name = $1, status = $2 WHERE node_id = $3',
      [name, status, nodeId]
    );
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Note not found' });
    }
    res.json({ message: 'Note updated successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/notes/:nodeId', async (req, res) => {
  const { nodeId } = req.params;
  try {
    const result = await client.query('DELETE FROM notes WHERE node_id = $1', [nodeId]);
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
    const nodeId = msg.content.toString();
    const result = await client.query('SELECT * FROM notes WHERE node_id = $1', [nodeId]);
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

// Start consuming RPC requests
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
