const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const { getVapidPublicKey, subscribe, unsubscribe } = require('../controllers/pushController');

// GET /api/push/vapid-public-key — public, no auth needed
router.get('/vapid-public-key', getVapidPublicKey);

// All subscription routes require a valid JWT
router.use(authMiddleware);

// POST /api/push/subscribe
router.post('/subscribe', subscribe);

// POST /api/push/unsubscribe
router.post('/unsubscribe', unsubscribe);

module.exports = router;
