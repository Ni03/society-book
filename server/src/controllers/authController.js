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
        });
    } catch (error) {
        console.error('Login Error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error.',
        });
    }
};

module.exports = { login };
