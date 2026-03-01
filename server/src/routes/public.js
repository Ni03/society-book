const express = require('express');
const router = express.Router();
const { createMember } = require('../controllers/publicController');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.join(__dirname, '../../uploads/'));
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

// POST /api/public/member
router.post('/member', upload.fields([
    { name: 'index2', maxCount: 1 },
    { name: 'agreement', maxCount: 1 }
]), createMember);

module.exports = router;
