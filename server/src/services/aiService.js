const config = require('../config');

const GROQ_CHAT_URL = 'https://api.groq.com/openai/v1/chat/completions';

class AIService {
  constructor() {
    this.apiKey = config.groq.apiKey;
    this.modelName = config.groq.model || 'mixtral-8x7b-32768';
    if (!this.apiKey) {
      console.warn('[Groq] No API key configured. AI matching will be unavailable.');
      this.enabled = false;
      return;
    }
    this.enabled = true;
  }

  async _callGroq(prompt, options = {}) {
    if (!this.enabled) return null;

    try {
      const payload = {
        model: this.modelName,
        messages: [
          { role: 'system', content: 'You are a precise matching engine for a Lost and Found system.' },
          { role: 'user', content: prompt }
        ],
        temperature: options.temperature ?? 0.1,
        max_tokens: options.maxOutputTokens ?? 1024,
      };

      const response = await fetch(GROQ_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unable to read error body');
        throw new Error(`[Groq] API error ${response.status}: ${errorText}`);
      }

      return response.json();
    } catch (error) {
      console.error('[Groq] Error:', error.message);
      return null;
    }
  }

  _extractTextFromResponse(responseJson) {
    if (!responseJson) return '';
    if (responseJson.choices?.[0]?.message?.content) {
      return responseJson.choices[0].message.content.trim();
    }
    return JSON.stringify(responseJson);
  }

  _normalizeJsonText(text) {
    if (!text || typeof text !== 'string') return '';
    let cleaned = text.trim();
    cleaned = cleaned.replace(/```(?:json)?/gi, '');
    cleaned = cleaned.replace(/\r\n/g, '\n');
    const match = cleaned.match(/\{[\s\S]*\}$/);
    if (match) {
      cleaned = match[0];
    }
    return cleaned.trim();
  }

  async _callMatcher(prompt) {
    const result = await this._callGroq(prompt, { temperature: 0.1, maxOutputTokens: 1200, topP: 0.95 });
    if (!result) return null;

    const text = this._extractTextFromResponse(result);
    if (!text) return null;

    try {
      return JSON.parse(this._normalizeJsonText(text));
    } catch (error) {
      console.error('[Groq] Parse error:', error.message, 'response:', text);
      return null;
    }
  }

  _buildPrompt(sourceItem, targetItems, direction = 'lost-to-found') {
    const isLostToFound = direction === 'lost-to-found';
    const sourceLabel = isLostToFound ? 'Lost' : 'Found';
    const targetLabel = isLostToFound ? 'Found' : 'Lost';

    const targetList = targetItems.map((item, i) => {
      const tags = (item.tags && Array.isArray(item.tags)) ? item.tags.join(', ') : 'N/A';
      const images = (item.images && Array.isArray(item.images) && item.images.length > 0)
        ? `${item.images.length} image(s)`
        : 'None';
      return `\n${targetLabel} Item ${i + 1}:\n  Title: ${item.title || 'N/A'}\n  Description: ${item.description || 'N/A'}\n  Category: ${item.category || 'N/A'}\n  Location: ${item.location || 'N/A'}\n  Tags: ${tags}\n  Date: ${item.dateOccurred ? new Date(item.dateOccurred).toISOString().split('T')[0] : 'N/A'}\n  Images: ${images}`;
    }).join('\n');

    const sourceDate = sourceItem.dateOccurred
      ? new Date(sourceItem.dateOccurred).toISOString().split('T')[0]
      : 'N/A';
    const sourceTags = (sourceItem.tags && Array.isArray(sourceItem.tags))
      ? sourceItem.tags.join(', ')
      : 'N/A';
    const sourceImages = (sourceItem.images && Array.isArray(sourceItem.images) && sourceItem.images.length > 0)
      ? `${sourceItem.images.length} image(s)`
      : 'None';

    return `You are an expert AI system for matching lost and found items. Your job is to carefully compare items and identify STRONG MATCHES when they describe the SAME PHYSICAL OBJECT.

CRITICAL MATCHING STRATEGY:
When two items contain very similar or identical information (same brand, model, color, location, and date), they are describing the SAME item - score them 87-95%.
Only exclude matches if items are CLEARLY different (different categories, different colors, completely different locations).

DETAILED MATCHING PROCESS:

STEP 1: EXTRACT KEY IDENTIFIERS
From each item description, extract:
- Brand/Manufacturer (Apple, Samsung, Nike, etc.)
- Color(s) - ALL colors mentioned (blue, black, silver, red, etc.)
- Model/Type (iPhone 14 Pro, AirPods Max, backpack, watch, keys, etc.)
- Size (13-inch, large, XL, 15cm, etc.)
- Material (leather, aluminum, plastic, nylon, fabric, metal, etc.)
- Distinctive features (stickers, scratches, dents, engravings, patches, logos, patterns, custom marks)
- Condition (new, used, worn, pristine, damaged, cracked, broken, bent, wet, etc.)
- Image presence and visual cues (if images are available, note that the item has photos and use the image count as supporting evidence)
- Serial numbers or identifying marks if mentioned (e.g., "S/N", "Serial", "Service Tag")
- Owner names or initials if mentioned on the item

CRITICAL SYNONYM RULES:
- Treat "PC", "Computer", and "Laptop" as the EXACT SAME item type.
- Treat "Mobile", "Phone", "Smartphone", and "iPhone/Samsung" (when context suggests phone) as the same category.
- If a Serial Number matches exactly between two reports, score the match at 98-100% immediately.
- If an Owner Name or ID Number matches exactly, score at 95-98%.

STEP 2: COMPARE DIMENSIONS

1. Title Similarity (0-100):
   - Same item type mentioned: High score
   - Brand matches: +15
   - Color matches: +15
   - Model/type matches: +20
   - Different brand/type: Significantly lower score

2. Description Similarity (0-100):
   - All key identifiers match: 90-100
   - Most identifiers match: 70-85
   - Some identifiers match: 40-70
   - Few identifiers match: <40
   - IMPORTANT: If both mention specific details like "blue with sticker", "black with scratch" and they match exactly → 95+

3. Category Match (0-100):
   - Exact category match: 100
   - Related categories: 60-80
   - Different categories: 0-20

4. Location Proximity (0-100):
   - Exact same location: 100
   - Same building/area: 85-95
   - Nearby campus: 60-80
   - Different campus areas: 30-50
   - Off campus: 0-30

5. Tag Overlap (0-100):
   - All tags match: 100
   - Most tags match: 70-90
   - Some tags match: 40-70
   - Few tags match: 0-40

6. Time Proximity (0-100):
   - Same day: 100
   - 1 day apart: 90
   - 2-3 days apart: 75-85
   - Within 1 week: 60-75
   - Within 2 weeks: 40-60
   - More than 2 weeks: <40

STEP 3: CALCULATE OVERALL SCORE

For items that describe the SAME OBJECT:
- Use weighted average of all dimension scores
- Apply bonuses:
  • All key identifiers match exactly: +10
  • Distinctive features match (stickers, damage): +15
  • Color match: +10
  • Both within same location & close date: +15
- Result: Usually 85-98 for same items

STEP 4: OUTPUT THRESHOLD

ONLY include matches with score >= 85
- 85-89: Good match (probably same item)
- 90-95: Very strong match (very likely same item)
- 96-100: Excellent match (definitely same item)

SCORING EXAMPLES:
- Lost: "Blue iPhone 14 with crack on bottom" + Found: "Blue iPhone 14 Pro with bottom crack, library" (same day/next day) = 92-95
- Lost: "Black AirPods Max" + Found: "Black Apple AirPods Max, found in cafe" (same week, same building) = 88-92
- Lost: "Nike backpack red" + Found: "Red Nike bag" (different description but very similar) = 85-88
- Lost: "Blue laptop" + Found: "Red laptop" (different color despite same type) = <85 (exclude)

${sourceLabel} Item:
  Title: ${sourceItem.title || 'N/A'}
  Description: ${sourceItem.description || 'N/A'}
  Category: ${sourceItem.category || 'N/A'}
  Location: ${sourceItem.location || 'N/A'}
  Tags: ${sourceTags}
  Date: ${sourceDate}
  Images: ${sourceImages}

${targetLabel} Items to compare:
${targetList}

Analyze each comparison carefully. Return ONLY valid JSON:
{
  "matches": [
    {
      "itemIndex": <number starting from 0>,
      "score": <85-100 for matches, exclude others>,
      "explanation": "<specific explanation mentioning exact matching details like brand, color, distinctive features, and location/time alignment>",
      "details": {
        "titleScore": <0-100>,
        "descriptionScore": <0-100>,
        "categoryScore": <0-100>,
        "locationScore": <0-100>,
        "tagScore": <0-100>,
        "timeScore": <0-100>
      }
    }
  ]
}

CRITICAL RULES:
- When items clearly describe the SAME object → Score 85+
- Be generous with high-similarity matches
- Be strict about fundamentally different items
- Mention EXACT MATCHING DETAILS in explanation (e.g., "Both Apple iPhone 14 Pro Space Black with visible crack, Library West Wing, found within 24 hours")
- If score < 85, exclude from results
- If no matches qualify, return {"matches": []}`;
  }

  _parseResponse(parsed, targetItems) {
    if (!parsed || !Array.isArray(parsed.matches)) return null;
    return parsed.matches
      .filter((m) => m.score >= 85 && m.itemIndex !== undefined && targetItems[m.itemIndex])
      .map((m) => {
        const targetItem = targetItems[m.itemIndex];
        return {
          foundItemIndex: m.itemIndex,
          lostItem: targetItem,
          foundItem: targetItem,
          score: Math.round(Math.min(Math.max(m.score, 0), 100)),
          explanation: m.explanation && m.explanation.trim() ? m.explanation : '',
          details: m.details && typeof m.details === 'object' ? {
            titleScore: Math.round(m.details.titleScore || 0),
            descriptionScore: Math.round(m.details.descriptionScore || 0),
            categoryScore: Math.round(m.details.categoryScore || 0),
            locationScore: Math.round(m.details.locationScore || 0),
            tagScore: Math.round(m.details.tagScore || 0),
            timeScore: Math.round(m.details.timeScore || 0),
          } : {
            titleScore: 0, descriptionScore: 0, categoryScore: 0,
            locationScore: 0, tagScore: 0, timeScore: 0,
          },
        };
      });
  }

  async analyze(sourceItem, targetItems, direction = 'lost-to-found') {
    if (!this.enabled) return null;
    const prompt = this._buildPrompt(sourceItem, targetItems, direction);
    const response = await this._callMatcher(prompt);
    return this._parseResponse(response, targetItems);
  }

  async analyzeMatches(lostItem, foundItems) {
    return this.analyze(lostItem, foundItems, 'lost-to-found');
  }

  async analyzeFoundItem(foundItem, lostItems) {
    return this.analyze(foundItem, lostItems, 'found-to-lost');
  }

  async generateNoMatchExplanation(item, language = 'en') {
    if (!this.enabled) return null;
    try {
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

      const result = await this._callGroq(prompt, { temperature: 0.4, maxOutputTokens: 300, topP: 0.9 });
      const text = this._extractTextFromResponse(result);
      return { explanation: text || generateLocalNoMatchExplanation(item, language) };
    } catch (error) {
      console.error('[Groq] No-match explanation error:', error.message);
      return null;
    }
  }

  async askAssistant(data) {
    if (!this.enabled) return null;
    try {
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
      const result = await this._callGroq(prompt, { temperature: 0.3, maxOutputTokens: 300, topP: 0.9 });
      const text = this._extractTextFromResponse(result);
      return { answer: text || "hey i'm lost link system developed by DBE cs student. Ask me about match results, next steps, or item details." };
    } catch (error) {
      console.error('[Groq] Assistant error:', error.message);
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
