const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true,
    minlength: [3, 'Title must be at least 3 characters'],
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Description is required'],
    trim: true,
    minlength: [10, 'Description must be at least 10 characters'],
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
  },
  type: {
    type: String,
    enum: {
      values: ['lost', 'found'],
      message: 'Type must be lost or found',
    },
    required: [true, 'Item type is required'],
  },
  status: {
    type: String,
    enum: {
      values: ['open', 'claimed', 'under_review', 'resolved', 'closed'],
      message: 'Invalid item status',
    },
    default: 'open',
  },
  visibility: {
    type: String,
    enum: {
      values: ['public', 'private'],
      message: 'Visibility must be public or private',
    },
    default: function () {
      return this.type === 'found' ? 'private' : 'public';
    },
  },
  location: {
    type: String,
    required: [true, 'Location is required'],
    trim: true,
  },
  locationDetails: {
    building: String,
    room: String,
    coordinates: {
      lat: Number,
      lng: Number,
    },
  },
  images: [{
    url: { type: String, required: true },
    thumbnail: String,
    isPrimary: { type: Boolean, default: false },
  }],
  tags: [{
    type: String,
    trim: true,
  }],
  reportedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  dateOccurred: {
    type: Date,
    default: Date.now,
  },
  isHighValue: {
    type: Boolean,
    default: false,
  },
  aiEmbedding: {
    type: [Number],
    select: false,
  },

  // Security audit
  lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },

  // Soft delete
  isDeleted: { type: Boolean, default: false },
  deletedAt: { type: Date, default: null },
  deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

itemSchema.index({ type: 1, status: 1 });
itemSchema.index({ category: 1 });
itemSchema.index({ reportedBy: 1 });
itemSchema.index({ isDeleted: 1 });
itemSchema.index({ title: 'text', description: 'text', tags: 'text' });
itemSchema.index({ 'locationDetails.building': 1 });

module.exports = mongoose.model('Item', itemSchema);
