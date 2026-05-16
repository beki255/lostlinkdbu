const Item = require('../models/Item');
const Match = require('../models/Match');
const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const matchingService = require('../services/matchingService');
const aiService = require('../services/aiService');
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
    // Require completed profile for regular users before reporting items
    if (req.user && req.user.role === 'user') {
      const requiredFields = ['name', 'phone', 'department', 'studentId'];
      const missing = requiredFields.filter((f) => !req.user[f]);
      if (missing.length > 0) {
        return next(new ForbiddenError(`Please complete your profile before reporting items. Missing: ${missing.join(', ')}`));
      }
    }

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
      const result = await matchingService.runMatchingForLostItem(item._id);
      matches = result.matches;
      matchMethod = result.method;
    } else if (item.type === 'found') {
      const result = await matchingService.runMatching(item._id);
      matches = result.matches;
      matchMethod = result.method;
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

    const isAdmin = req.user && req.user.role === 'admin';

    if (!req.user) {
      return sendPaginated(res, { items: [] }, buildPaginationResponse(0, page, limit));
    }

    // Non-admin users can NEVER see resolved items (hidden after recovery)
    if (!isAdmin) {
      filter.status = { $ne: 'resolved' };
      // Non-admin users only see their own items always
      filter.reportedBy = req.user._id;
    }

    // Allow admins to filter by status
    if (isAdmin && req.query.status) filter.status = req.query.status;
    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;
    if (req.query.location) filter.$or = [
      { location: { $regex: req.query.location, $options: 'i' } }
    ];
    if (req.query.search || req.query.q) {
      const searchTerm = req.query.search || req.query.q;
      filter.$text = { $search: searchTerm };
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
      const itemObj = item.toObject();
      
      // Censor found items for regular users
      // REMOVED as per user request to use 70% and remove restrictions
      /*
      const isAuthorized = req.user && (req.user.role === 'admin' || item.reportedBy._id.equals(req.user._id));
      
      if (itemObj.type === 'found' && !isAuthorized) {
        itemObj.images = []; // Hide images
        itemObj.description = 'Description hidden for privacy. Match with a lost report to reveal.';
        itemObj.location = 'Controlled Access';
        itemObj.building = 'Censored';
      }
      */

      if (item.type === 'lost' && item.reportedBy._id.equals(req.user._id)) {
        const matches = await Match.find({
          lostItem: item._id,
          score: { $gte: 70 },
        })
          .populate('foundItem', 'title description category location images dateOccurred visibility')
          .select('score details aiExplanation foundItem')
          .sort({ score: -1 })
          .limit(5)
          .lean();

        // Reveal details and contact info for matches >= 65%
        const matchesWithDetails = await Promise.all(matches.map(async (m) => {
          const mObj = { ...m };
          if (mObj.foundItem) {
            // Enforce 65% threshold for images as requested
            if (mObj.score < 65) {
              mObj.foundItem.images = [];
              mObj.foundItem.description = 'Image and detailed description hidden until match confidence exceeds 65%.';
            }
            const finder = await User.findById(mObj.foundItem.reportedBy).select('name email phone department');
            mObj.foundItem.reportedBy = finder;
          }
          return mObj;
        }));

        return { ...itemObj, matches: matchesWithDetails };
      }
      return itemObj;
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
    }).populate('reportedBy', 'name email department phone');

    if (!item) throw new NotFoundError('Item');

    const isAdmin = req.user && req.user.role === 'admin';

    // Non-admin users cannot see resolved items at all — they are hidden
    if (!isAdmin && item.status === 'resolved') {
      throw new NotFoundError('Item');
    }

    // Regular users can only view their own items
    const isOwner = req.user && item.reportedBy._id.equals(req.user._id);
    if (!isAdmin && !isOwner) {
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
    // Search limited to the requesting user's own lost items only
    const filter = { isDeleted: false, type: 'lost', reportedBy: req.user ? req.user._id : null };

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

    if (item.status === 'resolved' && req.user.role !== 'admin') {
      throw new ForbiddenError('This item is resolved and cannot be edited.');
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

    if (item.status === 'resolved' && req.user.role !== 'admin') {
      throw new ForbiddenError('This item is resolved and cannot be deleted.');
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
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only run AI matching on your own items.');
    }

    let result;

    if (item.type === 'lost') {
      result = await matchingService.runMatchingForLostItem(item._id);
    } else if (item.type === 'found') {
      result = await matchingService.runMatching(item._id);
    } else {
      throw new AppError('Invalid item type.', 400);
    }

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

exports.getNoMatchExplanation = async (req, res, next) => {
  try {
    const item = await Item.findOne({ _id: req.params.id, isDeleted: false });
    if (!item) throw new NotFoundError('Item');
    if (item.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only view explanations for your own items.');
    }

    const lang = req.headers['accept-language'] || 'en';

    const aiResult = await aiService.generateNoMatchExplanation(item, lang);
    if (aiResult && aiResult.explanation) {
      return sendSuccess(res, { explanation: aiResult.explanation, source: 'ai' });
    }

    const explanation = aiService.generateLocalNoMatchExplanation(item, lang);
    sendSuccess(res, { explanation, source: 'local' });
  } catch (error) {
    next(error);
  }
};
