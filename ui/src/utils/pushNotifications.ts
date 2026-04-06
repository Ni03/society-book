/**
 * pushNotifications.ts
 *
 * Registers the Service Worker and subscribes the current user to Web Push.
 *
 * - Admins/Chairmen  → /api/push/subscribe
 * - Members/Residents → /api/member/push/subscribe
 *
 * Call subscribePush(role) after login, unsubscribePush(role) on logout.
 */

import api from '../api/axios';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

let _swRegistration: ServiceWorkerRegistration | null = null;

async function getSwRegistration(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) return null;
    if (_swRegistration) return _swRegistration;
    try {
        _swRegistration = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        await navigator.serviceWorker.ready;
        return _swRegistration;
    } catch (err) {
        console.error('SW registration failed:', err);
        return null;
    }
}

/** role = 'member' → uses member push route; anything else → admin push route */
export async function subscribePush(role?: string): Promise<void> {
    try {
        if (!('PushManager' in window)) {
            console.info('Push not supported in this browser.');
            return;
        }

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.info('Push permission denied.');
            return;
        }

        const swReg = await getSwRegistration();
        if (!swReg) return;

        // Fetch VAPID public key — use member endpoint if role is 'member'
        const vapidRoute = role === 'member'
            ? '/member/push/vapid-public-key'
            : '/push/vapid-public-key';

        const { data } = await api.get<{ success: boolean; publicKey: string }>(vapidRoute);
        if (!data.success || !data.publicKey) return;

        const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

        let subscription = await swReg.pushManager.getSubscription();
        if (!subscription) {
            subscription = await swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });
        }

        // Persist subscription on the backend
        const subscribeRoute = role === 'member'
            ? '/member/push/subscribe'
            : '/push/subscribe';

        await api.post(subscribeRoute, subscription.toJSON());
        console.info(`✅ Push subscribed (${role ?? 'admin'}).`);
    } catch (err) {
        console.error('subscribePush error:', err);
    }
}

export async function unsubscribePush(role?: string): Promise<void> {
    try {
        const swReg = await getSwRegistration();
        if (!swReg) return;

        const subscription = await swReg.pushManager.getSubscription();
        if (!subscription) return;

        const unsubscribeRoute = role === 'member'
            ? '/member/push/unsubscribe'
            : '/push/unsubscribe';

        await api.post(unsubscribeRoute, { endpoint: subscription.endpoint }).catch(() => {});
        await subscription.unsubscribe();
        _swRegistration = null;
        console.info('Push notifications unsubscribed.');
    } catch (err) {
        console.error('unsubscribePush error:', err);
    }
}
