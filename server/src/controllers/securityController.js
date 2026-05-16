const Device = require('../models/Device');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/response');
const { paginate, buildPaginationResponse, sanitizeHtml } = require('../utils/helpers');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const sanitize = (obj) => {
  const sanitized = { ...obj };
  for (const key of ['name', 'type', 'serialNumber', 'idNumber', 'ownerName', 'description', 'status']) {
    if (typeof sanitized[key] === 'string') {
      sanitized[key] = sanitizeHtml(sanitized[key].trim());
    }
  }
  return sanitized;
};

exports.listDevices = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false };
    if (req.user.role === 'security') {
      filter.registeredBy = req.user._id;
    }

    if (req.query.type) filter.type = req.query.type;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.q) {
      filter.$or = [
        { name: { $regex: req.query.q, $options: 'i' } },
        { serialNumber: { $regex: req.query.q, $options: 'i' } },
        { idNumber: { $regex: req.query.q, $options: 'i' } },
        { ownerName: { $regex: req.query.q, $options: 'i' } },
      ];
    }

    const [devices, total] = await Promise.all([
      Device.find(filter)
        .populate('registeredBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Device.countDocuments(filter),
    ]);

    sendPaginated(res, { devices }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.registerDevice = async (req, res, next) => {
  try {
    const deviceData = sanitize({ ...req.body, registeredBy: req.user._id });
    const device = await Device.create(deviceData);
    sendCreated(res, { device }, 'Device registered successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getDevice = async (req, res, next) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, isDeleted: false }).populate('registeredBy', 'name email role');
    if (!device) throw new NotFoundError('Device');
    if (req.user.role === 'security' && !device.registeredBy._id.equals(req.user._id)) {
      throw new ForbiddenError('You do not have access to this device.');
    }
    sendSuccess(res, { device });
  } catch (error) {
    next(error);
  }
};

exports.deleteDevice = async (req, res, next) => {
  try {
    const device = await Device.findOne({ _id: req.params.id, isDeleted: false });
    if (!device) throw new NotFoundError('Device');

    if (req.user.role === 'security' && !device.registeredBy.equals(req.user._id)) {
      throw new ForbiddenError('You cannot remove a device you did not register.');
    }

    device.isDeleted = true;
    device.deletedAt = new Date();
    device.deletedBy = req.user._id;
    await device.save();

    sendSuccess(res, null, 'Device removed.');
  } catch (error) {
    next(error);
  }
};
