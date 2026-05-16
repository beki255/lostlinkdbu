const mongoose = require('mongoose');
const User = require('./src/models/User');
const config = require('./src/config');

async function check() {
  await mongoose.connect(config.mongodb.uri);
  const users = await User.find({ isDeleted: false });
  console.log('Users found:', users.map(u => ({ email: u.email, isVerified: u.isVerified, status: u.status, role: u.role })));
  process.exit(0);
}

check();
