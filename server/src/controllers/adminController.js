const User = require('../models/User');
const Item = require('../models/Item');
const Claim = require('../models/Claim');
const AuditLog = require('../models/AuditLog');
const CmsPage = require('../models/CmsPage');
const Device = require('../models/Device');
const Match = require('../models/Match');
const { paginate, buildPaginationResponse, sanitizeHtml } = require('../utils/helpers');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/response');
const { NotFoundError, ForbiddenError, AppError } = require('../utils/errors');

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

exports.updateUserStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['active', 'banned'].includes(status)) {
      throw new AppError('Invalid status.', 400);
    }

    const user = await User.findById(req.params.id);
    if (!user || user.isDeleted) throw new NotFoundError('User');

    const oldStatus = user.status;
    user.status = status;
    await user.save();

    await AuditLog.create({
      action: status === 'banned' ? 'USER_BANNED' : 'USER_UNBANNED',
      resource: 'User',
      resourceId: user._id,
      performedBy: req.user._id,
      performedByRole: 'admin',
      changes: { old: { status: oldStatus }, new: { status } },
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: user.toPublicJSON() }, `User status updated to ${status}.`);
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

exports.getUserById = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) throw new NotFoundError('User');
    sendSuccess(res, { user: user.toPublicJSON() });
  } catch (error) {
    next(error);
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ _id: req.params.id, isDeleted: false });
    if (!user) throw new NotFoundError('User');

    const allowedFields = ['name', 'phone', 'department', 'studentId', 'role', 'isVerified'];
    const updateData = {};
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        updateData[key] = typeof req.body[key] === 'string' ? sanitizeHtml(req.body[key]) : req.body[key];
      }
    }

    Object.assign(user, updateData);
    await user.save();

    await AuditLog.create({
      action: 'USER_UPDATED',
      resource: 'User',
      resourceId: user._id,
      performedBy: req.user._id,
      performedByRole: 'admin',
      changes: { new: updateData },
      ipAddress: req.ip,
    });

    sendSuccess(res, { user: user.toPublicJSON() }, 'User updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role, phone, department, studentId } = req.body;

    const existingUser = await User.findOne({ email, isDeleted: false });
    if (existingUser) {
      throw new AppError('A user with this email already exists.', 400);
    }

    const userData = {
      name: sanitizeHtml(name),
      email: email.toLowerCase().trim(),
      passwordHash: password,
      role: role || 'user',
      phone: phone ? sanitizeHtml(phone) : undefined,
      department: department ? sanitizeHtml(department) : undefined,
      studentId: studentId ? sanitizeHtml(studentId) : undefined,
      isVerified: true, // Admin-created users are pre-verified
    };

    const user = await User.create(userData);

    await AuditLog.create({
      action: 'USER_CREATED_BY_ADMIN',
      resource: 'User',
      resourceId: user._id,
      performedBy: req.user._id,
      performedByRole: 'admin',
      changes: { new: { email: user.email, role: user.role } },
      ipAddress: req.ip,
    });

    sendCreated(res, { user: user.toPublicJSON() }, 'User account created successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getUserItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { reportedBy: req.params.id, isDeleted: false };

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

exports.getReportsSummary = async (req, res, next) => {
  try {
    const [usersByRole, itemsByType, itemsByCategory, claimsByStatus, devicesByType] = await Promise.all([
      User.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$role', count: { $sum: 1 } } },
      ]),
      Item.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
      Item.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$category', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Claim.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Device.aggregate([
        { $match: { isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } },
      ]),
    ]);

    sendSuccess(res, {
      reports: {
        usersByRole,
        itemsByType,
        itemsByCategory,
        claimsByStatus,
        devicesByType,
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.getCmsPages = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false };
    if (req.query.type) filter.type = req.query.type;
    if (req.query.q) {
      filter.$or = [
        { title: { $regex: req.query.q, $options: 'i' } },
        { content: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    const [pages, total] = await Promise.all([
      CmsPage.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      CmsPage.countDocuments(filter),
    ]);

    sendPaginated(res, { pages }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.createCmsPage = async (req, res, next) => {
  try {
    const pageData = {
      title: sanitizeHtml(req.body.title || ''),
      slug: sanitizeHtml((req.body.slug || req.body.title || '').toString().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')),
      type: req.body.type || 'page',
      content: sanitizeHtml(req.body.content || ''),
      status: req.body.status || 'published',
      metadata: req.body.metadata || {},
      createdBy: req.user._id,
      updatedBy: req.user._id,
    };

    const page = await CmsPage.create(pageData);
    sendCreated(res, { page }, 'CMS page created successfully.');
  } catch (error) {
    next(error);
  }
};

exports.updateCmsPage = async (req, res, next) => {
  try {
    const page = await CmsPage.findOne({ _id: req.params.id, isDeleted: false });
    if (!page) throw new NotFoundError('CMS page');

    const allowedFields = ['title', 'slug', 'type', 'content', 'status', 'metadata'];
    for (const key of allowedFields) {
      if (req.body[key] !== undefined) {
        page[key] = key === 'metadata' ? req.body[key] : sanitizeHtml(req.body[key].toString());
      }
    }
    page.updatedBy = req.user._id;
    await page.save();

    sendSuccess(res, { page }, 'CMS page updated successfully.');
  } catch (error) {
    next(error);
  }
};

exports.deleteCmsPage = async (req, res, next) => {
  try {
    const page = await CmsPage.findOne({ _id: req.params.id, isDeleted: false });
    if (!page) throw new NotFoundError('CMS page');

    page.isDeleted = true;
    page.deletedAt = new Date();
    page.deletedBy = req.user._id;
    await page.save();

    sendSuccess(res, null, 'CMS page archived successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getLostFoundUsers = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);

    // Find unique user IDs from Item collection
    const reportedUserIds = await Item.distinct('reportedBy', { isDeleted: false });

    const filter = { 
      _id: { $in: reportedUserIds },
      isDeleted: false 
    };

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

    // Fetch item counts for each user
    const usersWithCounts = await Promise.all(users.map(async (user) => {
      const itemCounts = await Item.aggregate([
        { $match: { reportedBy: user._id, isDeleted: false } },
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);
      
      const counts = { lost: 0, found: 0 };
      itemCounts.forEach(c => {
        if (c._id === 'lost') counts.lost = c.count;
        if (c._id === 'found') counts.found = c.count;
      });

      return {
        ...user.toPublicJSON(),
        counts
      };
    }));

    sendPaginated(res, { users: usersWithCounts }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getReceivedItems = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    
    // Find resolved matches
    const filter = { status: 'resolved' };

    const [matches, total] = await Promise.all([
      Match.find(filter)
        .populate({
          path: 'lostItem',
          populate: { path: 'reportedBy', select: 'name email phone department studentId' }
        })
        .populate({
          path: 'foundItem',
          populate: { path: 'reportedBy', select: 'name email phone department studentId' }
        })
        .sort({ resolvedAt: -1 })
        .skip(skip)
        .limit(limit),
      Match.countDocuments(filter),
    ]);

    sendPaginated(res, { matches }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};
