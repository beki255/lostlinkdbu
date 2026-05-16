const config = require('../config');

class AIService {
  constructor() {
    this.baseUrl = config.ai.serviceUrl;
    this.apiKey = config.ai.apiKey;
  }

  async _request(endpoint, data) {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        console.error(`AI Service HTTP ${response.status}`);
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error('AI Service error:', error.message);
      return null;
    }
  }

  _buildMatchPrompt(lostItem, foundItems, language) {
    const lang = language === 'am' ? 'Amharic' : 'English';

    const foundList = foundItems.map((f, i) => `
Found Item ${i + 1}:
  Title: ${f.title}
  Description: ${f.description}
  Category: ${f.category || 'N/A'}
  Location: ${f.location || 'N/A'}
  Tags: ${(f.tags || []).join(', ') || 'N/A'}
  Date: ${f.dateOccurred ? new Date(f.dateOccurred).toISOString().split('T')[0] : 'N/A'}
`).join('\n');

    return `You are an AI item matching assistant for a lost and found system. Analyze the following lost item against each found item and determine a match score (0-100) for each pair.

Rules:
- Score 0-100 based on how likely they are the same item
- Consider title similarity, description match, category, location, tags, and time proximity
- ONLY return items with score >= 85 (strong matches)
- Provide a clear, human-readable explanation in ${lang} for why each match scored the way it did
- The explanation should be helpful for a user who lost their item
- Return response as valid JSON ONLY, no markdown, no code blocks

Lost Item:
  Title: ${lostItem.title}
  Description: ${lostItem.description}
  Category: ${lostItem.category || 'N/A'}
  Location: ${lostItem.location || 'N/A'}
  Tags: ${(lostItem.tags || []).join(', ') || 'N/A'}
  Date: ${lostItem.dateOccurred ? new Date(lostItem.dateOccurred).toISOString().split('T')[0] : 'N/A'}

Found Items:
${foundList}

Respond with a JSON object in this exact format (no other text):
{
  "matches": [
    {
      "foundItemIndex": 0,
      "score": 92,
      "explanation": "Your item matches this found item because...",
      "details": {
        "titleScore": 85,
        "descriptionScore": 90,
        "categoryScore": 100,
        "locationScore": 80,
        "tagScore": 70,
        "timeScore": 95
      }
    }
  ]
}

If no items match at >=85, return: {"matches": []}`;
  }

  _parseMatchResponse(raw, foundItems) {
    if (!raw) return null;
    let parsed;
    if (typeof raw === 'string') {
      try {
        const cleaned = raw.replace(/```(?:json)?\s*/gi, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return null;
      }
    } else if (typeof raw === 'object' && raw.matches) {
      parsed = raw;
    } else if (typeof raw === 'object' && raw.choices && raw.choices[0]) {
      try {
        const content = raw.choices[0].message?.content || '';
        const cleaned = content.replace(/```(?:json)?\s*/gi, '').trim();
        parsed = JSON.parse(cleaned);
      } catch {
        return null;
      }
    } else {
      return null;
    }

    if (!parsed || !Array.isArray(parsed.matches)) return null;

    return parsed.matches
      .filter((m) => m.score >= 85)
      .map((m) => ({
        foundItemIndex: m.foundItemIndex,
        foundItem: foundItems[m.foundItemIndex],
        score: Math.round(m.score),
        explanation: m.explanation || '',
        details: m.details || {
          titleScore: 0, descriptionScore: 0, categoryScore: 0,
          locationScore: 0, tagScore: 0, timeScore: 0,
        },
      }));
  }

  async analyzeMatches(lostItem, foundItems, language = 'en') {
    const prompt = this._buildMatchPrompt(lostItem, foundItems, language);

    const response = await this._request('/api/analyze-matches', {
      prompt,
      language,
      temperature: 0.2,
      maxTokens: 2000,
    });

    const parsed = this._parseMatchResponse(response, foundItems);
    if (parsed) return parsed;

    if (response && response.choices && response.choices[0]) {
      const content = response.choices[0].message?.content || '';
      const cleaned = content.replace(/```(?:json)?\s*/gi, '').trim();
      try {
        const parsed2 = JSON.parse(cleaned);
        if (parsed2 && Array.isArray(parsed2.matches)) {
          return parsed2.matches
            .filter((m) => m.score >= 85)
            .map((m) => ({
              foundItemIndex: m.foundItemIndex,
              foundItem: foundItems[m.foundItemIndex],
              score: Math.round(m.score),
              explanation: m.explanation || '',
              details: m.details || {
                titleScore: 0, descriptionScore: 0, categoryScore: 0,
                locationScore: 0, tagScore: 0, timeScore: 0,
              },
            }));
        }
      } catch {}
    }

    return null;
  }

  async findMatches(lostItem) {
    return this._request('/api/match', {
      title: lostItem.title,
      description: lostItem.description,
      category: lostItem.category,
      location: lostItem.location,
      tags: lostItem.tags,
    });
  }

  async smartSearch(query) {
    return this._request('/api/search', { query });
  }

  async analyzeClaim(item, claim) {
    return this._request('/api/verify-claim', {
      item: { title: item.title, description: item.description, category: item.category },
      claim: { description: claim.description, proofDetails: claim.proofDetails },
    });
  }

  async getAnalytics() {
    return this._request('/api/analytics', {});
  }

  async askAssistant(data) {
    return this._request('/api/assistant', data);
  }
}

module.exports = new AIService();
