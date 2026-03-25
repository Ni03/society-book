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
const {
    getNotifications,
    approveVisitor,
    rejectVisitor,
    archiveVisitor,
    archiveExpired,
    getVisitorHistory,
    getVisitorPhoto,
} = require('../controllers/visitorController');

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

// ── Visitor routes ────────────────────────────────────────────────────────────

// GET /api/admin/visitors/notifications
router.get('/visitors/notifications', getNotifications);

// GET /api/admin/visitors/history
router.get('/visitors/history', getVisitorHistory);

// GET /api/admin/visitors/:id/photo
router.get('/visitors/:id/photo', getVisitorPhoto);

// PUT /api/admin/visitors/:id/approve
router.put('/visitors/:id/approve', approveVisitor);

// PUT /api/admin/visitors/:id/reject
router.put('/visitors/:id/reject', rejectVisitor);

// PUT /api/admin/visitors/:id/archive
router.put('/visitors/:id/archive', archiveVisitor);

// POST /api/admin/visitors/archive-expired
router.post('/visitors/archive-expired', archiveExpired);

module.exports = router;

