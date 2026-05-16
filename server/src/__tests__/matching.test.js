const mongoose = require('mongoose');
const { calculateMatchScore } = require('../services/matchingService');
const {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
} = require('./helpers/testHelpers');

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
});

const baseLost = {
  title: 'Black HP Laptop 15 inch',
  description: 'A black HP laptop with a sticker of a cat on the cover. Lost in the library computer lab near the window.',
  category: 'electronics',
  location: 'Library, 2nd Floor, Computer Lab',
  tags: ['laptop', 'hp', 'black'],
  dateOccurred: new Date('2025-01-15'),
};

const baseFound = {
  title: 'Black HP Laptop with Stickers',
  description: 'Found a black HP laptop with a cat sticker on it. Left in the computer lab by the window.',
  category: 'electronics',
  location: 'Library, 2nd Floor, Computer Lab',
  tags: ['laptop', 'hp', 'stickers'],
  dateOccurred: new Date('2025-01-16'),
};

const unrelatedFound = {
  title: 'Blue Water Bottle',
  description: 'A blue plastic water bottle, found near the cafeteria entrance.',
  category: 'accessories',
  location: 'Cafeteria, Ground Floor',
  tags: ['bottle', 'water', 'blue'],
  dateOccurred: new Date('2025-01-20'),
};

describe('calculateMatchScore', () => {
  it('should return a high score for matching items', () => {
    const result = calculateMatchScore(baseLost, baseFound);
    expect(result.score).toBeGreaterThanOrEqual(70);
    expect(result.details).toBeDefined();
    expect(result.details.categoryScore).toBe(100);
    expect(result.details.titleScore).toBeGreaterThan(0);
  });

  it('should return a very high score for nearly identical items', () => {
    const lost = {
      ...baseLost,
      title: 'Black HP Laptop with Stickers',
      description: 'A black HP laptop with a cat sticker on it. Lost in the library computer lab by the window.',
    };
    const result = calculateMatchScore(lost, baseFound);
    expect(result.score).toBeGreaterThanOrEqual(85);
  });

  it('should return a low score for unrelated items', () => {
    const result = calculateMatchScore(baseLost, unrelatedFound);
    expect(result.score).toBeLessThan(50);
    expect(result.details.categoryScore).toBe(0);
  });

  it('should give category exact match full credit', () => {
    const lost = { ...baseLost, category: 'electronics' };
    const found = { ...baseFound, category: 'electronics' };
    const result = calculateMatchScore(lost, found);
    expect(result.details.categoryScore).toBe(100);
  });

  it('should handle empty tags gracefully', () => {
    const lost = { ...baseLost, tags: [] };
    const found = { ...baseFound, tags: [] };
    const result = calculateMatchScore(lost, found);
    expect(result.score).toBeGreaterThan(0);
  });

  it('should return score between 0 and 100', () => {
    const result = calculateMatchScore(baseLost, unrelatedFound);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });
});
