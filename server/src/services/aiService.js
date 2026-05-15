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
      return await response.json();
    } catch (error) {
      console.error('AI Service error:', error.message);
      return null;
    }
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
      item: {
        title: item.title,
        description: item.description,
        category: item.category,
      },
      claim: {
        description: claim.description,
        proofDetails: claim.proofDetails,
      },
    });
  }

  async getAnalytics() {
    return this._request('/api/analytics', {});
  }
}

module.exports = new AIService();
