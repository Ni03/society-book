/**
 * sw.js  — Service Worker for Society Book PWA
 *
 * Handles:
 *   • push events  → shows a notification
 *   • notificationclick  → focuses/opens the app
 *
 * iOS support: requires iOS 16.4+ with "Add to Home Screen".
 * Android Chrome: fully supported.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

/* ── Push received ──────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: 'Society Book', body: event.data?.text() ?? 'New notification' };
    }

    const title   = data.title   ?? 'Society Book';
    const options = {
        body:    data.body    ?? '',
        icon:    data.icon    ?? '/vite.svg',
        badge:   data.badge   ?? '/vite.svg',
        tag:     data.tag     ?? 'visitor-update',
        data:    { url: data.url ?? '/' },
        // Keep notification visible until user interacts (Android)
        requireInteraction: data.requireInteraction ?? false,
        // Vibration pattern for Android
        vibrate: [200, 100, 200],
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

/* ── Notification click ─────────────────────────────────────────────────── */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = event.notification.data?.url ?? '/';

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // If a window is already open, focus it and navigate
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.focus();
                        if ('navigate' in client) client.navigate(targetUrl);
                        return;
                    }
                }
                // Otherwise open a new window
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            })
    );
});
