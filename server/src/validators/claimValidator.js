const Joi = require('joi');

const submitClaimSchema = {
  body: Joi.object({
    itemId: Joi.string().regex(/^[0-9a-fA-F]{24}$/).required().messages({
      'string.pattern.base': 'Invalid item ID',
    }),
    description: Joi.string().trim().max(2000).required(),
    proofDetails: Joi.object({
      answers: Joi.array().items(Joi.object({
        question: Joi.string().required(),
        answer: Joi.string().required(),
      })),
      additionalInfo: Joi.string().max(1000),
    }),
  }),
};

const reviewClaimSchema = {
  body: Joi.object({
    status: Joi.string().valid('approved', 'rejected').required(),
    reviewNotes: Joi.string().trim().max(1000),
    aiSuggestion: Joi.object({
      decision: Joi.string().valid('approve', 'reject', 'manual_review'),
      confidence: Joi.number().min(0).max(100),
      explanation: Joi.string(),
    }),
  }),
};

module.exports = { submitClaimSchema, reviewClaimSchema };
