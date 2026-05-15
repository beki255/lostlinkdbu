const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: {
      values: [
        'claim_submitted',
        'claim_approved',
        'claim_rejected',
        'item_matched',
        'new_message',
        'item_status_update',
        'system',
      ],
      message: 'Invalid notification type',
    },
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
  },
  message: {
    type: String,
    required: [true, 'Message is required'],
    trim: true,
  },
  data: {
    itemId: { type: mongoose.Schema.Types.ObjectId, ref: 'Item' },
    claimId: { type: mongoose.Schema.Types.ObjectId, ref: 'Claim' },
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    url: String,
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
  },
}, {
  timestamps: true,
});

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
