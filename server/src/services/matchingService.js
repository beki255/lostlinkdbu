const Item = require('../models/Item');
const Match = require('../models/Match');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const aiService = require('./aiService');

const tokenize = (text) => {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2);
};

const wordsToFreq = (tokens) => {
  const freq = {};
  for (const t of tokens) freq[t] = (freq[t] || 0) + 1;
  return freq;
};

const cosineSimilarity = (textA, textB) => {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);
  if (tokensA.length === 0 || tokensB.length === 0) return 0;
  const freqA = wordsToFreq(tokensA);
  const freqB = wordsToFreq(tokensB);
  const allWords = new Set([...Object.keys(freqA), ...Object.keys(freqB)]);
  let dot = 0, magA = 0, magB = 0;
  for (const w of allWords) {
    const a = freqA[w] || 0;
    const b = freqB[w] || 0;
    dot += a * b;
    magA += a * a;
    magB += b * b;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
};

const jaccardSimilarity = (arrA, arrB) => {
  const setA = new Set((arrA || []).map((s) => s.toLowerCase().trim()));
  const setB = new Set((arrB || []).map((s) => s.toLowerCase().trim()));
  if (setA.size === 0 && setB.size === 0) return 0;
  let intersection = 0;
  for (const item of setA) { if (setB.has(item)) intersection++; }
  const union = new Set([...setA, ...setB]);
  return union.size === 0 ? 0 : intersection / union.size;
};

const locationSimilarity = (locA, locB) => {
  const a = (locA || '').toLowerCase();
  const b = (locB || '').toLowerCase();
  if (!a || !b) return 0;
  if (a === b) return 1;
  const tokensA = a.split(/[\s,]+/).filter(Boolean);
  const tokensB = b.split(/[\s,]+/).filter(Boolean);
  let matches = 0;
  for (const ta of tokensA) { if (tokensB.includes(ta)) matches++; }
  return matches / Math.max(tokensA.length, tokensB.length);
};

const timeProximity = (dateA, dateB) => {
  if (!dateA || !dateB) return 0.5;
  const diffDays = Math.abs(new Date(dateA) - new Date(dateB)) / (1000 * 60 * 60 * 24);
  if (diffDays <= 1) return 1;
  if (diffDays <= 3) return 0.8;
  if (diffDays <= 7) return 0.6;
  if (diffDays <= 14) return 0.4;
  if (diffDays <= 30) return 0.2;
  return 0.05;
};

const calculateMatchScore = (lostItem, foundItem) => {
  const categoryScore = lostItem.category?.toLowerCase() === foundItem.category?.toLowerCase() ? 1 : 0;
  const titleScore = cosineSimilarity(lostItem.title, foundItem.title);
  const descriptionScore = cosineSimilarity(lostItem.description, foundItem.description);
  const locationScore = locationSimilarity(lostItem.location, foundItem.location);
  const tagScore = jaccardSimilarity(lostItem.tags, foundItem.tags);
  const timeScore = timeProximity(lostItem.dateOccurred, foundItem.dateOccurred);
  const weightedScore =
    (categoryScore * 20) + (titleScore * 25) + (descriptionScore * 25) +
    (locationScore * 15) + (tagScore * 10) + (timeScore * 5);
  return {
    score: Math.round(weightedScore * 100) / 100,
    details: {
      titleScore: Math.round(titleScore * 100),
      descriptionScore: Math.round(descriptionScore * 100),
      categoryScore: Math.round(categoryScore * 100),
      locationScore: Math.round(locationScore * 100),
      tagScore: Math.round(tagScore * 100),
      timeScore: Math.round(timeScore * 100),
    },
  };
};

const generateFallbackExplanation = (lostItem, foundItem, score, details, language) => {
  const isEnglish = language !== 'am';

  const strong = score >= 85;
  const highDetails = [];
  if (details.categoryScore >= 80) highDetails.push(isEnglish ? 'same category' : 'ተመሳሳይ ምድብ');
  if (details.titleScore >= 60) highDetails.push(isEnglish ? 'similar title' : 'ተመሳሳይ ርዕስ');
  if (details.descriptionScore >= 60) highDetails.push(isEnglish ? 'similar description' : 'ተመሳሳይ መግለጫ');
  if (details.locationScore >= 60) highDetails.push(isEnglish ? 'nearby location' : 'ቅርብ ቦታ');
  if (details.tagScore >= 60) highDetails.push(isEnglish ? 'matching tags' : 'ተመሳሳይ መለያዎች');

  if (isEnglish) {
    let explanation = `Match score: ${Math.round(score)}%. `;
    if (strong) {
      explanation += `This is a strong match! `;
    } else {
      explanation += `This is a potential match. `;
    }
    if (highDetails.length > 0) {
      explanation += `Key similarities: ${highDetails.join(', ')}. `;
    }
    explanation += `The item "${foundItem.title}" was found at ${foundItem.location || 'an unknown location'}. `;
    if (foundItem.reportedBy) {
      explanation += `You can chat with the finder to confirm if this is your item.`;
    }
    return explanation;
  }

  let explanation = `የተመሳሳይነት ውጤት: ${Math.round(score)}%. `;
  if (strong) {
    explanation += `ይህ ጠንካራ ተመሳሳይነት ነው! `;
  } else {
    explanation += `ይህ ሊሆን የሚችል ተመሳሳይነት ነው. `;
  }
  if (highDetails.length > 0) {
    explanation += `ቁልፍ ተመሳሳይነቶች: ${highDetails.join(', ')}. `;
  }
  explanation += `እቃው "${foundItem.title}" የተገኘው በ${foundItem.location || 'ያልታወቀ ቦታ'} ነው.`;
  return explanation;
};

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

const runMatchingForLostItem = async (lostItemId, language = 'en') => {
  try {
    const lostItem = await Item.findById(lostItemId);
    if (!lostItem || lostItem.type !== 'lost') return { matches: [], method: 'none' };

    const foundItems = await Item.find({
      type: 'found',
      status: 'open',
      isDeleted: false,
    }).populate('reportedBy');

    if (foundItems.length === 0) return { matches: [], method: 'none' };

    let aiResults = null;
    try {
      aiResults = await aiService.analyzeMatches(lostItem, foundItems, language);
    } catch (err) {
      console.error('[Matching] AI service failed, using local fallback:', err.message);
    }

    const matches = [];

    if (aiResults && aiResults.length > 0) {
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

        if (ai.score >= 85) {
          await notifyOwner(match);
        }

        matches.push(match);
      }
    } else {
      for (const foundItem of foundItems) {
        const result = calculateMatchScore(lostItem, foundItem);

        if (result.score < 85) continue;

        const explanation = generateFallbackExplanation(
          lostItem, foundItem, result.score, result.details, language
        );

        const match = await upsertMatch(
          lostItem._id,
          foundItem._id,
          result.score,
          result.details,
          explanation
        );

        await notifyOwner(match);
        matches.push(match);
      }
    }

    const populated = await Match.find({ _id: { $in: matches.map((m) => m._id) } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .sort({ score: -1 });

    return { matches: populated, method: aiResults ? 'ai' : 'local' };
  } catch (error) {
    console.error('[Matching] Error:', error.message);
    return { matches: [], method: 'error' };
  }
};

const runMatching = async (foundItemId) => {
  try {
    const foundItem = await Item.findById(foundItemId);
    if (!foundItem || foundItem.type !== 'found') return [];

    const lostItems = await Item.find({ type: 'lost', status: 'open', isDeleted: false }).populate('reportedBy');
    if (lostItems.length === 0) return [];

    const matches = [];
    for (const lostItem of lostItems) {
      const result = calculateMatchScore(lostItem, foundItem);
      if (result.score < 85) continue;

      const explanation = generateFallbackExplanation(lostItem, foundItem, result.score, result.details, 'en');
      const match = await upsertMatch(lostItem._id, foundItem._id, result.score, result.details, explanation);

      await notifyOwner(match);
      matches.push(match);
    }

    return Match.find({ _id: { $in: matches.map((m) => m._id) } })
      .populate({ path: 'lostItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .populate({ path: 'foundItem', populate: { path: 'reportedBy', select: 'name email department' } })
      .sort({ score: -1 });
  } catch (error) {
    console.error('[Matching] Error:', error.message);
    return [];
  }
};

const getMatchesForUser = async (userId) => {
  const userItems = await Item.find({ reportedBy: userId, type: 'lost', isDeleted: false }).select('_id');
  const lostItemIds = userItems.map((i) => i._id);
  return Match.find({ lostItem: { $in: lostItemIds } })
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
  calculateMatchScore,
  runMatching,
  runMatchingForLostItem,
  getMatchesForUser,
  getMatchById,
  createMatchChat,
};
