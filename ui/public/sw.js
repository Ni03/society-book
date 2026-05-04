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

// ── Cache identity ────────────────────────────────────────────────────────────
const CACHE_NAME = 'resident-pwa-v1';

// ── Install: pre-cache the app shell ─────────────────────────────────────────
self.addEventListener('install', (e) => {
    e.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.add('/')));
    self.skipWaiting();
});

// ── Activate: wipe old caches, claim open tabs, notify them to reload ─────────
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
            .then(() => self.clients.claim())
            .then(() =>
                self.clients.matchAll({ type: 'window' }).then((clients) =>
                    clients.forEach((c) => c.postMessage({ type: 'SW_UPDATED' }))
                )
            )
    );
});

// ── Fetch: network-first for HTML, cache-first for hashed assets ──────────────
self.addEventListener('fetch', (e) => {
    const { request } = e;
    const url = new URL(request.url);

    // Only handle same-origin GETs; skip API calls
    if (request.method !== 'GET' || url.origin !== self.location.origin) return;
    if (url.pathname.startsWith('/api/')) return;

    // Navigation → always try network first so latest index.html is served
    if (request.mode === 'navigate') {
        e.respondWith(
            fetch(request)
                .then((res) => {
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
                    return res;
                })
                .catch(() => caches.match('/'))
        );
        return;
    }

    // Hashed assets (JS/CSS/fonts/images) → cache-first, fill on miss
    if (/\.(js|css|woff2?|png|jpg|jpeg|svg|ico|webp)(\?.*)?$/.test(url.pathname)) {
        e.respondWith(
            caches.match(request).then((cached) => {
                if (cached) return cached;
                return fetch(request).then((res) => {
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, res.clone()));
                    return res;
                });
            })
        );
    }
});



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
