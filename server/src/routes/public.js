const express = require('express');
const router = express.Router();
const { createMember } = require('../controllers/publicController');

const multer = require('multer');

const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/public/member
router.post('/member', upload.fields([
    { name: 'index2', maxCount: 1 },
    { name: 'agreement', maxCount: 1 }
]), createMember);

module.exports = router;

