const mongoose = require('mongoose');

/**
 * Stores a Web Push subscription for an admin user.
 * One admin can have multiple devices subscribed.
 * We key on (adminId + endpoint) so re-subscribing a device is idempotent.
 */
const pushSubscriptionSchema = new mongoose.Schema(
    {
        adminId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Admin',
            required: true,
            index: true,
        },
        wing: {
            type: String,
            required: true,
            index: true,
        },
        // The full PushSubscription JSON object from the browser
        endpoint:   { type: String, required: true },
        expirationTime: { type: Number, default: null },
        keys: {
            p256dh: { type: String, required: true },
            auth:   { type: String, required: true },
        },
    },
    { timestamps: true }
);

// Unique per device (endpoint) per admin
pushSubscriptionSchema.index({ adminId: 1, endpoint: 1 }, { unique: true });

module.exports = mongoose.model('PushSubscription', pushSubscriptionSchema);
