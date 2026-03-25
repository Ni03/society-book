'use strict';

const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
    {
        // Who is visiting
        visitorName: {
            type: String,
            required: [true, 'Visitor name is required'],
            trim: true,
        },
        visitorPhone: {
            type: String,
            default: '',
            trim: true,
        },
        purpose: {
            type: String,
            default: '',
            trim: true,
        },

        // Destination flat
        wing: {
            type: String,
            required: [true, 'Wing is required'],
            uppercase: true,
            trim: true,
        },
        flatNo: {
            type: String,
            required: [true, 'Flat number is required'],
            trim: true,
        },

        // Vehicle details (optional)
        vehicle: {
            regNo: { type: String, default: '', uppercase: true, trim: true },
            type: { type: String, enum: ['2W', '4W', 'none'], default: 'none' },
        },

        // Photo stored as base64 data URL
        photo: {
            type: String, // base64 data URL: "data:image/jpeg;base64,..."
            default: null,
        },

        // Workflow
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'expired', 'archived'],
            default: 'pending',
        },

        // Who logged this entry
        loggedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true,
        },
        loggedByUsername: { type: String, default: '' },

        // Who actioned it (chairman)
        actionedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            default: null,
        },
        actionedAt: { type: Date, default: null },
        rejectReason: { type: String, default: '' },

        // Expiry — default 24 hours from entry time
        expiresAt: {
            type: Date,
            default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
        },

        // Entry / exit timestamps
        entryTime: { type: Date, default: Date.now },
        exitTime: { type: Date, default: null },
    },
    {
        timestamps: true,
    }
);

// Index for fast flat-lookup notifications
visitorSchema.index({ wing: 1, flatNo: 1, status: 1 });
// Index for vehicle search
visitorSchema.index({ 'vehicle.regNo': 1, status: 1, expiresAt: 1 });

const Visitor = mongoose.model('Visitor', visitorSchema);

module.exports = Visitor;
