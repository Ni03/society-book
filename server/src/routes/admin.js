const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');
const {
    getMembers,
    getMemberById,
    updateMember,
    deleteMember,
    searchByRegistration,
    exportMembersExcel,
} = require('../controllers/adminController');

// All routes require authentication
router.use(authMiddleware);

// GET /api/admin/search?registrationNo=...
router.get('/search', searchByRegistration);

// GET /api/admin/members
router.get('/members', getMembers);

// GET /api/admin/members/export?type=owner&search=...
router.get('/members/export', exportMembersExcel);

// GET /api/admin/members/:id
router.get('/members/:id', getMemberById);

// PUT /api/admin/members/:id
router.put('/members/:id', updateMember);

// DELETE /api/admin/members/:id
router.delete('/members/:id', deleteMember);

module.exports = router;
