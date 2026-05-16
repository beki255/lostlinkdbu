const Match = require('../models/Match');
const Item = require('../models/Item');
const Chat = require('../models/Chat');
const matchingService = require('../services/matchingService');
const aiService = require('../services/aiService');
const { sendSuccess, sendPaginated, buildPaginationResponse } = require('../utils/response');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

exports.getMyMatches = async (req, res, next) => {
  try {
    const matches = await matchingService.getMatchesForUser(req.user._id);
    sendSuccess(res, { matches });
  } catch (error) {
    next(error);
  }
};

exports.getMatch = async (req, res, next) => {
  try {
    const match = await matchingService.getMatchById(req.params.id);
    if (!match) throw new NotFoundError('Match');

    const lostItem = await Item.findById(match.lostItem);
    if (!lostItem) throw new NotFoundError('Lost item');

    if (req.user.role === 'user' && lostItem.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not have access to this match.');
    }

    sendSuccess(res, { match });
  } catch (error) {
    next(error);
  }
};

exports.updateMatchStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['contacted', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status.' });
    }

    const match = await Match.findById(req.params.id);
    if (!match) throw new NotFoundError('Match');

    const lostItem = await Item.findById(match.lostItem);
    if (req.user.role === 'user' && lostItem.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not have access to this match.');
    }

    match.status = status;
    if (status === 'resolved') {
      match.resolvedAt = new Date();
    }
    await match.save();

    sendSuccess(res, { match }, `Match ${status}.`);
  } catch (error) {
    next(error);
  }
};

exports.getMatchChat = async (req, res, next) => {
  try {
    const match = await Match.findById(req.params.id);
    if (!match) throw new NotFoundError('Match');

    const lostItem = await Item.findById(match.lostItem);
    if (req.user.role === 'user' && lostItem.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You do not have access to this chat.');
    }

    const foundItem = await Item.findById(match.foundItem);
    if (!foundItem) throw new NotFoundError('Found item');

    const participants = [
      lostItem.reportedBy,
      foundItem.reportedBy,
    ];

    let chat = await Chat.findOne({
      item: match.lostItem,
      participants: { $all: participants.map((p) => p.toString()) },
      isDeleted: false,
    });

    if (!chat) {
      chat = await Chat.create({
        participants,
        item: match.lostItem,
        messages: [{
          sender: foundItem.reportedBy,
          content: `Match found! Score: ${match.score}%`,
          messageType: 'system',
        }],
        isActive: true,
        lastActivity: new Date(),
      });
    }

    sendSuccess(res, { chat });
  } catch (error) {
    next(error);
  }
};

exports.askAI = async (req, res, next) => {
  try {
    const { message, matchId } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const match = await Match.findById(matchId)
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email' } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } });

    if (!match) throw new NotFoundError('Match');

    const lostItem = match.lostItem;
    if (req.user.role === 'user' && lostItem.reportedBy._id.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('Access denied.');
    }

    const context = {
      match,
      lostItem: {
        title: lostItem.title,
        description: lostItem.description,
        category: lostItem.category,
        location: lostItem.location,
        status: lostItem.status,
        dateOccurred: lostItem.dateOccurred,
      },
      foundItem: match.foundItem ? {
        title: match.foundItem.title,
        description: match.foundItem.description,
        category: match.foundItem.category,
        location: match.foundItem.location,
        dateOccurred: match.foundItem.dateOccurred,
        finderName: match.foundItem.reportedBy?.name,
      } : null,
      matchScore: match.score,
      matchDetails: match.details,
    };

    const externalResult = await aiService.askAssistant({
      context: JSON.stringify(context),
      question: message,
    });

    if (externalResult && externalResult.answer) {
      return sendSuccess(res, { answer: externalResult.answer });
    }

    const answer = generateLocalAnswer(context, message);
    sendSuccess(res, { answer });
  } catch (error) {
    next(error);
  }
};

function generateLocalAnswer(context, question) {
  const q = question.toLowerCase();
  const lost = context.lostItem;
  const found = context.foundItem;
  const parts = [];

  if (q.includes('match') || q.includes('score') || q.includes('similar')) {
    parts.push(`The match score between your "${lost.title}" and the found "${found?.title || 'item'}" is ${context.matchScore}%.`);
    if (context.matchScore >= 85) {
      parts.push('This is a strong match! We recommend contacting the finder.');
    } else if (context.matchScore >= 50) {
      parts.push('This is a moderate match. Review the details carefully.');
    } else {
      parts.push('This is a low match. It may not be your item.');
    }
    if (context.matchDetails) {
      parts.push(`Breakdown - Title: ${context.matchDetails.titleScore}%, Description: ${context.matchDetails.descriptionScore}%, Category: ${context.matchDetails.categoryScore}%, Location: ${context.matchDetails.locationScore}%, Tags: ${context.matchDetails.tagScore}%.`);
    }
  }

  if (q.includes('chat') || q.includes('contact') || q.includes('message')) {
    if (found) {
      parts.push(`You can chat with the finder (${found.finderName || 'the person who found it'}) through the chat feature on this page. They are waiting to help return your item.`);
    } else {
      parts.push('Use the chat feature on this page to communicate with the finder.');
    }
  }

  if (q.includes('lost') || q.includes('my item') || q.includes('detail')) {
    parts.push(`Your lost item: "${lost.title}" (${lost.category || 'No category'}). Reported lost at ${lost.location || 'Unknown location'}${lost.dateOccurred ? ` on ${new Date(lost.dateOccurred).toLocaleDateString()}` : ''}. Status: ${lost.status || 'open'}.`);
    if (lost.description) {
      parts.push(`Description: ${lost.description.substring(0, 200)}${lost.description.length > 200 ? '...' : ''}`);
    }
  }

  if (q.includes('found') || q.includes('finder') || q.includes('found item')) {
    if (found) {
      parts.push(`The found item: "${found.title}" (${found.category || 'No category'}). Found at ${found.location || 'Unknown location'}${found.dateOccurred ? ` on ${new Date(found.dateOccurred).toLocaleDateString()}` : ''}. Finder: ${found.finderName || 'Anonymous'}.`);
      if (found.description) {
        parts.push(`Description: ${found.description.substring(0, 200)}${found.description.length > 200 ? '...' : ''}`);
      }
    } else {
      parts.push('No found item details available yet.');
    }
  }

  if (q.includes('next') || q.includes('step') || q.includes('what') || q.includes('help') || q.includes('suggest')) {
    if (context.matchScore >= 85) {
      parts.push('Next steps: 1) Review the match details below. 2) Click "Chat with Finder" to discuss returning your item. 3) Coordinate pickup. 4) Mark as resolved once recovered.');
    } else if (context.matchScore >= 50) {
      parts.push('The match is moderate. You can: 1) Review the found item details. 2) Chat with the finder to ask more questions. 3) If it matches, arrange pickup.');
    } else {
      parts.push('This match has a low score. You might want to check other potential matches or report a new lost item if this is not yours.');
    }
  }

  if (parts.length === 0) {
    parts.push(`I'm your AI assistant for the item "${lost.title}". You can ask me about the match score, item details, how to chat with the finder, or what to do next.`);
  }

  return parts.join('\n\n');
}
