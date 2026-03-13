const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

// POST /api/auth/login
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: 'Username and password are required.',
            });
        }

        // Find admin by username
        const admin = await Admin.findOne({ username: username.toLowerCase().trim() });
        if (!admin) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            });
        }

        // Compare password
        const isMatch = await admin.comparePassword(password);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials.',
            });
        }

        // Generate JWT
        const token = jwt.sign(
            {
                adminId: admin._id,
                wing: admin.wing,
                role: admin.role,
            },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
        );

        res.json({
            success: true,
            token,
            wing: admin.wing,
            role: admin.role,
            username: admin.username,
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};

// POST /api/auth/change-password  (requires JWT)
const changePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        if (!currentPassword || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Current password and new password are required.',
            });
        }

        if (newPassword.length < 8) {
            return res.status(400).json({
                success: false,
                message: 'New password must be at least 8 characters.',
            });
        }

        if (currentPassword === newPassword) {
            return res.status(400).json({
                success: false,
                message: 'New password must be different from current password.',
            });
        }

        const admin = await Admin.findById(req.admin.adminId);
        if (!admin) {
            return res.status(404).json({ success: false, message: 'Account not found.' });
        }

        const isMatch = await admin.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Current password is incorrect.',
            });
        }

        admin.password = newPassword; // pre-save hook will hash it
        await admin.save();

        res.json({ success: true, message: 'Password changed successfully.' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

module.exports = { login, changePassword };
