/**
 * usePushNotifications.ts
 *
 * Registers the Service Worker and subscribes the current admin to Web Push.
 *
 * iOS 16.4+ requires the page to be installed as a PWA ("Add to Home Screen").
 * Android Chrome works in the browser directly.
 *
 * Call subscribe() after login and unsubscribe() on logout.
 */

import api from '../api/axios';

/** Convert the base64url VAPID public key string → Uint8Array */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
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

export async function subscribePush(): Promise<void> {
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

        // Fetch VAPID public key from server (no auth needed)
        const { data } = await api.get<{ success: boolean; publicKey: string }>('/push/vapid-public-key');
        if (!data.success || !data.publicKey) return;

        const applicationServerKey = urlBase64ToUint8Array(data.publicKey);

        // Check if already subscribed
        let subscription = await swReg.pushManager.getSubscription();
        if (!subscription) {
            subscription = await swReg.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey,
            });
        }

        // Send subscription to backend
        await api.post('/push/subscribe', subscription.toJSON());
        console.info('✅ Push notifications subscribed.');
    } catch (err) {
        console.error('subscribePush error:', err);
    }
}

export async function unsubscribePush(): Promise<void> {
    try {
        const swReg = await getSwRegistration();
        if (!swReg) return;

        const subscription = await swReg.pushManager.getSubscription();
        if (!subscription) return;

        // Tell server to remove this subscription
        await api.post('/push/unsubscribe', { endpoint: subscription.endpoint }).catch(() => {});

        await subscription.unsubscribe();
        _swRegistration = null;
        console.info('Push notifications unsubscribed.');
    } catch (err) {
        console.error('unsubscribePush error:', err);
    }
}
