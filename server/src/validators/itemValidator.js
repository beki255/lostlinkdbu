const Joi = require('joi');

const createItemSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(200).required(),
    description: Joi.string().trim().min(10).max(2000).required(),
    category: Joi.string().trim().required(),
    type: Joi.string().valid('lost', 'found').required(),
    location: Joi.string().trim().required(),
    locationDetails: Joi.object({
      building: Joi.string(),
      room: Joi.string(),
    }),
    tags: Joi.array().items(Joi.string().trim()),
    dateOccurred: Joi.date(),
    isHighValue: Joi.boolean(),
  }),
};

const updateItemSchema = {
  body: Joi.object({
    title: Joi.string().trim().min(3).max(200),
    description: Joi.string().trim().min(10).max(2000),
    category: Joi.string().trim(),
    status: Joi.string().valid('open', 'claimed', 'under_review', 'resolved', 'closed'),
    location: Joi.string().trim(),
    locationDetails: Joi.object({
      building: Joi.string(),
      room: Joi.string(),
    }),
    tags: Joi.array().items(Joi.string().trim()),
    dateOccurred: Joi.date(),
    isHighValue: Joi.boolean(),
  }).min(1),
};

module.exports = { createItemSchema, updateItemSchema };
