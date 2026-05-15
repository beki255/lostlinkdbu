const mongoose = require('mongoose');

const claimSchema = new mongoose.Schema({
  item: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Item',
    required: [true, 'Item reference is required'],
  },
  claimant: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Claimant is required'],
  },
  status: {
    type: String,
    enum: {
      values: ['pending', 'under_review', 'approved', 'rejected', 'completed', 'cancelled'],
      message: 'Invalid claim status',
    },
    default: 'pending',
  },
  description: {
    type: String,
    required: [true, 'Claim description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  proofDetails: {
    answers: [{
      question: String,
      answer: String,
    }],
    additionalInfo: String,
  },
  documents: [{
    url: String,
    type: { type: String, enum: ['image', 'pdf', 'other'] },
  }],
  reviewedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  reviewNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Review notes cannot exceed 1000 characters'],
  },
  reviewedAt: {
    type: Date,
  },
  aiSuggestion: {
    decision: {
      type: String,
      enum: ['approve', 'reject', 'manual_review'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    explanation: String,
  },
  handoverDate: {
    type: Date,
  },
  handoverNotes: {
    type: String,
    trim: true,
  },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
});

claimSchema.index({ item: 1, claimant: 1 });
claimSchema.index({ status: 1 });
claimSchema.index({ claimant: 1 });
claimSchema.index({ isDeleted: 1 });

module.exports = mongoose.model('Claim', claimSchema);
