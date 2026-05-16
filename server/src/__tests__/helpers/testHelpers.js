const mongoose = require('mongoose');
const User = require('../../models/User');
const jwt = require('jsonwebtoken');
const config = require('../../config');

let server;

const connectTestDB = async () => {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(config.mongodb.uri);
};

const disconnectTestDB = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

const clearCollections = async () => {
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key].deleteMany({});
  }
};

const createTestUser = async (overrides = {}) => {
  const userData = {
    name: 'Test User',
    email: 'test@example.com',
    password: 'Password123!',
    department: 'Engineering',
    role: 'user',
    isVerified: true,
    ...overrides,
  };

  return User.create(userData);
};

const generateToken = (user) => {
  return jwt.sign(
    { userId: user._id, role: user.role },
    config.jwt.secret,
    { expiresIn: '1h' }
  );
};

const getAuthHeader = (token) => `Bearer ${token}`;

const validItemPayload = {
  title: 'Black HP Laptop',
  description: 'A black HP laptop with stickers on the cover. Lost in the library near the computer lab.',
  category: 'electronics',
  type: 'lost',
  location: 'Library, 2nd Floor',
  tags: 'laptop, hp, black',
  dateOccurred: '2025-01-15',
};

module.exports = {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  createTestUser,
  generateToken,
  getAuthHeader,
  validItemPayload,
};
