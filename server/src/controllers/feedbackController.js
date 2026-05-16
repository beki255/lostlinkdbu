const Feedback = require('../models/Feedback');
const { sendSuccess } = require('../utils/response');
const { AppError } = require('../utils/errors');

exports.submitFeedback = async (req, res, next) => {
  try {
    const { matchId, subject, message, type } = req.body;
    
    if (!message) {
      throw new AppError('Feedback message is required.', 400);
    }

    const feedback = await Feedback.create({
      user: req.user._id,
      match: matchId,
      subject: subject || 'Match Feedback',
      message,
      type: type || 'accuracy'
    });

    sendSuccess(res, { feedback }, 'Feedback submitted successfully.');
  } catch (error) {
    next(error);
  }
};

exports.getAllFeedback = async (req, res, next) => {
  try {
    const feedbacks = await Feedback.find()
      .populate('user', 'name email')
      .populate({
        path: 'match',
        populate: [
          { path: 'lostItem', select: 'title' },
          { path: 'foundItem', select: 'title' }
        ]
      })
      .sort({ createdAt: -1 });

    sendSuccess(res, { feedbacks });
  } catch (error) {
    next(error);
  }
};
