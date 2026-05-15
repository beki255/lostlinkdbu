const express = require('express');
const router = express.Router();
const claimController = require('../controllers/claimController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { submitClaimSchema, reviewClaimSchema } = require('../validators/claimValidator');

router.use(authenticate);

router.post('/', validate(submitClaimSchema), claimController.submitClaim);
router.get('/', claimController.getClaims);
router.get('/:id', claimController.getClaim);
router.patch('/:id/review',
  authorize('security', 'admin'),
  validate(reviewClaimSchema),
  claimController.reviewClaim
);

module.exports = router;
