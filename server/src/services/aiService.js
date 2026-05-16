const { GoogleGenerativeAI } = require('@google/generative-ai');
const config = require('../config');

class AIService {
  constructor() {
    const apiKey = config.gemini.apiKey;
    if (!apiKey) {
      console.warn('[Gemini] No API key configured. AI matching will be unavailable.');
      this.genAI = null;
      return;
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.modelName = config.gemini.model;
  }

  _buildPrompt(sourceItem, targetItems, direction = 'lost-to-found') {
    const isLostToFound = direction === 'lost-to-found';
    const sourceLabel = isLostToFound ? 'Lost' : 'Found';
    const targetLabel = isLostToFound ? 'Found' : 'Lost';

    const targetList = targetItems.map((item, i) => `
${targetLabel} Item ${i + 1}:
  Title: ${item.title}
  Description: ${item.description || 'N/A'}
  Category: ${item.category || 'N/A'}
  Location: ${item.location || 'N/A'}
  Tags: ${(item.tags || []).join(', ') || 'N/A'}
  Date: ${item.dateOccurred ? new Date(item.dateOccurred).toISOString().split('T')[0] : 'N/A'}
  Images: ${(item.images || []).length > 0 ? item.images.join(', ') : 'None'}`).join('\n');

    return `You are an AI item matching assistant for a lost and found system. Perform a detailed semantic analysis comparing the following ${sourceLabel.toLowerCase()} item against each ${targetLabel.toLowerCase()} item.

For each pair, analyze these dimensions semantically:
1. **Title & Description**: Understand meaning, not just keywords. Consider synonyms, context, and specific details (brand, color, model, size, material).
2. **Category**: Are the categories compatible or related?
3. **Location**: How close are the locations? Consider campus areas, buildings, landmarks.
4. **Time**: How close are the dates? Items lost/found within similar timeframes are more likely to match.
5. **Tags/Keywords**: Overlap in descriptive tags.

RULES:
- Assign a score 0-100 based on overall semantic similarity
- ONLY include items with score >= 85 (high confidence match)
- Provide a clear, specific explanation of WHY they match — mention exact similarities (e.g., "both are blue iPhone 14s lost in the library cafe")
- If they don't match well, DO NOT include them in results
- Be strict: only high-confidence matches should be returned

${sourceLabel} Item:
  Title: ${sourceItem.title}
  Description: ${sourceItem.description || 'N/A'}
  Category: ${sourceItem.category || 'N/A'}
  Location: ${sourceItem.location || 'N/A'}
  Tags: ${(sourceItem.tags || []).join(', ') || 'N/A'}
  Date: ${sourceItem.dateOccurred ? new Date(sourceItem.dateOccurred).toISOString().split('T')[0] : 'N/A'}
  Images: ${(sourceItem.images || []).length > 0 ? sourceItem.images.join(', ') : 'None'}

${targetLabel} Items to compare:
${targetList}

Return a JSON object with this exact schema:
{
  "matches": [
    {
      "itemIndex": <number>,
      "score": <number 0-100>,
      "explanation": "<detailed explanation of why this is a match>",
      "details": {
        "titleScore": <number 0-100>,
        "descriptionScore": <number 0-100>,
        "categoryScore": <number 0-100>,
        "locationScore": <number 0-100>,
        "tagScore": <number 0-100>,
        "timeScore": <number 0-100>
      }
    }
  ]
}

If NO items match at >=85 confidence, return: {"matches": []}`;
  }

  async _callGemini(prompt) {
    if (!this.genAI) return null;
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: {
          temperature: 0.1,
          responseMimeType: 'application/json',
        },
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      if (!text) return null;
      const cleaned = text.replace(/```(?:json)?\s*/gi, '').trim();
      return JSON.parse(cleaned);
    } catch (error) {
      console.error('[Gemini] Error:', error.message);
      return null;
    }
  }

  _parseResponse(parsed, targetItems) {
    if (!parsed || !Array.isArray(parsed.matches)) return null;
    return parsed.matches
      .filter((m) => m.score >= 85)
      .map((m) => ({
        foundItemIndex: m.itemIndex,
        foundItem: targetItems[m.itemIndex],
        score: Math.round(m.score),
        explanation: m.explanation || '',
        details: m.details || {
          titleScore: 0, descriptionScore: 0, categoryScore: 0,
          locationScore: 0, tagScore: 0, timeScore: 0,
        },
      }));
  }

  async analyze(sourceItem, targetItems, direction = 'lost-to-found') {
    if (!this.genAI) return null;
    const prompt = this._buildPrompt(sourceItem, targetItems, direction);
    const response = await this._callGemini(prompt);
    return this._parseResponse(response, targetItems);
  }

  async analyzeMatches(lostItem, foundItems) {
    return this.analyze(lostItem, foundItems, 'lost-to-found');
  }

  async analyzeFoundItem(foundItem, lostItems) {
    return this.analyze(foundItem, lostItems, 'found-to-lost');
  }

  async generateNoMatchExplanation(item, language = 'en') {
    if (!this.genAI) return null;
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: { temperature: 0.4 },
      });

      const langInstruction = language === 'am'
        ? 'Respond entirely in Amharic (አማርኛ).'
        : 'Respond in English.';

      const prompt = `You are a friendly AI assistant for a university lost and found system called LostLink DBU. A user reported their item but the AI matching system analyzed it and found no strong matches (score below 85% confidence threshold).

${langInstruction}

Item details:
- Title: ${item.title}
- Description: ${item.description || 'N/A'}
- Category: ${item.category || 'N/A'}
- Location: ${item.location || 'N/A'}
- Tags: ${(item.tags || []).join(', ') || 'N/A'}
- Type: ${item.type === 'lost' ? 'Lost' : 'Found'}
- Date: ${item.dateOccurred ? new Date(item.dateOccurred).toISOString().split('T')[0] : 'N/A'}

Generate a friendly, human-like message (2-3 short paragraphs) that:
1. Confirms the AI actively analyzed their "${item.title}" against all items in the system across multiple dimensions (title, description, category, location, tags, time)
2. Mentions specific details from their item (title, category, location) to demonstrate the AI processed their information thoroughly
3. Gently explains that currently no strong matches (85% or higher confidence) were found
4. Reassures them the AI system will keep monitoring and they will be notified immediately when a potential match appears
5. Suggests practical next steps (check back later, keep an eye on their matches page, consider adding more details to their item)
6. Is warm, empathetic, and professional in tone

Keep the tone conversational and encouraging. Do NOT use markdown, bullet points, or asterisks. Write in plain paragraphs. Do not mention the 85% threshold explicitly to the user.`;

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return { explanation: text || generateLocalNoMatchExplanation(item, language) };
    } catch (error) {
      console.error('[Gemini] No-match explanation error:', error.message);
      return null;
    }
  }

  async askAssistant(data) {
    if (!this.genAI) return null;
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        generationConfig: { temperature: 0.3 },
      });
      const context = typeof data.context === 'string' ? JSON.parse(data.context) : data.context;
      const prompt = `You are a helpful AI assistant for a lost and found item matching system.

Context about the matched items:
- Match Score: ${context.matchScore}%
- Lost Item: "${context.lostItem?.title}" - ${context.lostItem?.description || ''}
- Found Item: "${context.foundItem?.title}" - ${context.foundItem?.description || ''}
- Lost Location: ${context.lostItem?.location || 'Unknown'}
- Found Location: ${context.foundItem?.location || 'Unknown'}
- Finder: ${context.foundItem?.finderName || 'Unknown'}
- Owner: ${context.lostItem?.ownerName || 'Unknown'}

The user asks: "${data.question}"

Provide a helpful, friendly, and concise response. If they ask about the match score, explain what makes it a good or bad match. If they ask about next steps, suggest coordinating with the other party. Be conversational and practical.`;
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      return { answer: text || 'I am not sure how to answer that.' };
    } catch (error) {
      console.error('[Gemini] Assistant error:', error.message);
      return null;
    }
  }
}

function generateLocalNoMatchExplanation(item, language) {
  const typeLabel = item.type === 'lost' ? 'lost' : 'found';

  if (language === 'am') {
    return `ሰላም! የLostLink DBU AI ተዛማጅ ሲስተም "${item.title}" የሚለውን እቃዎ በመረጃ ቋታችን ውስጥ ካሉ ሁሉም እቃዎች ጋር በማወዳደር ጥልቅ ትንታኔ አድርጓል።

በርዕስ፣ መግለጫ፣ ምድብ፣ ቦታ እና መለያዎች ላይ በመመስረት የተሟላ ምርመራ ተካሂዷል። በአሁኑ ጊዜ ግን ከ${item.title} ጋር የሚመሳሰል ጠንካራ ተዛማጅ የሆነ እቃ አልተገኘም።

አዳዲስ እቃዎች ሲመዘገቡ ሲስተሙ በቀጣይነት ይከታተላል እና ተዛማጅ ሲገኝ ወዲያውኑ ያሳውቅዎታል። በዚህ መሀል የእቃዎን መግለጫ በመጨመር ወይም በኋላ ላይ ተመልሰው በመፈተሽ የተሻለ ውጤት ሊያገኙ ይችላሉ።`;
  }

  const itemRef = item.title;
  const catInfo = item.category ? ` in the "${item.category}" category` : '';
  const locInfo = item.location ? ` near "${item.location}"` : '';

  return `Hello! The LostLink DBU AI matching system has thoroughly analyzed your ${typeLabel} item "${itemRef}"${catInfo}${locInfo}. Our AI compared it against all items in our database across multiple dimensions including title, description, category, location, tags, and time proximity.

Based on this comprehensive analysis, we currently haven't found any strong matches for your item. This doesn't mean it won't appear — new items are being added regularly, and our system continuously monitors for potential matches.

Here are a few things you can do:
• Keep an eye on your matches page — we'll notify you immediately when a potential match is found
• Consider adding more details to your item description to improve future matching
• Check back after a few days as new items get reported

Rest assured, our AI is working hard to find your ${typeLabel} item!`;
}

module.exports = new AIService();
module.exports.generateLocalNoMatchExplanation = generateLocalNoMatchExplanation;
