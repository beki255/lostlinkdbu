const mongoose = require('mongoose');

const deviceSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Device name is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: ['laptop', 'mobile', 'tablet', 'other'],
    required: [true, 'Device type is required'],
  },
  serialNumber: {
    type: String,
    required: [true, 'Serial number is required'],
    trim: true,
  },
  idNumber: {
    type: String,
    trim: true,
  },
  ownerName: {
    type: String,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  status: {
    type: String,
    enum: ['active', 'lost', 'archived'],
    default: 'active',
  },
  registeredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
  deletedAt: {
    type: Date,
    default: null,
  },
  deletedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
}, {
  timestamps: true,
});

deviceSchema.index({ registeredBy: 1 });
module.exports = mongoose.model('Device', deviceSchema);
