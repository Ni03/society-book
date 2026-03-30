const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const memberAuthMiddleware = require('../middleware/memberAuth');
const { memberLogin, getMemberProfile, updateMemberProfile } = require('../controllers/memberController');

// ── Multer (attachment upload for member self-update) ───────────────────────
const sanitize = (str) =>
    (str || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');

const storage = multer.diskStorage({
    destination: (req, file, cb) =>
        cb(null, path.join(__dirname, '../../uploads/')),
    filename: (req, file, cb) => {
        const wing   = sanitize(req.member?.wing)   || 'Wing';
        const flatNo = sanitize(req.member?.flatNo) || 'Flat';
        const docType = file.fieldname === 'attachment' ? 'Attachment' : 'Doc';
        const ext = path.extname(file.originalname).toLowerCase() || '';
        cb(null, `${wing}${flatNo}-${docType}-${Date.now()}${ext}`);
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
        }
    },
});

// ── Public ───────────────────────────────────────────────────────────────────
// POST /api/member/login
router.post('/login', memberLogin);

// ── Protected (member JWT required) ─────────────────────────────────────────
router.use(memberAuthMiddleware);

// GET /api/member/profile
router.get('/profile', getMemberProfile);

// PUT /api/member/profile  (multipart/form-data — attachment is optional)
router.put('/profile', upload.fields([{ name: 'attachment', maxCount: 1 }]), updateMemberProfile);

module.exports = router;
