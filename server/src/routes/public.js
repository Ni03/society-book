const express = require('express');
const router = express.Router();
const { createMember } = require('../controllers/publicController');

const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const multer = require('multer');

// Sanitize a string to be safe for use in a filename
const sanitize = (str) =>
    (str || '').trim().replace(/\s+/g, '_').replace(/[^A-Za-z0-9_\-]/g, '');

const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const wing = (req.body.wing || '').trim();
        const flatNo = (req.body.flatNo || '').trim();
        const name = (req.body.fullName || '').trim() || 'Member';
        const docType = file.fieldname === 'index2' ? 'index2' : 'agreement';

        // Format: J-101-Shubham Patil-index2
        // Cloudinary auto-appends the correct file extension
        const public_id = `${wing}-${flatNo}-${name}-${docType}`;

        return {
            folder: 'society_book_uploads',
            public_id: public_id,
            resource_type: 'auto', // important to accept PDFs as well as images
        };
    },
});

const upload = multer({ storage: storage });

// POST /api/public/member
router.post('/member', upload.fields([
    { name: 'index2', maxCount: 1 },
    { name: 'agreement', maxCount: 1 }
]), createMember);

module.exports = router;

