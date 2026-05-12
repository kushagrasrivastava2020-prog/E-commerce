const express = require('express');
const router = express.Router();
const controller = require('../controllers/recommendationController');
const { authenticate, optionalAuth } = require('../middleware/auth');

// Event tracking — auth optional (anonymous sessions can still log)
router.post('/events', optionalAuth, controller.track);

// Public reads
router.get('/similar/:productId', controller.similar);
router.get('/trending', controller.trending);

// Authenticated reads/writes
router.get('/preferences', authenticate, controller.getPreferences);
router.put('/preferences', authenticate, controller.setPreferences);
router.get('/for-you', authenticate, controller.forYou);

module.exports = router;
