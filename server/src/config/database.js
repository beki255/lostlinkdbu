const mongoose = require('mongoose');
const config = require('./index');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodb.uri);
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`MongoDB connection error: ${error.message}`);
    // In production we should exit so the failure is obvious.
    if (config.env === 'production') {
      process.exit(1);
    }
    // In development allow the server to continue running so frontend work can proceed.
    console.warn('Continuing without MongoDB connection (development mode).');
    return;
  }

  mongoose.connection.on('error', (err) => {
    console.error(`MongoDB runtime error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
  });
};

module.exports = connectDB;
