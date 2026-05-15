const Claim = require('../models/Claim');
const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');
const Notification = require('../models/Notification');
const { paginate, buildPaginationResponse } = require('../utils/helpers');
const { sendSuccess, sendPaginated, sendCreated } = require('../utils/response');
const { NotFoundError, AppError } = require('../utils/errors');

exports.submitClaim = async (req, res, next) => {
  try {
    const item = await Item.findOne({ _id: req.body.itemId, isDeleted: false });
    if (!item) throw new NotFoundError('Item');

    if (item.type !== 'found') {
      throw new AppError('Claims can only be submitted for found items.', 400);
    }

    const existingClaim = await Claim.findOne({
      item: item._id,
      claimant: req.user._id,
      status: { $in: ['pending', 'under_review'] },
    });
    if (existingClaim) {
      throw new AppError('You already have a pending claim for this item.', 409);
    }

    const claim = await Claim.create({
      item: item._id,
      claimant: req.user._id,
      description: req.body.description,
      proofDetails: req.body.proofDetails,
    });

    await AuditLog.create({
      action: 'CLAIM_SUBMITTED',
      resource: 'Claim',
      resourceId: claim._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      ipAddress: req.ip,
    });

    sendCreated(res, { claim }, 'Claim submitted successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getClaims = async (req, res, next) => {
  try {
    const { page, limit, skip } = paginate(req.query.page, req.query.limit);
    const filter = { isDeleted: false };

    if (req.user.role === 'user') {
      filter.claimant = req.user._id;
    }

    if (req.query.status) filter.status = req.query.status;
    if (req.query.itemId) filter.item = req.query.itemId;

    const [claims, total] = await Promise.all([
      Claim.find(filter)
        .populate('item', 'title description type images category')
        .populate('claimant', 'name email department studentId')
        .populate('reviewedBy', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Claim.countDocuments(filter),
    ]);

    sendPaginated(res, { claims }, buildPaginationResponse(total, page, limit));
  } catch (error) {
    next(error);
  }
};

exports.getClaim = async (req, res, next) => {
  try {
    const claim = await Claim.findOne({
      _id: req.params.id,
      isDeleted: false,
    })
      .populate('item', 'title description type images category status')
      .populate('claimant', 'name email department studentId')
      .populate('reviewedBy', 'name');

    if (!claim) throw new NotFoundError('Claim');

    if (req.user.role === 'user' && !claim.claimant._id.equals(req.user._id)) {
      throw new AppError('Access denied.', 403);
    }

    sendSuccess(res, { claim });
  } catch (error) {
    next(error);
  }
};

exports.reviewClaim = async (req, res, next) => {
  try {
    const { status, reviewNotes, aiSuggestion } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      throw new AppError('Status must be approved or rejected.', 400);
    }

    const claim = await Claim.findOne({
      _id: req.params.id,
      isDeleted: false,
      status: { $in: ['pending', 'under_review'] },
    });
    if (!claim) throw new NotFoundError('Claim');

    claim.status = status;
    claim.reviewedBy = req.user._id;
    claim.reviewNotes = reviewNotes;
    claim.reviewedAt = new Date();
    if (aiSuggestion) claim.aiSuggestion = aiSuggestion;
    await claim.save();

    // Update item status if approved
    if (status === 'approved') {
      await Item.findByIdAndUpdate(claim.item, { status: 'claimed' });
    }

    await Notification.create({
      recipient: claim.claimant,
      type: status === 'approved' ? 'claim_approved' : 'claim_rejected',
      title: `Claim ${status}`,
      message: `Your claim for an item has been ${status}.`,
      data: { claimId: claim._id, itemId: claim.item },
    });

    await AuditLog.create({
      action: 'CLAIM_REVIEWED',
      resource: 'Claim',
      resourceId: claim._id,
      performedBy: req.user._id,
      performedByRole: req.user.role,
      changes: { new: { status } },
      ipAddress: req.ip,
    });

    sendSuccess(res, { claim }, `Claim ${status}.`);
  } catch (error) {
    next(error);
  }
};
