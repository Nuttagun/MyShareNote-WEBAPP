const express = require('express');
const cors = require('cors');
const { Client } = require('pg');
const amqp = require('amqplib');

// Comments in English for better maintainability
const app = express();

app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:8080'],
  credentials: true,
}));

app.use(express.json());

const PORT = 5001;

// PostgreSQL connection
const client = new Client({
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
    await client.connect();
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
    const result = await client.query(
      'SELECT COUNT(*) as likes FROM likes WHERE note_id = $1',
      [noteId]
    );
    res.json({ likes: parseInt(result.rows[0].likes) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Like a note
app.post('/api/social/like', async (req, res) => {
  try {
    const { noteId, userId, noteTitle, noteOwnerId } = req.body;
    await client.query(
      'INSERT INTO likes (note_id, user_id) VALUES ($1, $2)',
      [noteId, userId]
    );

    // Send notification event
    channel.sendToQueue('notification_event_queue', 
      Buffer.from(JSON.stringify({
        type: 'note_liked',
        noteId,
        fromUser: userId,
        user_id: noteOwnerId,
        noteTitle
      }))
    );

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
    await client.query(
      'DELETE FROM likes WHERE note_id = $1 AND user_id = $2',
      [noteId, userId]
    );
    res.json({ message: 'Like removed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all likes by user
app.get('/api/social/user-likes/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await client.query(
      'SELECT note_id, created_at FROM likes WHERE user_id = $1',
      [userId]
    );
    res.json({ likes: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
const startServer = async () => {
  await connectDB();
  await connectRabbitMQ();

  app.listen(PORT, () => {
    console.log(`Social Service running on port ${PORT}`);
  });
};

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  if (client) await client.end();
  if (channel) await channel.close();
  process.exit(0);
});

startServer();
