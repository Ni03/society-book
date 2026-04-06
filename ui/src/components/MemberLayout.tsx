import React, { useEffect, useState, useCallback, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { Visitor } from '../types';

// ── Context shape passed to child pages via <Outlet context> ──────────────────
export interface MemberLayoutContext {
    openQuickModal:   (visitorId: string) => void;
    refreshVisitors:  () => void;
    pendingCount:     number;
}

const MemberLayout: React.FC = () => {
    const { wing, logout } = useAuth();
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [pendingCount, setPendingCount] = useState(0);

    // ── Quick-action modal state (global — works on any member page) ─────────
    const [quickModal,   setQuickModal]   = useState<Visitor | null>(null);
    const [rejectMode,   setRejectMode]   = useState(false);
    const [rejectReason, setRejectReason] = useState('');
    const [actioningId,  setActioningId]  = useState<string | null>(null);
    const [modalPhoto,   setModalPhoto]   = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);

    // A ref to the refresh callback registered by MemberVisitorsPage
    const refreshRef = useRef<(() => void) | null>(null);
    const registerRefresh = useCallback((fn: () => void) => { refreshRef.current = fn; }, []);

    // ── Poll pending visitor count every 30 s for the alert badge ────────────
    const fetchPendingCount = useCallback(async () => {
        try {
            const res = await api.get('/member/visitors/pending');
            if (res.data.success) setPendingCount((res.data.data as unknown[])?.length ?? 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        fetchPendingCount();
        const id = setInterval(fetchPendingCount, 30_000);
        return () => clearInterval(id);
    }, [fetchPendingCount]);

    // ── Load visitor photo lazily when modal opens ───────────────────────────
    const loadPhoto = useCallback(async (visitorId: string, hasPhoto: boolean) => {
        if (!hasPhoto) return;
        setPhotoLoading(true);
        try {
            const res = await api.get(`/member/visitors/${visitorId}/photo`);
            if (res.data.success && res.data.photo) setModalPhoto(res.data.photo);
        } catch { /* no photo */ }
        finally { setPhotoLoading(false); }
    }, []);

    // ── Open the quick-action modal for a specific visitor ID ────────────────
    const openQuickModal = useCallback(async (visitorId: string) => {
        setModalPhoto(null);
        try {
            const res = await api.get('/member/visitors/pending');
            if (res.data.success) {
                const list = res.data.data as Visitor[];
                setPendingCount(list.length);
                const visitor = list.find(v => v._id === visitorId);
                if (visitor) {
                    setQuickModal(visitor);
                    setRejectMode(false);
                    setRejectReason('');
                    // Lazy-load the photo after modal opens
                    if (visitor.hasPhoto) loadPhoto(visitorId, true);
                    return;
                }
            }
        } catch { /* silent */ }
        toast('Visitor request not found or already actioned.', { icon: 'ℹ️' });
    }, [loadPhoto]);

    // ── React to ?visitor= URL param (notification deep-link, app just opened) ─
    useEffect(() => {
        const visitorId = searchParams.get('visitor');
        if (!visitorId) return;
        setSearchParams({}, { replace: true });
        openQuickModal(visitorId);
    }, [searchParams, setSearchParams, openQuickModal]);

    // ── React to SW postMessage (app already open when notification clicked) ──
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'VISITOR_NOTIFICATION_CLICK' && event.data?.visitorId) {
                const { visitorId, action } = event.data;
                if (action === 'approve') {
                    // User tapped native Approve button — open modal then auto-approve
                    openQuickModal(visitorId).then?.(() => {}).catch?.(() => {});
                    // Small delay so modal state is set before we fire the action
                    setTimeout(() => handleApprove(visitorId), 400);
                } else if (action === 'deny') {
                    // User tapped native Deny button — open modal in reject mode
                    openQuickModal(visitorId);
                    setTimeout(() => setRejectMode(true), 300);
                } else {
                    openQuickModal(visitorId);
                }
            }
        };
        navigator.serviceWorker?.addEventListener('message', handler);
        return () => navigator.serviceWorker?.removeEventListener('message', handler);
    }, [openQuickModal]);

    // ── Close modal helper ───────────────────────────────────────────────────
    const closeModal = () => {
        setQuickModal(null);
        setRejectMode(false);
        setRejectReason('');
        setModalPhoto(null);
    };

    // ── Approve / Reject ─────────────────────────────────────────────────────
    const handleApprove = async (id: string) => {
        setActioningId(id);
        try {
            await api.put(`/member/visitors/${id}/approve`);
            toast.success('✅ Visitor approved! Gate is open.');
            setPendingCount(c => Math.max(0, c - 1));
            closeModal();
            refreshRef.current?.();   // refresh MemberVisitorsPage list if open
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve');
        } finally {
            setActioningId(null);
        }
    };

    const handleReject = async (id: string, reason: string) => {
        setActioningId(id);
        try {
            await api.put(`/member/visitors/${id}/reject`, { reason });
            toast.success('❌ Visitor denied.');
            setPendingCount(c => Math.max(0, c - 1));
            closeModal();
            refreshRef.current?.();   // refresh MemberVisitorsPage list if open
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to reject');
        } finally {
            setActioningId(null);
        }
    };

    const timeLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    };

    const handleLogout = () => { logout(); navigate('/member-login'); };

    // ── Context passed to child routes ───────────────────────────────────────
    const outletCtx: MemberLayoutContext & { registerRefresh: typeof registerRefresh } = {
        openQuickModal,
        refreshVisitors: () => refreshRef.current?.(),
        pendingCount,
        registerRefresh,
    };

    return (
        <div className="app-layout">
            {/* ── Top Navbar ─────────────────────────────────────────────── */}
            <nav className="navbar">
                <div className="navbar__inner">
                    <div className="navbar__brand">
                        <div className="navbar__logo">SB</div>
                        <div>
                            <div className="navbar__title">Society Book</div>
                            <div className="navbar__subtitle">👤 Member Portal</div>
                        </div>
                    </div>
                    <div className="navbar__actions">
                        <div className="navbar__wing-badge">
                            <span>🏢</span>
                            <span>Wing {wing}</span>
                        </div>
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={handleLogout}
                            id="member-layout-logout-btn"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            {/* ── Sidebar + Content ───────────────────────────────────────── */}
            <div className="admin-layout">
                <aside className="sidebar">
                    {/* My Profile */}
                    <NavLink
                        to="/member/profile"
                        className={({ isActive }) =>
                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                        }
                        id="nav-member-profile"
                    >
                        <span>👤</span> My Profile
                    </NavLink>

                    {/* Visitor Alerts — with pending badge */}
                    <NavLink
                        to="/member/visitors"
                        end
                        className={({ isActive }) =>
                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                        }
                        id="nav-member-alerts"
                        style={{ position: 'relative' }}
                    >
                        <span>🔔</span> Visitor Alerts
                        {pendingCount > 0 && (
                            <span style={{
                                position: 'absolute', top: '6px', right: '10px',
                                background: '#ef4444', color: '#fff',
                                fontSize: '0.65rem', fontWeight: 800,
                                borderRadius: '10px', padding: '1px 6px',
                                minWidth: '18px', textAlign: 'center',
                                lineHeight: '16px',
                                boxShadow: '0 0 8px rgba(239,68,68,0.6)',
                                animation: 'pulse 1.5s infinite',
                            }}>
                                {pendingCount}
                            </span>
                        )}
                    </NavLink>

                    {/* Visitor Log */}
                    <NavLink
                        to="/member/visitors/history"
                        className={({ isActive }) =>
                            `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                        }
                        id="nav-member-log"
                    >
                        <span>📋</span> Visitor Log
                    </NavLink>
                </aside>

                <main className="admin-content">
                    <Outlet context={outletCtx} />
                </main>
            </div>

            {/* ── Global quick-action popup modal ─────────────────────────── */}
            {quickModal && (
                <div style={overlayStyle} onClick={closeModal}>
                    <div
                        style={modalStyle}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                <span style={{
                                    background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                                    borderRadius: '8px', padding: '4px 14px',
                                    fontSize: '0.7rem', fontWeight: 800,
                                    color: '#fff', letterSpacing: '0.07em',
                                    animation: 'pulse 1.5s infinite',
                                }}>
                                    ⚡ VISITOR AT GATE
                                </span>
                                <span style={{
                                    fontSize: '0.72rem', color: '#f59e0b', fontWeight: 600,
                                    background: 'rgba(245,158,11,0.12)',
                                    border: '1px solid rgba(245,158,11,0.25)',
                                    borderRadius: '6px', padding: '2px 8px',
                                }}>
                                    ⏳ {timeLeft(quickModal.expiresAt)}
                                </span>
                            </div>
                            <button
                                onClick={closeModal}
                                style={closeBtnStyle}
                            >✕</button>
                        </div>

                        {/* Visitor details row */}
                        <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', alignItems: 'flex-start' }}>

                            {/* Photo or avatar */}
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '14px',
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.12)',
                                display: 'flex', alignItems: 'center',
                                justifyContent: 'center', flexShrink: 0,
                                overflow: 'hidden',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
                            }}>
                                {photoLoading ? (
                                    <div style={{ width: '24px', height: '24px', border: '2px solid #3b82f6', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                                ) : modalPhoto ? (
                                    <img
                                        src={modalPhoto}
                                        alt="Visitor"
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                ) : (
                                    <span style={{ fontSize: '2.2rem' }}>👤</span>
                                )}
                            </div>

                            {/* Info */}
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontWeight: 700, fontSize: '1.15rem', color: '#f1f5f9', marginBottom: '2px' }}>
                                    {quickModal.visitorName}
                                </div>
                                {quickModal.visitorPhone && (
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📞 {quickModal.visitorPhone}</div>
                                )}
                                {quickModal.purpose && (
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📝 {quickModal.purpose}</div>
                                )}
                                {quickModal.vehicle?.regNo && (
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>🚗 {quickModal.vehicle.regNo}</div>
                                )}
                                {quickModal.loggedByUsername && (
                                    <div style={{ color: '#64748b', fontSize: '0.8rem', marginTop: '4px' }}>🛡️ Logged by {quickModal.loggedByUsername}</div>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div style={{ height: '1px', background: 'rgba(255,255,255,0.07)', margin: '0 0 1.1rem' }} />

                        {/* Action area */}
                        {!rejectMode ? (
                            <div style={{ display: 'flex', gap: '0.75rem' }}>
                                <button
                                    onClick={() => handleApprove(quickModal._id)}
                                    disabled={actioningId === quickModal._id}
                                    id={`layout-approve-${quickModal._id}`}
                                    style={{ ...actionBtn('#10b981', '#059669'), flex: 1, padding: '0.9rem', fontSize: '1rem' }}
                                >
                                    {actioningId === quickModal._id ? '⏳ Please wait…' : '✅ Let In'}
                                </button>
                                <button
                                    onClick={() => setRejectMode(true)}
                                    disabled={actioningId === quickModal._id}
                                    id={`layout-reject-${quickModal._id}`}
                                    style={{ ...actionBtn('#ef4444', '#dc2626'), flex: 1, padding: '0.9rem', fontSize: '1rem' }}
                                >
                                    ❌ Deny
                                </button>
                            </div>
                        ) : (
                            <div>
                                <p style={{ color: '#f1f5f9', fontSize: '0.9rem', margin: '0 0 0.5rem' }}>
                                    Reason for denial <span style={{ color: '#64748b' }}>(optional)</span>
                                </p>
                                <textarea
                                    autoFocus
                                    placeholder="e.g. Not expecting anyone, unknown caller…"
                                    value={rejectReason}
                                    onChange={e => setRejectReason(e.target.value)}
                                    rows={2}
                                    style={{
                                        width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px',
                                        boxSizing: 'border-box',
                                        background: 'rgba(255,255,255,0.06)',
                                        border: '1px solid rgba(255,255,255,0.12)',
                                        color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
                                        fontFamily: 'Inter,sans-serif', resize: 'vertical',
                                    }}
                                />
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                                    <button
                                        className="btn btn--secondary"
                                        onClick={() => setRejectMode(false)}
                                    >← Back</button>
                                    <button
                                        onClick={() => handleReject(quickModal._id, rejectReason)}
                                        disabled={actioningId === quickModal._id}
                                        style={{ ...actionBtn('#ef4444', '#dc2626'), flex: 1 }}
                                    >
                                        {actioningId === quickModal._id ? '⏳' : '❌'} Confirm Deny
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Styles ────────────────────────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(8px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 9999,
    animation: 'fadeIn 0.15s ease',
};
const modalStyle: React.CSSProperties = {
    background: 'linear-gradient(160deg, #1a2035 0%, #1e2538 100%)',
    border: '1px solid rgba(249,115,22,0.35)',
    borderRadius: '20px',
    padding: '1.75rem',
    width: '90%', maxWidth: '440px',
    boxShadow: '0 30px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(249,115,22,0.12), 0 0 40px rgba(249,115,22,0.06)',
    animation: 'slideUp 0.2s ease',
};
const closeBtnStyle: React.CSSProperties = {
    background: 'none',
    border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px',
    color: '#94a3b8', cursor: 'pointer', padding: '2px 8px',
    transition: 'background 0.15s',
};
const actionBtn = (from: string, to: string): React.CSSProperties => ({
    padding: '0.5rem 1rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
    background: `linear-gradient(135deg,${from},${to})`, color: '#fff',
    fontWeight: 700, fontSize: '0.9rem',
    boxShadow: `0 4px 16px ${from}55`,
    transition: 'opacity 0.15s, transform 0.1s',
});

export default MemberLayout;
