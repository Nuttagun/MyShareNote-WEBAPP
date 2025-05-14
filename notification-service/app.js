const express = require('express');
const { Client } = require('pg');
const amqp = require('amqplib');

const app = express();
app.use(express.json());

const PORT = 5004;

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

// CRUD Operations
app.get('/api/notifications', async (req, res) => {
  try {
    const result = await client.query('SELECT * FROM notes');
    res.json({ message: 'notification service', data: result.rows });
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
