const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const { paginate, buildPaginationResponse } = require('../utils/helpers');
const { sendSuccess, sendPaginated } = require('../utils/response');
const { NotFoundError } = require('../utils/errors');

exports.getUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false };

    if (req.query.role) filter.role = req.query.role;
    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: 'i' } },
        { email: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    sendPaginated(res, { users }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) throw new NotFoundError('User');

    const oldRole = user.role;
    user.role = role;
    await user.save();

    await AuditLog.create({
      action: 'ROLE_CHANGED',
      resource: 'User',
      resourceId: user._id,
      performedBy: req.user._id,
      performedByRole: 'admin',
      changes: { old: { role: oldRole }, new: { role } },
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: user.toPublicJSON() }, 'User role updated.');
  } catch (error) {
    next(error);
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString()) {
      return sendSuccess(res, null, 'You cannot delete yourself.');
    }

    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) throw new NotFoundError('User');

    user.isDeleted = true;
    user.deletedAt = new Date();
    user.deletedBy = req.user._id;
    await user.save();

    await AuditLog.create({
      action: 'USER_DELETED',
      resource: 'User',
      resourceId: user._id,
      performedBy: req.user._id,
      performedByRole: 'admin',
      ipAddress: req.ip,
    });

    sendSuccess(res, null, 'User deactivated.');
  } catch (error) {
    next(error);
  }
};

exports.getDashboardStats = async (req, res, next) => {
  try {
    const [totalUsers, totalItems, totalClaims, itemsByType, claimsByStatus, recentActivity] = await Promise.all([
      User.countDocuments({ isDeleted: false }),
      Item.countDocuments({ isDeleted: false }),
      Claim.countDocuments({ isDeleted: false }),
      Item.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Claim.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      AuditLog.find()
        .populate('performedBy', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    sendSuccess(res, {
      stats: {
        totalUsers,
        totalItems,
        totalClaims,
        itemsByType,
        claimsByStatus,
      },
      recentActivity,
    });
  } catch (error) {
    next(error);
  }
};

exports.getAuditLogs = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = {};

    if (req.query.action) filter.action = req.query.action;
    if (req.query.userId) filter.performedBy = req.query.userId;

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .populate('performedBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    sendPaginated(res, { logs }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};
