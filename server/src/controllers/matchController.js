const Match = require('../models/Match');
const Item = require('../models/Item');
const Chat = require('../models/Chat');
const matchingService = require('../services/matchingService');
const aiService = require('../services/aiService');
const { sendSuccess } = require('../utils/response');
const { NotFoundError, ForbiddenError } = require('../utils/errors');

const checkMatchAccess = async (matchId, userId) => {
  const match = await Match.findById(matchId);
  if (!match) throw new NotFoundError('Match');

  const lostItem = await Item.findById(match.lostItem).select('reportedBy');
  const foundItem = await Item.findById(match.foundItem).select('reportedBy');

  if (!lostItem) throw new NotFoundError('Lost item');
  if (!foundItem) throw new NotFoundError('Found item');

  const isLostOwner = lostItem.reportedBy.toString() === userId.toString();
  const isFoundOwner = foundItem.reportedBy.toString() === userId.toString();

  if (!isLostOwner && !isFoundOwner) {
    throw new ForbiddenError('You do not have access to this match.');
  }

  return { match, lostItem, foundItem, isLostOwner, isFoundOwner };
};

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
    const { match, lostItem, foundItem, isLostOwner, isFoundOwner } = await checkMatchAccess(req.params.id, req.user._id);
    
    // Reveal contact info for ALL matches as requested
    await match.populate([
      { path: 'lostItem', populate: { path: 'reportedBy', select: 'name email phone department' } },
      { path: 'foundItem', populate: { path: 'reportedBy', select: 'name email phone department' } }
    ]);

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

    const { match } = await checkMatchAccess(req.params.id, req.user._id);

    match.status = status;
    if (status === 'resolved') {
      match.resolvedAt = new Date();
      // Update both items to resolved status as well
      await Item.updateMany(
        { _id: { $in: [match.lostItem, match.foundItem] } },
        { status: 'resolved' }
      );
    }
    await match.save();

    sendSuccess(res, { match }, `Match ${status}.`);
  } catch (error) {
    next(error);
  }
};

exports.getMatchChat = async (req, res, next) => {
  try {
    const { match, lostItem, foundItem } = await checkMatchAccess(req.params.id, req.user._id);

    const participants = [
      lostItem.reportedBy,
      foundItem.reportedBy,
    ];

    let chat = await Chat.findOne({
      item: match.lostItem,
      participants: { $all: participants.map((p) => p.toString()) },
      isDeleted: false,
    }).populate('messages.sender', 'name email');

    if (!chat) {
      const lostItemFull = await Item.findById(match.lostItem).populate('reportedBy');
      const foundItemFull = await Item.findById(match.foundItem).populate('reportedBy');
      chat = await Chat.create({
        participants: [lostItemFull.reportedBy._id, foundItemFull.reportedBy._id],
        item: match.lostItem,
        messages: [{
          sender: foundItemFull.reportedBy._id,
          content: `Match found! "${lostItemFull.title}" matches "${foundItemFull.title}" (${match.score}%). ${match.aiExplanation || ''}`,
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
    const { message } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Message is required.' });
    }

    const match = await Match.findById(req.params.id)
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email' } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } });

    if (!match) throw new NotFoundError('Match');

    const lostItem = match.lostItem;
    const foundItem = match.foundItem;
    const isLostOwner = lostItem.reportedBy._id.toString() === req.user._id.toString();
    const isFoundOwner = foundItem.reportedBy._id.toString() === req.user._id.toString();

    if (!isLostOwner && !isFoundOwner) {
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
        ownerName: lostItem.reportedBy?.name,
      },
      foundItem: foundItem ? {
        title: foundItem.title,
        description: foundItem.description,
        category: foundItem.category,
        location: foundItem.location,
        dateOccurred: foundItem.dateOccurred,
        finderName: foundItem.reportedBy?.name,
        finderDepartment: foundItem.reportedBy?.department,
      } : null,
      matchScore: match.score,
      matchDetails: match.details,
      isLostOwner,
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

exports.createMatch = async (req, res, next) => {
  try {
    const { lostItemId, foundItemId, score, details, explanation } = req.body;

    const lostItem = await Item.findById(lostItemId);
    const foundItem = await Item.findById(foundItemId);

    if (!lostItem || !foundItem) throw new NotFoundError('Items not found');

    // If regular user, they can only create a match for their OWN lost item
    if (req.user.role === 'user' && lostItem.reportedBy.toString() !== req.user._id.toString()) {
      throw new ForbiddenError('You can only create matches for your own lost items.');
    }

    // Check if match already exists
    let match = await Match.findOne({ lostItem: lostItemId, foundItem: foundItemId });
    
    if (match) {
      match.score = score || 100;
      match.method = 'manual';
      match.aiExplanation = explanation || 'Manually matched by user/staff.';
      await match.save();
    } else {
      match = await Match.create({
        lostItem: lostItemId,
        foundItem: foundItemId,
        score: score || 100,
        details: details || { titleScore: 100, descriptionScore: 100, categoryScore: 100, locationScore: 100, tagScore: 100, timeScore: 100 },
        method: 'manual',
        aiExplanation: explanation || 'Manually matched by user/staff.',
      });
    }

    // Trigger chat creation if needed
    await matchingService.createMatchChat(match);

    sendSuccess(res, { match }, 'Manual match created successfully.');
  } catch (error) {
    next(error);
  }
};

function generateLocalAnswer(context, question) {
  const q = question.toLowerCase();
  const lost = context.lostItem;
  const found = context.foundItem;
  const isLostOwner = context.isLostOwner;
  const parts = [];

  if (q.includes('match') || q.includes('score') || q.includes('similar')) {
    parts.push(`The match score between ${isLostOwner ? 'your' : 'the'} "${lost.title}" and ${isLostOwner ? 'the found' : 'the lost'} "${found?.title || 'item'}" is ${context.matchScore}%.`);
    if (context.matchScore >= 70) {
      parts.push('This is a strong match! We recommend contacting the other party.');
    } else if (context.matchScore >= 50) {
      parts.push('This is a moderate match. Review the details carefully.');
    } else {
      parts.push('This is a low match. It may not be a correct match.');
    }
    if (context.matchDetails) {
      parts.push(`Breakdown - Title: ${context.matchDetails.titleScore}%, Description: ${context.matchDetails.descriptionScore}%, Category: ${context.matchDetails.categoryScore}%, Location: ${context.matchDetails.locationScore}%, Tags: ${context.matchDetails.tagScore}%.`);
    }
  }

  if (q.includes('chat') || q.includes('contact') || q.includes('message')) {
    const otherParty = isLostOwner
      ? (found?.finderName || 'the finder')
      : (lost?.ownerName || 'the owner');
    parts.push(`You can chat with ${otherParty} through the chat feature on this page. They are waiting to help resolve this item.`);
  }

  if (q.includes('lost') || q.includes('my item') || q.includes('detail')) {
    const item = isLostOwner ? lost : found;
    const label = isLostOwner ? 'lost' : 'found';
    if (item) {
      parts.push(`The ${label} item: "${item.title}" (${item.category || 'No category'}). ${isLostOwner ? 'Reported lost' : 'Found'} at ${item.location || 'Unknown location'}${item.dateOccurred ? ` on ${new Date(item.dateOccurred).toLocaleDateString()}` : ''}. Status: ${item.status || 'open'}.`);
      if (item.description) {
        parts.push(`Description: ${item.description.substring(0, 200)}${item.description.length > 200 ? '...' : ''}`);
      }
    }
  }

  if (q.includes('found') || q.includes('finder') || q.includes('owner')) {
    const otherItem = isLostOwner ? found : lost;
    const otherLabel = isLostOwner ? 'found' : 'lost';
    const otherPerson = isLostOwner ? (found?.finderName || 'the finder') : (lost?.ownerName || 'the owner');
    if (otherItem) {
      parts.push(`The ${otherLabel} item: "${otherItem.title}" (${otherItem.category || 'No category'}). ${isLostOwner ? 'Found' : 'Reported lost'} at ${otherItem.location || 'Unknown location'}${otherItem.dateOccurred ? ` on ${new Date(otherItem.dateOccurred).toLocaleDateString()}` : ''}. ${isLostOwner ? `Finder: ${found?.finderName || 'Anonymous'} (${found?.finderDepartment || ''})` : `Owner: ${lost?.ownerName || 'Anonymous'}`}.`);
      if (otherItem.description) {
        parts.push(`Description: ${otherItem.description.substring(0, 200)}${otherItem.description.length > 200 ? '...' : ''}`);
      }
    }
  }

  if (q.includes('next') || q.includes('step') || q.includes('what') || q.includes('help') || q.includes('suggest')) {
    if (context.matchScore >= 70) {
      parts.push('Next steps: 1) Review the match details below. 2) Click "Chat" to discuss returning the item. 3) Coordinate pickup. 4) Mark as resolved once complete.');
    } else if (context.matchScore >= 50) {
      parts.push('The match is moderate. You can: 1) Review the item details. 2) Chat with the other party to ask more questions. 3) If it matches, arrange pickup.');
    } else {
      parts.push('This match has a low score. You might want to check other potential matches or report a new item.');
    }
  }

  if (q === 'hi' || q === 'hello' || q === 'hey') {
    return "hey i'm lost link system developed by DBE cs student";
  }

  if (parts.length === 0) {
    parts.push("hey i'm lost link system developed by DBE cs student. You can ask me about the match score, item details, how to chat, or what to do next.");
  }

  return parts.join('\n\n');
}
