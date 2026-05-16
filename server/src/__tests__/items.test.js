jest.mock('../middleware/upload', () => ({
  array: jest.fn(() => (req, res, next) => next()),
}));

const request = require('supertest');
const mongoose = require('mongoose');
const { app } = require('../app');
const Item = require('../models/Item');
const AuditLog = require('../models/AuditLog');
const {
  connectTestDB,
  disconnectTestDB,
  clearCollections,
  createTestUser,
  generateToken,
  getAuthHeader,
  validItemPayload,
} = require('./helpers/testHelpers');

let user;
let token;
let authHeader;

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await disconnectTestDB();
});

beforeEach(async () => {
  await clearCollections();
  user = await createTestUser();
  token = generateToken(user);
  authHeader = getAuthHeader(token);
});

describe('POST /api/items - Report Lost/Found Item', () => {
  describe('Authentication', () => {
    it('should return 401 if no token is provided', async () => {
      const res = await request(app)
        .post('/api/items')
        .send(validItemPayload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toMatch(/authentication required/i);
    });

    it('should return 401 if an invalid token is provided', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', 'Bearer invalid-token')
        .send(validItemPayload);

      expect(res.status).toBe(401);
    });
  });

  describe('Validation', () => {
    it('should return 400 when title is missing', async () => {
      const payload = { ...validItemPayload };
      delete payload.title;

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title' }),
        ])
      );
    });

    it('should return 400 when title is less than 3 characters', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ ...validItemPayload, title: 'ab' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'title', message: expect.stringMatching(/at least 3 characters/i) }),
        ])
      );
    });

    it('should return 400 when description is missing', async () => {
      const payload = { ...validItemPayload };
      delete payload.description;

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'description' }),
        ])
      );
    });

    it('should return 400 when description is less than 10 characters', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ ...validItemPayload, description: 'too short' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'description', message: expect.stringMatching(/at least 10 characters/i) }),
        ])
      );
    });

    it('should return 400 when category is missing', async () => {
      const payload = { ...validItemPayload };
      delete payload.category;

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'category' }),
        ])
      );
    });

    it('should return 400 when type is missing', async () => {
      const payload = { ...validItemPayload };
      delete payload.type;

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'type' }),
        ])
      );
    });

    it('should return 400 when type is invalid', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ ...validItemPayload, type: 'stolen' });

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'type' }),
        ])
      );
    });

    it('should return 400 when location is missing', async () => {
      const payload = { ...validItemPayload };
      delete payload.location;

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(400);
      expect(res.body.errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: 'location' }),
        ])
      );
    });

    it('should return 400 when multiple fields are invalid', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ title: 'ab', description: 'short', type: 'lost' });

      expect(res.status).toBe(400);
      const fields = res.body.errors.map((e) => e.field);
      expect(fields).toContain('title');
      expect(fields).toContain('description');
      expect(fields).toContain('category');
      expect(fields).toContain('location');
    });

    it('should accept "found" as a valid type', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ ...validItemPayload, type: 'found' });

      expect(res.status).toBe(201);
      expect(res.body.data.item.type).toBe('found');
    });
  });

  describe('Successful persistence', () => {
    it('should create a lost item and return 201 with the item data', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.item).toBeDefined();
      expect(res.body.data.item.title).toBe(validItemPayload.title);
      expect(res.body.data.item.description).toBe(validItemPayload.description);
      expect(res.body.data.item.category).toBe(validItemPayload.category);
      expect(res.body.data.item.type).toBe('lost');
      expect(res.body.data.item.location).toBe(validItemPayload.location);
    });

    it('should persist the item in the database', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      const itemId = res.body.data.item._id;
      const savedItem = await Item.findById(itemId);

      expect(savedItem).not.toBeNull();
      expect(savedItem.title).toBe(validItemPayload.title);
      expect(savedItem.description).toBe(validItemPayload.description);
      expect(savedItem.category).toBe(validItemPayload.category);
      expect(savedItem.type).toBe('lost');
      expect(savedItem.location).toBe(validItemPayload.location);
    });

    it('should set reportedBy to the authenticated user', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      const itemId = res.body.data.item._id;
      const savedItem = await Item.findById(itemId);

      expect(savedItem.reportedBy.toString()).toBe(user._id.toString());
    });

    it('should default status to "open" for a new item', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      expect(res.body.data.item.status).toBe('open');
    });

    it('should set visibility to "public" for lost items', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ ...validItemPayload, type: 'lost' });

      expect(res.body.data.item.visibility).toBe('public');
    });

    it('should set visibility to "private" for found items', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send({ ...validItemPayload, type: 'found' });

      expect(res.body.data.item.visibility).toBe('private');
    });

    it('should convert comma-separated tags string to array', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      expect(Array.isArray(res.body.data.item.tags)).toBe(true);
      expect(res.body.data.item.tags).toContain('laptop');
      expect(res.body.data.item.tags).toContain('hp');
    });

    it('should handle tags as array directly', async () => {
      const payload = { ...validItemPayload, tags: ['phone', 'samsung'] };

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.item.tags).toEqual(['phone', 'samsung']);
    });

    it('should sanitize HTML characters in text fields', async () => {
      const payload = {
        ...validItemPayload,
        title: 'Laptop <script>alert("xss")</script>',
        description: 'A laptop with <b>bold</b> description & more',
      };

      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body.data.item.title).toBe('Laptop &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
      expect(res.body.data.item.description).toBe('A laptop with &lt;b&gt;bold&lt;/b&gt; description &amp; more');
    });

    it('should create an audit log entry on item creation', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      const itemId = res.body.data.item._id;
      const auditLog = await AuditLog.findOne({ resourceId: itemId });

      expect(auditLog).not.toBeNull();
      expect(auditLog.action).toBe('ITEM_REPORTED');
      expect(auditLog.performedBy.toString()).toBe(user._id.toString());
      expect(auditLog.resource).toBe('Item');
    });

    it('should retain all required fields on the saved document', async () => {
      const res = await request(app)
        .post('/api/items')
        .set('Authorization', authHeader)
        .send(validItemPayload);

      const savedItem = await Item.findById(res.body.data.item._id).lean();

      expect(savedItem.title).toBeDefined();
      expect(savedItem.description).toBeDefined();
      expect(savedItem.category).toBeDefined();
      expect(savedItem.type).toBeDefined();
      expect(savedItem.location).toBeDefined();
      expect(savedItem.reportedBy).toBeDefined();
      expect(savedItem.status).toBeDefined();
      expect(savedItem.visibility).toBeDefined();
    });
  });
});
