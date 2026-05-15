const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');
const { paginate, buildPaginationResponse } = require('../utils/helpers');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/response');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

exports.createItem = async (req, res, next) => {
  try {
    const itemData = { ...req.body, reportedBy: req.user._id };

    if (req.files && req.files.length > 0) {
      itemData.images = req.files.map((file, idx) => ({
        url: `/uploads/${file.filename}`,
        isPrimary: idx === 0,
      }));
    }

    const item = await Item.create(itemData);

    await AuditLog.create({
      action: 'ITEM_REPORTED',
      resource: 'Item',
      resourceId: item._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      changes: { new: { title: item.title, type: item.type } },
      ipAddress: req.ip,
    });

    sendCreated(res, { item }, `${item.type === 'lost' ? 'Lost' : 'Found'} item reported.`);
  } catch (error) {
    next(error);
  }
};

exports.getItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false };

    // Users can only see public items + their own
    if (req.user.role === 'user') {
      filter.$or = [
        { visibility: 'public' },
        { reportedBy: req.user._id },
      ];
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

    sendPaginated(res, { items }, buildPaginationResponse(total, page, limit));
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

    // Security check: users can only view public items or their own
    if (req.user.role === 'user' && item.visibility === 'private' && !item.reportedBy._id.equals(req.user._id)) {
      throw new ForbiddenError('You do not have access to this item.');
    }

    sendSuccess(res, { item });
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
    Object.assign(item, req.body);
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
