/**
 * sw.js  — Service Worker for Resident PWA
 *
 * Handles:
 *   • push events  → shows a rich notification with Approve/Deny actions
 *   • notificationclick  → opens the app at the right visitor page OR
 *                          posts a message so the already-open app shows the popup
 *
 * iOS support: requires iOS 16.4+ with "Add to Home Screen".
 * Android Chrome: fully supported, including action buttons.
 */

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

/* ── Push received ──────────────────────────────────────────────────────── */
self.addEventListener('push', (event) => {
    let data = {};
    try {
        data = event.data ? event.data.json() : {};
    } catch {
        data = { title: 'Resident', body: event.data?.text() ?? 'New notification' };
    }

    const title = data.title ?? 'Resident';
    const isVisitorAlert = !!data.visitorId;

    // Use the URL the server already set (e.g. /member/visitors?visitor=ID for members).
    const deepLink = data.url ?? (data.visitorId
        ? `/member/visitors?visitor=${data.visitorId}`
        : '/');

    const options = {
        body: data.body ?? '',
        icon: data.icon ?? '/vite.svg',
        badge: data.badge ?? '/vite.svg',
        tag: data.tag ?? 'visitor-update',
        data: {
            url: deepLink,
            visitorId: data.visitorId ?? null,
        },
        requireInteraction: data.requireInteraction ?? true,
        vibrate: [200, 100, 200, 100, 200],
        // Action buttons shown on lock screen / notification tray (Android Chrome)
        actions: isVisitorAlert
            ? [
                { action: 'approve', title: '✅ Let In' },
                { action: 'deny', title: '❌ Deny' },
            ]
            : (data.actions ?? []),
    };

    event.waitUntil(self.registration.showNotification(title, options));
});

/* ── Notification clicked (or action button tapped) ─────────────────────── */
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const notifData = event.notification.data ?? {};
    const visitorId = notifData.visitorId ?? null;
    let targetUrl = notifData.url ?? '/';

    // If a native action button was pressed, mark the action in the URL
    // so the React app can act immediately when it (re-)opens.
    const action = event.action; // 'approve' | 'deny' | ''

    // Build the deep-link including any action hint
    if (visitorId) {
        const base = `/member/visitors?visitor=${visitorId}`;
        targetUrl = action ? `${base}&action=${action}` : base;
    }

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList) => {
                // ── App is already open — focus it, navigate, send postMessage ──
                for (const client of clientList) {
                    if ('focus' in client) {
                        client.focus();
                        if ('navigate' in client) client.navigate(targetUrl);
                        // postMessage tells the React app to show the modal instantly
                        if (visitorId) {
                            client.postMessage({
                                type: 'VISITOR_NOTIFICATION_CLICK',
                                visitorId,
                                targetUrl,
                                action,    // 'approve' | 'deny' | '' — app may auto-act
                            });
                        }
                        return;
                    }
                }
                // ── No open window — open a new one; URL params carry the state ──
                if (self.clients.openWindow) {
                    return self.clients.openWindow(targetUrl);
                }
            })
    );
});
