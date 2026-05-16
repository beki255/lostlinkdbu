const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const config = require('./config');
const connectDB = require('./config/database');
const errorHandler = require('./middleware/errorHandler');
const { globalLimiter } = require('./middleware/rateLimiter');
const { setupChatSocket } = require('./sockets/chatHandler');
const { getTransporter } = require('./services/emailService');

const authRoutes = require('./routes/authRoutes');
const itemRoutes = require('./routes/itemRoutes');
const claimRoutes = require('./routes/claimRoutes');
const matchRoutes = require('./routes/matchRoutes');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: ['http://localhost:5173', 'http://localhost:3000'],
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingInterval: 10000,
  pingTimeout: 5000,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));

// Rate limiting
app.use('/api/', globalLimiter);

// Logging
if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, '..', config.upload.dir)));

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    message: 'LostLink API is running',
    environment: config.env,
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/items', itemRoutes);
app.use('/api/claims', claimRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/admin', adminRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handler
app.use(errorHandler);

// Socket setup
setupChatSocket(io);

// Start server
const startServer = async () => {
  await connectDB();

  // Eagerly initialize email transport
  try {
    await getTransporter();
  } catch (err) {
    console.error('[Email] Startup initialization failed:', err.message);
  }

  server.listen(config.port, () => {
    console.log(`LostLink API running on port ${config.port} in ${config.env} mode`);
    console.log(`WebSocket server ready for chat connections`);
  });
};

if (config.env !== 'test') {
  startServer();
}

// Export for testing
module.exports = { app, server, io };
