const mongoose = require('mongoose');

const matchDetailSchema = new mongoose.Schema({
  titleScore: { type: Number, default: 0 },
  descriptionScore: { type: Number, default: 0 },
  categoryScore: { type: Number, default: 0 },
  locationScore: { type: Number, default: 0 },
  tagScore: { type: Number, default: 0 },
  timeScore: { type: Number, default: 0 },
}, { _id: false });

const matchSchema = new mongoose.Schema({
  lostItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  foundItem: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: true,
  },
  score: {
    type: Number,
    required: true,
    min: 0,
    max: 100,
  },
  details: matchDetailSchema,
  aiExplanation: {
    type: String,
    default: '',
  },
  isStrongMatch: {
    type: Boolean,
    default: false,
  },
  isNotified: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['pending', 'contacted', 'resolved', 'dismissed'],
    default: 'pending',
  },
  method: {
    type: String,
    enum: ['ai', 'manual'],
    default: 'ai',
  },
  notifiedAt: Date,
  resolvedAt: Date,
}, {
  timestamps: true,
});

matchSchema.index({ lostItem: 1, score: -1 });
matchSchema.index({ foundItem: 1 });
matchSchema.index({ isStrongMatch: 1, status: 1 });

matchSchema.pre('save', function (next) {
  if (this.score >= 85) {
    this.isStrongMatch = true;
  }
  next();
});

module.exports = mongoose.model('Match', matchSchema);
