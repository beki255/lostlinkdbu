const Joi = require('joi');

const sanitizedString = (min, max) =>
  Joi.string().trim().min(min).max(max)
    .messages({
      'string.min': '{{#label}} must be at least {#limit} characters.',
      'string.max': '{{#label}} cannot exceed {#limit} characters.',
      'string.empty': '{{#label}} is required.',
      'any.required': '{{#label}} is required.',
    });

const createItemSchema = {
  body: Joi.object({
    title: sanitizedString(3, 200).required(),
    description: sanitizedString(10, 2000).required(),
    category: Joi.string().trim().min(2).max(50).required()
      .messages({
        'string.min': 'Category must be at least 2 characters.',
        'string.empty': 'Category is required.',
        'any.required': 'Category is required.',
      }),
    type: Joi.string().valid('lost', 'found').required()
      .messages({
        'any.only': 'Type must be either "lost" or "found".',
        'any.required': 'Type is required.',
      }),
    location: sanitizedString(2, 200).required(),
    locationDetails: Joi.object({
      building: Joi.string().trim().max(100).allow(''),
      room: Joi.string().trim().max(50).allow(''),
    }),
    tags: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(50)),
      Joi.string().trim().max(500)
    ),
    dateOccurred: Joi.date().iso().messages({
      'date.format': 'Date must be a valid ISO date.',
    }),
    isHighValue: Joi.boolean(),
  }),
};

const updateItemSchema = {
  body: Joi.object({
    title: sanitizedString(3, 200),
    description: sanitizedString(10, 2000),
    category: Joi.string().trim().min(2).max(50)
      .messages({
        'string.min': 'Category must be at least 2 characters.',
      }),
    status: Joi.string().valid('open', 'claimed', 'under_review', 'resolved', 'closed')
      .messages({
        'any.only': 'Status must be one of: open, claimed, under_review, resolved, closed.',
      }),
    location: sanitizedString(2, 200),
    locationDetails: Joi.object({
      building: Joi.string().trim().max(100).allow(''),
      room: Joi.string().trim().max(50).allow(''),
    }),
    tags: Joi.alternatives().try(
      Joi.array().items(Joi.string().trim().max(50)),
      Joi.string().trim().max(500)
    ),
    dateOccurred: Joi.date().iso().messages({
      'date.format': 'Date must be a valid ISO date.',
    }),
    isHighValue: Joi.boolean(),
  }).min(1).messages({
    'object.min': 'At least one field must be provided for update.',
  }),
};

module.exports = { createItemSchema, updateItemSchema };
