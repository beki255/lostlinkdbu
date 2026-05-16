const Item = require('../models/Item');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const aiService = require('./aiService');

const createMatchChat = async (match) => {
  const lostItem = await Item.findById(match.lostItem).populate('reportedBy');
  const foundItem = await Item.findById(match.foundItem).populate('reportedBy');
  if (!lostItem || !foundItem) return null;

  const participants = [lostItem.reportedBy._id, foundItem.reportedBy._id];
  const existingChat = await Chat.findOne({
    item: match.lostItem,
    participants: { $all: participants.map((p) => p.toString()) },
    isDeleted: false,
  });
  if (existingChat) return existingChat;

  const chat = await Chat.create({
    participants,
    item: match.lostItem,
    messages: [{
      sender: foundItem.reportedBy._id,
      content: `Match found! "${lostItem.title}" matches "${foundItem.title}" (${match.score}%). ${match.aiExplanation || ''}`,
      messageType: 'system',
    }],
    isActive: true,
    lastActivity: new Date(),
  });
  return chat;
};

const notifyOwner = async (match) => {
  const lostItem = await Item.findById(match.lostItem).populate('reportedBy');
  if (!lostItem || !lostItem.reportedBy) return;

  const chat = await createMatchChat(match);
  await Notification.create({
    recipient: lostItem.reportedBy._id,
    type: 'item_matched',
    title: 'Strong Match Found!',
    message: `We found a potential match for "${lostItem.title}" with ${match.score}% similarity.`,
    data: {
      itemId: match.lostItem,
      matchId: match._id,
      chatId: chat?._id,
      url: `/matches/${match._id}`,
    },
  });
  match.isNotified = true;
  match.notifiedAt = new Date();
  await match.save();
};

const notifyFinder = async (match) => {
  const foundItem = await Item.findById(match.foundItem).populate('reportedBy');
  const lostItem = await Item.findById(match.lostItem).populate('reportedBy');
  if (!foundItem || !foundItem.reportedBy) return;

  const chat = await createMatchChat(match);
  await Notification.create({
    recipient: foundItem.reportedBy._id,
    type: 'item_matched',
    title: 'Your found item matches a lost item!',
    message: `Your found item "${foundItem.title}" matches "${lostItem?.title || 'a lost item'}" with ${match.score}% similarity.`,
    data: {
      itemId: match.foundItem,
      matchId: match._id,
      chatId: chat?._id,
      url: `/matches/${match._id}`,
    },
  });
};

const upsertMatch = async (lostItemId, foundItemId, score, details, explanation) => {
  let match = await Match.findOne({ lostItem: lostItemId, foundItem: foundItemId });
  if (match) {
    match.score = score;
    match.details = details;
    match.aiExplanation = explanation || '';
    await match.save();
  } else {
    match = await Match.create({
      lostItem: lostItemId,
      foundItem: foundItemId,
      score,
      details,
      aiExplanation: explanation || '',
    });
  }
  return match;
};

const runMatchingForLostItem = async (lostItemId) => {
  try {
    const lostItem = await Item.findById(lostItemId);
    if (!lostItem || lostItem.type !== 'lost') return { matches: [], method: 'none' };

    const foundItems = await Item.find({
      type: 'found',
      status: 'open',
      isDeleted: false,
    }).populate('reportedBy');

    if (foundItems.length === 0) return { matches: [], method: 'none' };

    const aiResults = await aiService.analyzeMatches(lostItem, foundItems);
    if (!aiResults || aiResults.length === 0) return { matches: [], method: 'none' };

    const matches = [];
    for (const ai of aiResults) {
      const foundItem = ai.foundItem;
      if (!foundItem) continue;

      const match = await upsertMatch(
        lostItem._id,
        foundItem._id,
        ai.score,
        ai.details,
        ai.explanation
      );

      await notifyOwner(match);
      matches.push(match);
    }

    if (matches.length === 0) return { matches: [], method: 'none' };

    const populated = await Match.find({ _id: { $in: matches.map((m) => m._id) } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .sort({ score: -1 });

    return { matches: populated, method: 'ai' };
  } catch (error) {
    console.error('[Matching] Error:', error.message);
    return { matches: [], method: 'error' };
  }
};

const runMatching = async (foundItemId) => {
  try {
    const foundItem = await Item.findById(foundItemId);
    if (!foundItem || foundItem.type !== 'found') return { matches: [], method: 'none' };

    const lostItems = await Item.find({ type: 'lost', status: 'open', isDeleted: false }).populate('reportedBy');
    if (lostItems.length === 0) return { matches: [], method: 'none' };

    const aiResults = await aiService.analyzeFoundItem(foundItem, lostItems);
    if (!aiResults || aiResults.length === 0) return { matches: [], method: 'none' };

    const matchIds = [];
    for (const ai of aiResults) {
      const lostItem = ai.foundItem;
      if (!lostItem) continue;

      const match = await upsertMatch(
        lostItem._id,
        foundItem._id,
        ai.score,
        ai.details,
        ai.explanation
      );

      await notifyOwner(match);
      await notifyFinder(match);
      matchIds.push(match._id);
    }

    if (matchIds.length === 0) return { matches: [], method: 'none' };

    const populated = await Match.find({ _id: { $in: matchIds } })
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .sort({ score: -1 });

    return { matches: populated, method: 'ai' };
  } catch (error) {
    console.error('[Matching] Error:', error.message);
    return { matches: [], method: 'error' };
  }
};

const getMatchesForUser = async (userId) => {
  const lostItems = await Item.find({ reportedBy: userId, type: 'lost', isDeleted: false }).select('_id');
  const foundItems = await Item.find({ reportedBy: userId, type: 'found', isDeleted: false }).select('_id');
  return Match.find({
    $or: [
      { lostItem: { $in: lostItems.map((i) => i._id) } },
      { foundItem: { $in: foundItems.map((i) => i._id) } },
    ],
  })
    .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } })
    .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email department' } })
    .sort({ score: -1, createdAt: -1 });
};

const getMatchById = async (matchId) => {
  return Match.findById(matchId)
    .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } })
    .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email department' } });
};

module.exports = {
  runMatching,
  runMatchingForLostItem,
  getMatchesForUser,
  getMatchById,
  createMatchChat,
};
