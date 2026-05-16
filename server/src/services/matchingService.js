const Item = require('../models/Item');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const Device = require('../models/Device');
const matchingLogic = require('../utils/matchingLogic');

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
      content: `Match found! "${lostItem.title}" matches "${foundItem.title}" (${match.score}%).`,
      messageType: 'system',
    }],
    isActive: true,
    lastActivity: new Date(),
  });
  return chat;
};

const emailService = require('./emailService');

const notifyOwner = async (match) => {
  const lostItem = await Item.findById(match.lostItem).populate('reportedBy');
  if (!lostItem || !lostItem.reportedBy) return;

  const chat = await createMatchChat(match);
  
  // 1. In-app notification
  await Notification.create({
    recipient: lostItem.reportedBy._id,
    type: 'item_matched',
    title: 'Match Found!',
    message: `A potential match for "${lostItem.title}" was found with ${match.score}% similarity.`,
    data: {
      itemId: match.lostItem,
      matchId: match._id,
      chatId: chat?._id,
      url: `/matches/${match._id}`,
    },
  });

  // 2. Automated Email Notification
  await emailService.sendMatchEmail({
    to: lostItem.reportedBy.email,
    userName: lostItem.reportedBy.name,
    itemTitle: lostItem.title,
    matchScore: match.score,
    matchUrl: `/matches/${match._id}`
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
    title: 'Item Match Found!',
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
    match.aiExplanation = explanation || 'System matched by category and title.';
    await match.save();
  } else {
    match = await Match.create({
      lostItem: lostItemId,
      foundItem: foundItemId,
      score,
      details,
      aiExplanation: explanation || 'System matched by category and title.',
    });
  }
  return match;
};

const checkRegisteredDevice = async (lostItem) => {
  if (!lostItem.serialNumber && !lostItem.ownerName) return null;
  const query = { isDeleted: false };
  if (lostItem.serialNumber) {
    query.serialNumber = lostItem.serialNumber.trim();
  } else if (lostItem.ownerName) {
    query.ownerName = new RegExp(lostItem.ownerName.trim(), 'i');
  }
  const device = await Device.findOne(query);
  return device;
};

const runMatchingForLostItem = async (lostItemId) => {
  try {
    const lostItem = await Item.findById(lostItemId).populate('reportedBy');
    if (!lostItem || lostItem.type !== 'lost') return { matches: [], method: 'none' };

    const registeredDevice = await checkRegisteredDevice(lostItem);

    const foundItems = await Item.find({
      type: 'found',
      status: 'open',
      isDeleted: false,
    }).populate('reportedBy');

    if (foundItems.length === 0) return { matches: [], method: 'none' };

    const finalMatches = foundItems.map(found => {
      const result = matchingLogic.calculateRuleScore(lostItem, found);
      
      // Security Boost
      if (registeredDevice && found.serialNumber === registeredDevice.serialNumber) {
        result.score = 100;
        result.explanation = `SECURITY VERIFIED: Exact Serial Number match.`;
      }
      
      return { foundItem: found, ...result };
    }).filter(m => m.score >= 60); // Use a lower 60% threshold for related items

    const matchIds = [];
    for (const m of finalMatches) {
      const match = await upsertMatch(
        lostItem._id,
        m.foundItem._id,
        m.score,
        m.details,
        m.explanation
      );
      await notifyOwner(match);
      matchIds.push(match._id);
    }

    if (matchIds.length === 0) return { matches: [], method: 'none' };

    const populated = await Match.find({ _id: { $in: matchIds } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
      .sort({ score: -1 });

    return { matches: populated, method: 'system' };
  } catch (error) {
    console.error('[Matching] Error:', error.message);
    return { matches: [], method: 'error' };
  }
};

const runMatching = async (foundItemId) => {
  try {
    const foundItem = await Item.findById(foundItemId).populate('reportedBy');
    if (!foundItem || foundItem.type !== 'found') return { matches: [], method: 'none' };

    const lostItems = await Item.find({ type: 'lost', status: 'open', isDeleted: false }).populate('reportedBy');
    if (lostItems.length === 0) return { matches: [], method: 'none' };

    const finalMatches = lostItems.map(lost => {
      const result = matchingLogic.calculateRuleScore(lost, foundItem);
      return { lostItem: lost, ...result };
    }).filter(m => m.score >= 60);

    const matchIds = [];
    for (const m of finalMatches) {
      const match = await upsertMatch(
        m.lostItem._id,
        foundItem._id,
        m.score,
        m.details,
        m.explanation
      );
      await notifyOwner(match);
      await notifyFinder(match);
      matchIds.push(match._id);
    }

    if (matchIds.length === 0) return { matches: [], method: 'none' };

    const populated = await Match.find({ _id: { $in: matchIds } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
      .sort({ score: -1 });

    return { matches: populated, method: 'system' };
  } catch (error) {
    console.error('[Matching] Error:', error.message);
    return { matches: [], method: 'error' };
  }
};

const getMatchesForUser = async (userId) => {
  const lostItems = await Item.find({ reportedBy: userId, type: 'lost', isDeleted: false }).select('_id');
  const foundItems = await Item.find({ reportedBy: userId, type: 'found', isDeleted: false }).select('_id');
  return Match.find({
    status: { $ne: 'resolved' },
    $or: [
      { lostItem: { $in: lostItems.map((i) => i._id) } },
      { foundItem: { $in: foundItems.map((i) => i._id) } },
    ],
  })
    .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
    .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
    .sort({ score: -1, createdAt: -1 });
};

const getMatchById = async (matchId) => {
  return Match.findById(matchId)
    .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email phone department' } })
    .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email phone department' } });
};

module.exports = {
  runMatching,
  runMatchingForLostItem,
  getMatchesForUser,
  getMatchById,
  createMatchChat,
};
