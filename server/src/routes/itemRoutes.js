const express = require('express');
const router = express.Router();
const itemController = require('../controllers/itemController');
const { authenticate, optionalAuth } = require('../middleware/auth');
const validate = require('../middleware/validate');
const upload = require('../middleware/upload');
const { createItemSchema, updateItemSchema } = require('../validators/itemValidator');

router.get('/', authenticate, itemController.getItems);
router.get('/search', optionalAuth, itemController.searchItems);
router.get('/:id', authenticate, itemController.getItem);

router.post('/',
  authenticate,
  upload.array('images', 5),
  validate(createItemSchema),
  itemController.createItem
);

router.patch('/:id',
  authenticate,
  upload.array('images', 5),
  validate(updateItemSchema),
  itemController.updateItem
);

router.delete('/:id',
  authenticate,
  itemController.deleteItem
);

router.post('/:id/ai-matches',
  authenticate,
  itemController.runAiMatching
);

router.post('/:id/no-match-explanation',
  authenticate,
  itemController.getNoMatchExplanation
);

module.exports = router;
