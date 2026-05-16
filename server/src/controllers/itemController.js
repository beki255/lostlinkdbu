const Item = require('../models/Item');
const Match = require('../models/Match');
const AuditLog = require('../models/AuditLog');
const matchingService = require('../services/matchingService');
const { paginate, buildPaginationResponse, sanitizeHtml } = require('../utils/helpers');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/response');
const { AppError, NotFoundError, ForbiddenError } = require('../utils/errors');

const sanitizeFields = (obj) => {
  const textFields = ['title', 'description', 'category', 'location', 'building', 'room'];
  const sanitized = { ...obj };
  for (const key of Object.keys(sanitized)) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeHtml(sanitized[key].trim());
    }
  }
  if (sanitized.tags && Array.isArray(sanitized.tags)) {
    sanitized.tags = sanitized.tags.map(t => sanitizeHtml(t.trim())).filter(Boolean);
  }
  return sanitized;
};

exports.createItem = async (req, res, next) => {
  try {
    const itemData = { ...req.body, reportedBy: req.user._id };

    if (typeof itemData.tags === 'string') {
      itemData.tags = itemData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    // Found items require at least one image
    if (itemData.type === 'found' && (!req.files || req.files.length === 0)) {
      throw new AppError('An image is required when reporting a found item.', 400);
    }

    if (req.files && req.files.length > 0) {
      itemData.images = req.files.map((file, idx) => ({
        url: file.path,
        isPrimary: idx === 0,
      }));
    }

    const sanitized = sanitizeFields(itemData);
    const item = await Item.create(sanitized);

    let matches = [];
    let matchMethod = 'none';

    if (item.type === 'lost') {
      const language = req.headers['accept-language'] || req.body.language || 'en';
      const result = await matchingService.runMatchingForLostItem(item._id, language);
      matches = result.matches;
      matchMethod = result.method;
    } else if (item.type === 'found') {
      setImmediate(() => {
        matchingService.runMatching(item._id).catch((err) => {
          console.error('[Matching] Background match failed:', err.message);
        });
      });
    }

    await AuditLog.create({
      action: 'ITEM_REPORTED',
      resource: 'Item',
      resourceId: item._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      changes: { new: { title: item.title, type: item.type } },
      ipAddress: req.ip,
    });

    sendCreated(res, { item, matches, matchMethod }, `${item.type === 'lost' ? 'Lost' : 'Found'} item reported.`);
  } catch (error) {
    next(error);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false };

    // Privacy: users can only see their own reported items
    if (req.user) {
      filter.reportedBy = req.user._id;
    } else {
      return sendPaginated(res, { items: [] }, buildPaginationResponse(0, page, limit));
    }

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }

    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate('reportedBy', 'name email department')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Item.countDocuments(filter),
    ]);

    // Include AI matches for each lost item
    const itemsWithMatches = await Promise.all(items.map(async (item) => {
      if (item.type === 'lost') {
        const matches = await Match.find({
          lostItem: item._id,
          score: { $gte: 70 },
        })
          .populate('foundItem', 'title description category location images dateOccurred')
          .select('score details aiExplanation foundItem')
          .sort({ score: -1 })
          .limit(5)
          .lean();
        return { ...item.toObject(), matches };
      }
      return item.toObject();
    }));

    sendPaginated(res, { items: itemsWithMatches }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getItem = async (req, res, next) => {
  try {
    const item = await Item.findOne({
      _id: req.params.id,
      isDeleted: false,
    }).populate('reportedBy', 'name email department');

    if (!item) throw new NotFoundError('Item');

    // Public lost items are visible to all users; private found items are restricted
    if (req.user && req.user.role === 'user' && item.visibility === 'private' && !item.reportedBy._id.equals(req.user._id)) {
      throw new ForbiddenError('You do not have access to this item.');
    }

    sendSuccess(res, { item });
  } catch (error) {
    next(error);
  }
};

exports.searchItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false, type: 'lost' };

    // Exclude the current user's own items from search results
    if (req.user) {
      filter.reportedBy = { $ne: req.user._id };
    }

    if (req.query.q) {
      filter.$text = { $search: req.query.q };
    }
    if (req.query.category) {
      filter.category = req.query.category;
    }

    const [items, total] = await Promise.all([
      Item.find(filter)
        .populate('reportedBy', 'name department')
        .select('title description category location dateOccurred createdAt images reportedBy')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Item.countDocuments(filter),
    ]);

    sendPaginated(res, { items }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.updateItem = async (req, res, next) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new NotFoundError('Item');

    if (req.user.role === 'user' && !item.reportedBy.equals(req.user._id)) {
      throw new ForbiddenError('You can only edit your own items.');
    }

    const oldData = item.toObject();

    const updateData = { ...req.body };
    if (typeof updateData.tags === 'string') {
      updateData.tags = updateData.tags.split(',').map(t => t.trim()).filter(Boolean);
    }

    if (req.files && req.files.length > 0) {
      updateData.images = req.files.map((file, idx) => ({
        url: file.path,
        isPrimary: idx === 0,
      }));
    }

    const sanitized = sanitizeFields(updateData);
    Object.assign(item, sanitized);
    item.lastModifiedBy = req.user._id;
    await item.save();

    await AuditLog.create({
      action: 'ITEM_UPDATED',
      resource: 'Item',
      resourceId: item._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      changes: { old: oldData, new: req.body },
      ipAddress: req.ip,
    });

    sendSuccess(res, { item }, 'Item updated.');
  } catch (error) {
    next(error);
  }
};

exports.deleteItem = async (req, res, next) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new NotFoundError('Item');

    if (req.user.role === 'user' && !item.reportedBy.equals(req.user._id)) {
      throw new ForbiddenError('You can only delete your own items.');
    }

    item.isDeleted = true;
    item.deletedAt = new Date();
    item.deletedBy = req.user._id;
    await item.save();

    await AuditLog.create({
      action: 'ITEM_DELETED',
      resource: 'Item',
      resourceId: item._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
    });

    sendSuccess(res, null, 'Item deleted.');
  } catch (error) {
    next(error);
  }
};

exports.runAiMatching = async (req, res, next) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new NotFoundError('Item');
    if (item.type !== 'lost') {
      throw new AppError('AI matching is only available for lost items.', 400);
    }
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only run AI matching on your own items.');
    }

    const language = req.headers['accept-language'] || 'en';
    const result = await matchingService.runMatchingForLostItem(item._id, language);

    await AuditLog.create({
      action: 'AI_MATCHING_RUN',
      resource: 'Item',
      resourceId: item._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      changes: { matchMethod: result.method, matchCount: result.matches.length },
      ipAddress: req.ip,
    });

    sendSuccess(res, {
      matches: result.matches,
      matchMethod: result.method,
    });
  } catch (error) {
    next(error);
  }
};
