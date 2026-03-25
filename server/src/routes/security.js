'use strict';

const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    createVisitor,
    getTodayVisitors,
} = require('../controllers/visitorController');

// Middleware: only 'security' role allowed
const securityOnly = (req, res, next) => {
    if (req.admin.role !== 'security') {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Security supervisor only.',
        });
    }
    next();
};

router.use(authMiddleware);

// POST /api/security/visitors — log a visitor entry
router.post('/visitors', securityOnly, createVisitor);

// GET /api/security/visitors — today's entries
router.get('/visitors', securityOnly, getTodayVisitors);

module.exports = router;
