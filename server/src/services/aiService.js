class AIService {
  constructor() {
    this.enabled = false;
  }

  async _callGemini(prompt) {
    return null;
  }

  async analyzeMatch(lostItem, foundItem) {
    return null;
  }

  async askAssistant({ question, lostItem, foundItem }) {
    return { 
      answer: "The AI assistant is currently disabled. Please contact the item finder directly via chat." 
    };
  }

  generateNoMatchExplanation(item, type) {
    const typeLabel = type === 'lost' ? 'lost' : 'found';
    return `Our matching system has analyzed your ${typeLabel} item report for "${item.title}". 
Currently, we haven't found any strong matches in our database. 
We will notify you immediately if a potential match is found in the future.`;
  }

  generateLocalNoMatchExplanation(item) {
    return this.generateNoMatchExplanation(item, item.type);
  }
}

const aiService = new AIService();
module.exports = aiService;
