'use strict';

const Visitor = require('../models/Visitor');
const { sendPushToWing, sendPushToFlat } = require('./pushController');

// ── Helper: auto-expire pending visitors past their expiresAt ─────────────────
const expireOldVisitors = async () => {
    await Visitor.updateMany(
        { status: 'pending', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
    );
    // Also expire approved visitors that have passed their expiry
    await Visitor.updateMany(
        { status: 'approved', expiresAt: { $lt: new Date() } },
        { $set: { status: 'expired' } }
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// SECURITY SUPERVISOR endpoints
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/security/visitors  — log a new visitor
const createVisitor = async (req, res) => {
    try {
        const { adminId, username } = req.admin;
        const {
            visitorName,
            visitorPhone,
            purpose,
            wing,
            flatNo,
            vehicleRegNo,
            vehicleType,
            photo,
            expiryHours,   // optional, default 24
        } = req.body;

        if (!visitorName?.trim()) {
            return res.status(400).json({ success: false, message: 'Visitor name is required.' });
        }
        if (!wing?.trim() || !flatNo?.trim()) {
            return res.status(400).json({ success: false, message: 'Destination wing and flat number are required.' });
        }

        const expiresAt = new Date(
            Date.now() + (parseInt(expiryHours) || 24) * 60 * 60 * 1000
        );

        const visitor = await Visitor.create({
            visitorName: visitorName.trim(),
            visitorPhone: (visitorPhone || '').trim(),
            purpose: (purpose || '').trim(),
            wing: wing.trim().toUpperCase(),
            flatNo: flatNo.trim(),
            vehicle: {
                regNo: (vehicleRegNo || '').trim().toUpperCase().replace(/\s+/g, ''),
                type: vehicleType || 'none',
            },
            photo: photo || null,
            loggedBy: adminId,
            loggedByUsername: username || '',
            expiresAt,
        });

        // Push to the flat's MEMBER (they approve/reject their own visitor)
        sendPushToFlat(visitor.wing, visitor.flatNo, {
            title: '🔔 New Visitor for Your Flat',
            body:  `${visitor.visitorName} is at the gate${visitor.purpose ? ' · ' + visitor.purpose : ''}`,
            tag:       `visitor-pending-${visitor._id}`,
            visitorId: visitor._id.toString(),
            url:       `/member/visitors?visitor=${visitor._id}`,
            requireInteraction: true,
        }).catch(console.error);

        res.status(201).json({
            success: true,
            message: 'Visitor entry created.',
            data: sanitize(visitor),
        });
    } catch (error) {
        console.error('Create Visitor Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/security/visitors  — today's entries for security dashboard
const getTodayVisitors = async (req, res) => {
    try {
        await expireOldVisitors();

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);

        const visitors = await Visitor.find({
            createdAt: { $gte: startOfDay },
        }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: visitors.map(sanitize),
        });
    } catch (error) {
        console.error('Get Today Visitors Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CHAIRMAN (ADMIN) endpoints
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/visitors/notifications  — pending visitors for my wing
const getNotifications = async (req, res) => {
    try {
        await expireOldVisitors();

        const { wing, role } = req.admin;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        const filter = { status: 'pending' };
        if (!isSuperAdmin) filter.wing = wing;

        const visitors = await Visitor.find(filter).sort({ createdAt: -1 });
        const count = visitors.length;

        res.json({
            success: true,
            count,
            data: visitors.map(sanitize),
        });
    } catch (error) {
        console.error('Get Notifications Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/admin/visitors/:id/approve
const approveVisitor = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId, wing, role } = req.admin;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        const visitor = await Visitor.findById(id);
        if (!visitor) {
            return res.status(404).json({ success: false, message: 'Visitor not found.' });
        }
        if (!isSuperAdmin && visitor.wing !== wing) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (visitor.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Visitor is already ${visitor.status}.` });
        }

        visitor.status = 'approved';
        visitor.actionedBy = adminId;
        visitor.actionedAt = new Date();
        await visitor.save();

        // Push notification to the flat's wing admins
        sendPushToWing(visitor.wing, {
            title:     '✅ Visitor Approved',
            body:      `${visitor.visitorName} approved for Flat ${visitor.wing}-${visitor.flatNo}.`,
            tag:       `visitor-${visitor._id}`,
            visitorId: visitor._id.toString(),
            url:       `/admin/visitors/notifications?visitor=${visitor._id}`,
            requireInteraction: false,
        }).catch(console.error);

        res.json({ success: true, message: 'Visitor approved.', data: sanitize(visitor) });
    } catch (error) {
        console.error('Approve Visitor Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/admin/visitors/:id/reject
const rejectVisitor = async (req, res) => {
    try {
        const { id } = req.params;
        const { adminId, wing, role } = req.admin;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';
        const { reason } = req.body;

        const visitor = await Visitor.findById(id);
        if (!visitor) {
            return res.status(404).json({ success: false, message: 'Visitor not found.' });
        }
        if (!isSuperAdmin && visitor.wing !== wing) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        if (visitor.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Visitor is already ${visitor.status}.` });
        }

        visitor.status = 'rejected';
        visitor.actionedBy = adminId;
        visitor.actionedAt = new Date();
        visitor.rejectReason = (reason || '').trim();
        await visitor.save();

        // Push notification to the flat's wing admins
        sendPushToWing(visitor.wing, {
            title:     '❌ Visitor Rejected',
            body:      `${visitor.visitorName} rejected for Flat ${visitor.wing}-${visitor.flatNo}${visitor.rejectReason ? ': ' + visitor.rejectReason : '.'}`,
            tag:       `visitor-${visitor._id}`,
            visitorId: visitor._id.toString(),
            url:       `/admin/visitors/notifications?visitor=${visitor._id}`,
            requireInteraction: false,
        }).catch(console.error);

        res.json({ success: true, message: 'Visitor rejected.', data: sanitize(visitor) });
    } catch (error) {
        console.error('Reject Visitor Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/admin/visitors/:id/archive
const archiveVisitor = async (req, res) => {
    try {
        const { id } = req.params;
        const { wing, role } = req.admin;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

        const visitor = await Visitor.findById(id);
        if (!visitor) {
            return res.status(404).json({ success: false, message: 'Visitor not found.' });
        }
        if (!isSuperAdmin && visitor.wing !== wing) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        visitor.status = 'archived';
        await visitor.save();

        res.json({ success: true, message: 'Visitor archived.' });
    } catch (error) {
        console.error('Archive Visitor Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// POST /api/admin/visitors/archive-expired  — bulk archive all expired
const archiveExpired = async (req, res) => {
    try {
        await expireOldVisitors();
        const result = await Visitor.updateMany(
            { status: { $in: ['expired', 'rejected'] } },
            { $set: { status: 'archived' } }
        );
        res.json({ success: true, message: `Archived ${result.modifiedCount} visitor(s).` });
    } catch (error) {
        console.error('Archive Expired Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/admin/visitors/history?status=all&wing=J&page=1
const getVisitorHistory = async (req, res) => {
    try {
        await expireOldVisitors();

        const { wing: adminWing, role } = req.admin;
        const isSuperAdmin = role === 'superadmin' || adminWing === 'ALL';
        const { status, wing: queryWing, date } = req.query;

        const filter = {};

        // Wing filter
        if (!isSuperAdmin) {
            filter.wing = adminWing;
        } else if (queryWing && queryWing !== 'ALL') {
            filter.wing = queryWing.toUpperCase();
        }

        // Status filter
        if (status && status !== 'all') {
            filter.status = status;
        }

        // Date filter (specific day)
        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const dEnd = new Date(d);
            dEnd.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: d, $lte: dEnd };
        }

        const visitors = await Visitor.find(filter)
            .sort({ createdAt: -1 })
            .limit(200);

        res.json({ success: true, data: visitors.map(sanitize) });
    } catch (error) {
        console.error('Get Visitor History Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// Strip the heavy photo from list responses (return separate endpoint for photo)
const sanitize = (v) => {
    const obj = v.toObject ? v.toObject() : { ...v };
    const hasPhoto = !!obj.photo;
    delete obj.photo; // Don't send base64 in lists — too heavy
    obj.hasPhoto = hasPhoto;
    return obj;
};

// GET /api/admin/visitors/:id/photo  — return just the photo
const getVisitorPhoto = async (req, res) => {
    try {
        const visitor = await Visitor.findById(req.params.id).select('photo wing');
        if (!visitor || !visitor.photo) {
            return res.status(404).json({ success: false, message: 'Photo not found.' });
        }
        const { wing, role } = req.admin;
        const isSuperAdmin = role === 'superadmin' || wing === 'ALL';
        if (!isSuperAdmin && visitor.wing !== wing) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        res.json({ success: true, photo: visitor.photo });
    } catch (error) {
        console.error('Get Photo Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// MEMBER endpoints — residents approve/reject their own visitors
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/member/visitors/pending
const getPendingVisitorsForMember = async (req, res) => {
    try {
        await expireOldVisitors();
        const { wing, flatNo } = req.member;
        const visitors = await Visitor.find({
            wing:   wing.toUpperCase(),
            flatNo: { $regex: new RegExp(`^${flatNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
            status: 'pending',
        }).sort({ createdAt: -1 });
        res.json({ success: true, count: visitors.length, data: visitors.map(sanitize) });
    } catch (error) {
        console.error('Member Get Pending Visitors Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/member/visitors/:id/approve
const approveVisitorByMember = async (req, res) => {
    try {
        const { wing, flatNo } = req.member;
        const visitor = await Visitor.findById(req.params.id);
        if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found.' });

        // Only allow action on visitors for the member's own flat
        const flatMatch = new RegExp(`^${flatNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        if (visitor.wing.toUpperCase() !== wing.toUpperCase() || !flatMatch.test(visitor.flatNo)) {
            return res.status(403).json({ success: false, message: 'This visitor is not for your flat.' });
        }
        if (visitor.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Visitor is already ${visitor.status}.` });
        }

        visitor.status    = 'approved';
        visitor.actionedAt = new Date();
        await visitor.save();

        res.json({ success: true, message: 'Visitor approved.', data: sanitize(visitor) });
    } catch (error) {
        console.error('Member Approve Visitor Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/member/visitors/:id/reject
const rejectVisitorByMember = async (req, res) => {
    try {
        const { wing, flatNo } = req.member;
        const reason = req.body?.reason ?? '';    // body may be absent — safe fallback
        const visitor = await Visitor.findById(req.params.id);
        if (!visitor) return res.status(404).json({ success: false, message: 'Visitor not found.' });

        const flatMatch = new RegExp(`^${flatNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i');
        if (visitor.wing.toUpperCase() !== wing.toUpperCase() || !flatMatch.test(visitor.flatNo)) {
            return res.status(403).json({ success: false, message: 'This visitor is not for your flat.' });
        }
        if (visitor.status !== 'pending') {
            return res.status(400).json({ success: false, message: `Visitor is already ${visitor.status}.` });
        }

        visitor.status      = 'rejected';
        visitor.rejectReason = (reason || '').trim();
        visitor.actionedAt  = new Date();
        await visitor.save();

        res.json({ success: true, message: 'Visitor rejected.', data: sanitize(visitor) });
    } catch (error) {
        console.error('Member Reject Visitor Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/member/visitors/history?status=all&date=2026-04-06
// Returns full visitor log for the logged-in member's own flat only
const getVisitorHistoryForMember = async (req, res) => {
    try {
        await expireOldVisitors();

        const { wing, flatNo } = req.member;
        const { status, date } = req.query;

        const flatRegex = new RegExp(`^${flatNo.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i');

        const filter = {
            wing:   wing.toUpperCase(),
            flatNo: { $regex: flatRegex },
        };

        if (status && status !== 'all') {
            filter.status = status;
        }

        if (date) {
            const d = new Date(date);
            d.setHours(0, 0, 0, 0);
            const dEnd = new Date(d);
            dEnd.setHours(23, 59, 59, 999);
            filter.createdAt = { $gte: d, $lte: dEnd };
        }

        const visitors = await Visitor.find(filter)
            .sort({ createdAt: -1 })
            .limit(200);

        res.json({ success: true, data: visitors.map(sanitize) });
    } catch (error) {
        console.error('Member Visitor History Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/member/visitors/:id/photo
// Only the member whose flat the visitor was logged for can fetch the photo
const getMemberVisitorPhoto = async (req, res) => {
    try {
        const { wing, flatNo } = req.member;
        const visitor = await Visitor.findById(req.params.id).select('photo wing flatNo');
        if (!visitor || !visitor.photo) {
            return res.status(404).json({ success: false, message: 'Photo not found.' });
        }
        const flatRegex = new RegExp(`^${flatNo.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}$`, 'i');
        if (visitor.wing.toUpperCase() !== wing.toUpperCase() || !flatRegex.test(visitor.flatNo)) {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }
        res.json({ success: true, photo: visitor.photo });
    } catch (error) {
        console.error('Member Get Photo Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = {
    createVisitor,
    getTodayVisitors,
    getNotifications,
    approveVisitor,
    rejectVisitor,
    archiveVisitor,
    archiveExpired,
    getVisitorHistory,
    getVisitorPhoto,
    expireOldVisitors,
    getPendingVisitorsForMember,
    approveVisitorByMember,
    rejectVisitorByMember,
    getVisitorHistoryForMember,
    getMemberVisitorPhoto,
};
