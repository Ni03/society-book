'use strict';

const webPush = require('web-push');
const PushSubscription = require('../models/PushSubscription');

// ── Lazy VAPID initialisation ─────────────────────────────────────────────────
// Called only when a push is about to be sent, not at module-load time.
// This prevents server crashes when env vars aren't set yet (e.g. cold Render deploy).
let _vapidReady = false;
const initVapid = () => {
    if (_vapidReady) return true;

    const subject    = process.env.VAPID_SUBJECT;
    const publicKey  = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.error(
            '[push] VAPID keys not found in environment. ' +
            'Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT in the Render dashboard ' +
            '(or your .env file locally).'
        );
        return false;
    }

    webPush.setVapidDetails(
        subject || 'mailto:admin@societybook.local',
        publicKey,
        privateKey
    );
    _vapidReady = true;
    return true;
};

// ── GET /api/push/vapid-public-key ────────────────────────────────────────────
// Returns the VAPID public key so the browser can subscribe
const getVapidPublicKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(500).json({ success: false, message: 'VAPID not configured on server.' });
    }
    res.json({ success: true, publicKey: key });
};

// ── POST /api/push/subscribe ───────────────────────────────────────────────────
// Saves (or updates) a push subscription for the logged-in admin
const subscribe = async (req, res) => {
    try {
        const { adminId, wing } = req.admin;
        const { endpoint, expirationTime, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
        }

        // Upsert: same admin + same endpoint = update keys
        await PushSubscription.findOneAndUpdate(
            { adminId, endpoint },
            { adminId, wing, endpoint, expirationTime: expirationTime ?? null, keys },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Subscription saved.' });
    } catch (error) {
        console.error('Push subscribe error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ── POST /api/push/unsubscribe ────────────────────────────────────────────────
const unsubscribe = async (req, res) => {
    try {
        const { adminId } = req.admin;
        const { endpoint } = req.body;
        await PushSubscription.deleteOne({ adminId, endpoint });
        res.json({ success: true, message: 'Unsubscribed.' });
    } catch (error) {
        console.error('Push unsubscribe error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

/**
 * sendPushToWing(wing, payload)
 *
 * Sends a push notification to all subscribed admins for a given wing
 * (plus all superadmins whose wing === 'ALL').
 *
 * payload = { title, body, url, tag, requireInteraction }
 */
const sendPushToWing = async (wing, payload) => {
    if (!initVapid()) return;
    try {
        // Find subscriptions for the target wing AND superadmins (wing 'ALL')
        const subscriptions = await PushSubscription.find({
            wing: { $in: [wing, 'ALL'] },
        });

        if (subscriptions.length === 0) return;

        const pushPayload = JSON.stringify({
            title:              payload.title              ?? 'Society Book',
            body:               payload.body               ?? '',
            icon:               '/vite.svg',
            badge:              '/vite.svg',
            tag:                payload.tag                ?? 'visitor-update',
            url:                payload.url                ?? '/',
            requireInteraction: payload.requireInteraction ?? false,
        });

        await Promise.allSettled(
            subscriptions.map(async (sub) => {
                try {
                    await webPush.sendNotification(
                        {
                            endpoint:       sub.endpoint,
                            expirationTime: sub.expirationTime,
                            keys:           sub.keys,
                        },
                        pushPayload
                    );
                } catch (err) {
                    // 410 Gone = subscription expired/revoked — remove it
                    if (err.statusCode === 410 || err.statusCode === 404) {
                        await PushSubscription.deleteOne({ _id: sub._id });
                        console.log(`Removed stale push subscription for admin ${sub.adminId}`);
                    } else {
                        console.error(`Push send failed for sub ${sub._id}:`, err.message);
                    }
                }
            })
        );
    } catch (error) {
        console.error('sendPushToWing error:', error);
    }
};

module.exports = { getVapidPublicKey, subscribe, unsubscribe, sendPushToWing };
