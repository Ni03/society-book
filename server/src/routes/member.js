const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

const memberAuthMiddleware = require('../middleware/memberAuth');
const {
    memberLogin,
    getMemberProfile,
    updateMemberProfile,
} = require('../controllers/memberController');
const {
    subscribeMember,
    unsubscribeMember,
    getVapidPublicKey,
} = require('../controllers/pushController');
const {
    getPendingVisitorsForMember,
    approveVisitorByMember,
    rejectVisitorByMember,
    getVisitorHistoryForMember,
    getMemberVisitorPhoto,
} = require('../controllers/visitorController');

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// ── Multer (attachment upload for member self-update) ──────────────────────────
const sanitizeName = (str) =>
    (str || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const wing = (req.member?.wing || '').trim();
        const flatNo = (req.body.flatNo || req.member?.flatNo || '').trim();
        const name = (req.body.fullName || '').trim() || 'Member';
        const type = (req.body.type || '').trim().toLowerCase();
        const docType = type === 'owner' ? 'index2' : 'agreement';

        const public_id = `${wing}-${flatNo}-${name}-${docType}`;

        return {
            folder: 'society_book_uploads',
            public_id: public_id,
            resource_type: 'auto',
        };
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) cb(null, true);
        else cb(new Error('Only PDF, JPG, and PNG files are allowed.'));
    },
});

// ── Public ─────────────────────────────────────────────────────────────────────
// POST /api/member/login
router.post('/login', memberLogin);

// VAPID public key (needed before login to subscribe on load)
router.get('/push/vapid-public-key', getVapidPublicKey);

// ── Protected — all routes below require member JWT ────────────────────────────
router.use(memberAuthMiddleware);

// Profile
router.get('/profile', getMemberProfile);
router.put('/profile', upload.fields([{ name: 'attachment', maxCount: 1 }]), updateMemberProfile);

// Push notifications (member subscribes from their profile page)
router.post('/push/subscribe', subscribeMember);
router.post('/push/unsubscribe', unsubscribeMember);

// Visitor management — members approve/reject their own visitors
router.get('/visitors/pending', getPendingVisitorsForMember);
router.get('/visitors/history', getVisitorHistoryForMember);
router.get('/visitors/:id/photo', getMemberVisitorPhoto);
router.put('/visitors/:id/approve', approveVisitorByMember);
router.put('/visitors/:id/reject', rejectVisitorByMember);

module.exports = router;
