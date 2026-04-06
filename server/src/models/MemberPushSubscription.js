const mongoose = require('mongoose');

/**
 * Stores a Web Push subscription for a member (resident).
 * One member can have multiple devices.
 * Keyed on (memberId + endpoint) to make re-subscribing idempotent.
 */
const memberPushSubscriptionSchema = new mongoose.Schema(
    {
        memberId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Member',
            required: true,
            index: true,
        },
        wing: {
            type: String,
            required: true,
            index: true,
        },
        flatNo: {
            type: String,
            required: true,
            index: true,
        },
        endpoint:       { type: String, required: true },
        expirationTime: { type: Number, default: null },
        keys: {
            p256dh: { type: String, required: true },
            auth:   { type: String, required: true },
        },
    },
    { timestamps: true }
);

// Unique per device per member
memberPushSubscriptionSchema.index({ memberId: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('MemberPushSubscription', memberPushSubscriptionSchema);
