const express = require('express');
const router = express.Router();
const { createMember } = require('../controllers/publicController');

const multer = require('multer');
const path = require('path');

// Sanitize a string to be safe for use in a filename
const sanitize = (str) =>
    (str || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function (req, file, cb) {
        // req.body fields that appear before the file in the FormData are available here
        const wing = (req.body.wing || '').trim();
        const flatNo = (req.body.flatNo || '').trim();
        const name = (req.body.fullName || '').trim() || 'Member';
        const docType = file.fieldname === 'index2' ? 'index2' : 'agreement';
        const ext = path.extname(file.originalname).toLowerCase() || '';

        // Format: J-101-Shubham Patil-index2.pdf
        const filename = `${wing}-${flatNo}-${name}-${docType}${ext}`;
        cb(null, filename);
    }
});

const upload = multer({ storage: storage });

// POST /api/public/member
router.post('/member', upload.fields([
    { name: 'index2', maxCount: 1 },
    { name: 'agreement', maxCount: 1 }
]), createMember);

module.exports = router;

