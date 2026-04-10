const jwt = require('jsonwebtoken');
const Member = require('../models/Member');
const fs = require('fs');
const path = require('path');

// POST /api/member/login
// Members authenticate with their phoneNumber (username) and flatNo (PIN/password)
const memberLogin = async (req, res) => {
    try {
        const { phoneNumber, flatNo } = req.body;

        if (!phoneNumber || !flatNo) {
            return res.status(400).json({
                success: false,
                message: 'Flat number and phone number are required.',
            });
        }

        const phone = phoneNumber.trim();
        const flat  = flatNo.trim();

        if (!phone || !flat) {
            return res.status(400).json({
                success: false,
                message: 'Flat number and phone number cannot be empty.',
            });
        }

        if (!/^\d{10}$/.test(phone)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be exactly 10 digits.',
            });
        }

        // ── Parse flat input ─────────────────────────────────────────────────
        // Supports formats: "A-101", "A101", "a-101", "101" (no wing prefix)
        const wingPrefixMatch = flat.match(/^([A-Ka-k])[-\s]?(.+)$/);

        const escapeRegex = (str) =>
            str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

        // ── Primary query (wing-aware if prefix detected) ────────────────────
        let primaryQuery;
        if (wingPrefixMatch) {
            const detectedWing  = wingPrefixMatch[1].toUpperCase();
            const detectedFlat  = wingPrefixMatch[2].trim();
            primaryQuery = {
                phoneNumber: phone,
                wing:   detectedWing,
                flatNo: { $regex: new RegExp(`^${escapeRegex(detectedFlat)}$`, 'i') },
            };
        } else {
            primaryQuery = {
                phoneNumber: phone,
                flatNo: { $regex: new RegExp(`^${escapeRegex(flat)}$`, 'i') },
            };
        }

        let member = await Member.findOne(primaryQuery);

        // ── Fallback: try matching the complete flat string as-is ────────────
        // (covers cases where the DB stores the full "A-101" as flatNo)
        if (!member && wingPrefixMatch) {
            member = await Member.findOne({
                phoneNumber: phone,
                flatNo: { $regex: new RegExp(`^${escapeRegex(flat)}$`, 'i') },
            });
        }

        if (!member) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials. Please check your flat number and phone number.',
            });
        }

        // Generate JWT — 30-day expiry so members stay logged in until they press Logout
        const token = jwt.sign(
            {
                memberId: member._id,
                wing:     member.wing,
                flatNo:   member.flatNo,
                role:     'member',
            },
            process.env.JWT_SECRET,
            { expiresIn: '30d' }
        );

        res.json({
            success: true,
            token,
            memberId: member._id,
            wing: member.wing,
            flatNo: member.flatNo,
            fullName: member.fullName,
            type: member.type,
            role: 'member',
        });
    } catch (error) {
        console.error('Member Login Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// GET /api/member/profile
const getMemberProfile = async (req, res) => {
    try {
        const member = await Member.findById(req.member.memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }
        res.json({ success: true, data: member });
    } catch (error) {
        console.error('Get Member Profile Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// PUT /api/member/profile
// Members may only update: phoneNumber, flatNo, vehicles, and their attachment file
const updateMemberProfile = async (req, res) => {
    try {
        const member = await Member.findById(req.member.memberId);
        if (!member) {
            return res.status(404).json({ success: false, message: 'Member not found.' });
        }

        // Parse vehicles if sent as a JSON string (FormData)
        let vehicles = req.body.vehicles;
        if (typeof vehicles === 'string') {
            try { vehicles = JSON.parse(vehicles); } catch (e) { vehicles = undefined; }
        }
        let tenantDetails = req.body.tenantDetails;
        if (typeof tenantDetails === 'string') {
            try { tenantDetails = JSON.parse(tenantDetails); } catch (e) { tenantDetails = undefined; }
        }

        const allowedUpdates = ['phoneNumber', 'flatNo', 'email', 'caste', 'vehicles'];
        const updateData = {};

        for (const key of allowedUpdates) {
            const val = key === 'vehicles' ? vehicles : req.body[key];
            if (val !== undefined) updateData[key] = val;
        }

        // Validate phone if provided
        if (updateData.phoneNumber && !/^\d{10}$/.test(updateData.phoneNumber)) {
            return res.status(400).json({
                success: false,
                message: 'Phone number must be exactly 10 digits.',
            });
        }

        // Validate vehicle counts
        if (updateData.vehicles) {
            const { bikes, cars } = updateData.vehicles;
            if (bikes) {
                const count = bikes.count || 0;
                const regs = bikes.registrationNumbers || [];
                if (count > 0 && regs.length !== count) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${count} bike registration number(s), got ${regs.length}.`,
                    });
                }
            }
            if (cars) {
                const count = cars.count || 0;
                const list = cars.list || [];
                if (count > 0 && list.length !== count) {
                    return res.status(400).json({
                        success: false,
                        message: `Expected ${count} car entry(ies), got ${list.length}.`,
                    });
                }
            }
        }

        // Handle attachment upload (replaces old file)
        const attachmentFile =
            req.files && req.files['attachment'] ? req.files['attachment'][0] : null;

        if (attachmentFile) {
            if (member.type === 'owner') {
                updateData.ownerDetails = { index2: attachmentFile.path };
            } else {
                updateData.tenantDetails = {
                    ...(tenantDetails || {}),
                    agreement: attachmentFile.path,
                };
            }
        } else if (member.type === 'tenant' && tenantDetails) {
            // Tenant may update lastDayOfAgreement without replacing file
            updateData.tenantDetails = {
                agreement: member.tenantDetails?.agreement || null,
                lastDayOfAgreement: tenantDetails.lastDayOfAgreement || null,
            };
        }

        const updatedMember = await Member.findByIdAndUpdate(
            req.member.memberId,
            updateData,
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: 'Profile updated successfully.',
            data: updatedMember,
        });
    } catch (error) {
        console.error('Update Member Profile Error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map((e) => e.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = { memberLogin, getMemberProfile, updateMemberProfile };
