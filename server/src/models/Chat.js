const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  content: {
    type: String,
    required: [true, 'Message content is required'],
    trim: true,
    maxlength: [5000, 'Message cannot exceed 5000 characters'],
  },
  messageType: {
    type: String,
    enum: ['text', 'image', 'system'],
    default: 'text',
  },
  readAt: {
    type: Date,
    default: null,
  },
  deliveredAt: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  }],
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
  },
  claim: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Claim',
  },
  messages: [messageSchema],
  isActive: {
    type: Boolean,
    default: true,
  },
  expiresAt: {
    type: Date,
    default: () => new Date(+new Date() + 72 * 60 * 60 * 1000), // 72 hours from now
  },
  lastActivity: {
    type: Date,
    default: Date.now,
  },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
});

chatSchema.index({ participants: 1 });
chatSchema.index({ item: 1 });
chatSchema.index({ isActive: 1 });
chatSchema.index({ 'messages.sender': 1 });

module.exports = mongoose.model('Chat', chatSchema);
