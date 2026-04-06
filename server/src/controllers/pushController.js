'use strict';

const webPush = require('web-push');
const PushSubscription       = require('../models/PushSubscription');
const MemberPushSubscription = require('../models/MemberPushSubscription');

// ── Lazy VAPID initialisation ─────────────────────────────────────────────────
let _vapidReady = false;
const initVapid = () => {
    if (_vapidReady) return true;

    const subject    = process.env.VAPID_SUBJECT;
    const publicKey  = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
        console.error(
            '[push] VAPID keys not found. Add VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT.'
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

// ── Shared helper: send to a list of subscriptions ───────────────────────────
const sendToSubscriptions = async (subscriptions, pushPayload) => {
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
                // 410/404 = expired — remove stale subscription
                if (err.statusCode === 410 || err.statusCode === 404) {
                    const Model = sub.adminId ? PushSubscription : MemberPushSubscription;
                    await Model.deleteOne({ _id: sub._id });
                } else {
                    console.error(`Push failed for sub ${sub._id}:`, err.message);
                }
            }
        })
    );
};

const buildPayload = (payload) =>
    JSON.stringify({
        title:              payload.title              ?? 'Society Book',
        body:               payload.body               ?? '',
        icon:               '/vite.svg',
        badge:              '/vite.svg',
        tag:                payload.tag                ?? 'visitor-update',
        url:                payload.url                ?? '/',
        visitorId:          payload.visitorId          ?? null,
        requireInteraction: payload.requireInteraction ?? false,
    });

// ── GET /api/push/vapid-public-key ────────────────────────────────────────────
const getVapidPublicKey = (req, res) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) {
        return res.status(500).json({ success: false, message: 'VAPID not configured on server.' });
    }
    res.json({ success: true, publicKey: key });
};

// ── POST /api/push/subscribe  (admin) ─────────────────────────────────────────
const subscribe = async (req, res) => {
    try {
        const { adminId, wing } = req.admin;
        const { endpoint, expirationTime, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
        }

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

// ── POST /api/push/unsubscribe  (admin) ───────────────────────────────────────
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

// ── POST /api/member/push/subscribe  (member) ─────────────────────────────────
const subscribeMember = async (req, res) => {
    try {
        const { memberId, wing, flatNo } = req.member;
        const { endpoint, expirationTime, keys } = req.body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ success: false, message: 'Invalid subscription object.' });
        }

        await MemberPushSubscription.findOneAndUpdate(
            { memberId, endpoint },
            { memberId, wing, flatNo, endpoint, expirationTime: expirationTime ?? null, keys },
            { upsert: true, new: true }
        );

        res.json({ success: true, message: 'Member push subscription saved.' });
    } catch (error) {
        console.error('Member push subscribe error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ── POST /api/member/push/unsubscribe  (member) ───────────────────────────────
const unsubscribeMember = async (req, res) => {
    try {
        const { memberId } = req.member;
        const { endpoint } = req.body;
        await MemberPushSubscription.deleteOne({ memberId, endpoint });
        res.json({ success: true, message: 'Unsubscribed.' });
    } catch (error) {
        console.error('Member push unsubscribe error:', error);
        res.status(500).json({ success: false, message: 'Internal server error.' });
    }
};

// ── sendPushToWing(wing, payload) — sends to all admins in that wing ──────────
const sendPushToWing = async (wing, payload) => {
    if (!initVapid()) return;
    try {
        const subscriptions = await PushSubscription.find({
            wing: { $in: [wing, 'ALL'] },
        });
        if (subscriptions.length === 0) return;
        await sendToSubscriptions(subscriptions, buildPayload(payload));
    } catch (error) {
        console.error('sendPushToWing error:', error);
    }
};

// ── sendPushToFlat(wing, flatNo, payload) — sends to the resident of that flat ─
const sendPushToFlat = async (wing, flatNo, payload) => {
    if (!initVapid()) return;
    try {
        const subscriptions = await MemberPushSubscription.find({
            wing:   wing.toUpperCase(),
            flatNo: { $regex: new RegExp(`^${flatNo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        });
        if (subscriptions.length === 0) return;
        await sendToSubscriptions(subscriptions, buildPayload(payload));
    } catch (error) {
        console.error('sendPushToFlat error:', error);
    }
};

module.exports = {
    getVapidPublicKey,
    subscribe,
    unsubscribe,
    subscribeMember,
    unsubscribeMember,
    sendPushToWing,
    sendPushToFlat,
};
