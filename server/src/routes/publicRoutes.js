const express = require('express');
const router = express.Router();
const publicController = require('../controllers/publicController');

router.get('/cms/:slug', publicController.getPageBySlug);

module.exports = router;
