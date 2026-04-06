import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { Visitor } from '../types';

const STATUS_COLOR: Record<string, string> = {
    pending:  '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    expired:  '#6b7280',
    archived: '#374151',
};

const VisitorNotificationsPage: React.FC = () => {
    const [visitors,     setVisitors]     = useState<Visitor[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [actioningId,  setActioningId]  = useState<string | null>(null);
    const [rejectModal,  setRejectModal]  = useState<Visitor | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [photoModal,   setPhotoModal]   = useState<string | null>(null);
    const [photoLoading, setPhotoLoading] = useState(false);

    // Quick-action popup triggered by push notification click
    const [quickModal,    setQuickModal]    = useState<Visitor | null>(null);
    const [quickPhotoUrl, setQuickPhotoUrl] = useState<string | null>(null);

    const [searchParams, setSearchParams] = useSearchParams();
    const visitorsRef  = useRef<Visitor[]>([]);    // mirror for SW message handler
    visitorsRef.current = visitors;

    // ── Fetch ─────────────────────────────────────────────────────────────────
    const fetchNotifications = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/visitors/notifications');
            if (res.data.success) setVisitors(res.data.data);
        } catch {
            toast.error('Failed to load notifications');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // ── Open quick modal by visitorId ─────────────────────────────────────────
    const openQuickModal = useCallback(async (visitorId: string) => {
        // Try from already-loaded list first
        const existing = visitorsRef.current.find(v => v._id === visitorId);
        if (existing) {
            setQuickModal(existing);
            setQuickPhotoUrl(null);
            if (existing.hasPhoto) {
                const res = await api.get(`/admin/visitors/${visitorId}/photo`).catch(() => null);
                if (res?.data?.success) setQuickPhotoUrl(res.data.photo);
            }
            return;
        }
        // Fetch individually (e.g. page was just opened from notification)
        try {
            const res = await api.get('/admin/visitors/notifications');
            if (res.data.success) {
                setVisitors(res.data.data);
                const v = (res.data.data as Visitor[]).find(v => v._id === visitorId);
                if (v) {
                    setQuickModal(v);
                    setQuickPhotoUrl(null);
                    if (v.hasPhoto) {
                        const pRes = await api.get(`/admin/visitors/${visitorId}/photo`).catch(() => null);
                        if (pRes?.data?.success) setQuickPhotoUrl(pRes.data.photo);
                    }
                }
            }
        } catch {/* silent */}
    }, []);

    // ── React to ?visitor=<id> URL param (set by SW deep-link on click) ───────
    useEffect(() => {
        const visitorId = searchParams.get('visitor');
        if (!visitorId) return;
        // Remove the param from URL so refresh doesn't re-open
        setSearchParams({}, { replace: true });
        openQuickModal(visitorId);
    }, [searchParams, setSearchParams, openQuickModal]);

    // ── React to SW postMessage (app already open when notification is clicked) ─
    useEffect(() => {
        const handler = (event: MessageEvent) => {
            if (event.data?.type === 'VISITOR_NOTIFICATION_CLICK' && event.data?.visitorId) {
                openQuickModal(event.data.visitorId);
            }
        };
        navigator.serviceWorker?.addEventListener('message', handler);
        return () => navigator.serviceWorker?.removeEventListener('message', handler);
    }, [openQuickModal]);

    // ── Actions ───────────────────────────────────────────────────────────────
    const handleApprove = async (id: string, fromQuick = false) => {
        setActioningId(id);
        try {
            await api.put(`/admin/visitors/${id}/approve`);
            toast.success('✅ Visitor approved!');
            setVisitors(prev => prev.filter(v => v._id !== id));
            if (fromQuick) setQuickModal(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to approve');
        } finally {
            setActioningId(null);
        }
    };

    const handleRejectSubmit = async () => {
        if (!rejectModal) return;
        setActioningId(rejectModal._id);
        try {
            await api.put(`/admin/visitors/${rejectModal._id}/reject`, { reason: rejectReason });
            toast.success('❌ Visitor rejected');
            setVisitors(prev => prev.filter(v => v._id !== rejectModal._id));
            setRejectModal(null);
            setRejectReason('');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to reject');
        } finally {
            setActioningId(null);
        }
    };

    // Quick-modal reject
    const handleQuickReject = async (reason: string) => {
        if (!quickModal) return;
        setActioningId(quickModal._id);
        try {
            await api.put(`/admin/visitors/${quickModal._id}/reject`, { reason });
            toast.success('❌ Visitor rejected');
            setVisitors(prev => prev.filter(v => v._id !== quickModal._id));
            setQuickModal(null);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to reject');
        } finally {
            setActioningId(null);
        }
    };

    const viewPhoto = async (visitor: Visitor) => {
        if (!visitor.hasPhoto) { toast('No photo for this visitor'); return; }
        setPhotoLoading(true);
        try {
            const res = await api.get(`/admin/visitors/${visitor._id}/photo`);
            if (res.data.success) setPhotoModal(res.data.photo);
        } catch {
            toast.error('Could not load photo');
        } finally {
            setPhotoLoading(false);
        }
    };

    const timeLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    };

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <h1 className="page-header__title">🔔 Visitor Notifications</h1>
                <p className="page-header__subtitle">
                    {loading ? 'Checking…' : visitors.length === 0
                        ? 'No pending visitors'
                        : `${visitors.length} visitor${visitors.length > 1 ? 's' : ''} awaiting approval`}
                </p>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1rem' }}>
                <button className="btn btn--secondary btn--sm" onClick={fetchNotifications}>
                    🔄 Refresh
                </button>
            </div>

            {loading ? (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span className="loading-text">Loading notifications…</span>
                </div>
            ) : visitors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">✅</div>
                    <h3 className="empty-state__title">All clear!</h3>
                    <p>No visitors awaiting approval for your wing.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visitors.map(v => (
                        <div key={v._id} style={notifCardStyle}>
                            {/* Header row */}
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                        <span style={{ fontSize: '1.25rem' }}>👤</span>
                                        <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>{v.visitorName}</span>
                                        {v.visitorPhone && <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📞 {v.visitorPhone}</span>}
                                    </div>
                                    <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                                        🏢 Flat {v.wing}-{v.flatNo}
                                        {v.purpose && <> &nbsp;·&nbsp; {v.purpose}</>}
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <span style={{ ...badgeStyle, background: STATUS_COLOR[v.status] + '22', color: STATUS_COLOR[v.status], borderColor: STATUS_COLOR[v.status] + '55' }}>
                                        {v.status.toUpperCase()}
                                    </span>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>⏳ {timeLeft(v.expiresAt)}</div>
                                </div>
                            </div>

                            {/* Vehicle & info */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem', marginTop: '0.75rem' }}>
                                {v.vehicle?.regNo ? (
                                    <InfoChip icon="🚗" label={`${v.vehicle.type !== 'none' ? v.vehicle.type + ' · ' : ''}${v.vehicle.regNo}`} color="#1d4ed8" />
                                ) : (
                                    <InfoChip icon="🚶" label="No vehicle" color="#374151" />
                                )}
                                <InfoChip icon="🕐" label={new Date(v.entryTime).toLocaleString()} color="#4c1d95" />
                                {v.loggedByUsername && <InfoChip icon="🛡️" label={`by ${v.loggedByUsername}`} color="#064e3b" />}
                                {v.hasPhoto && (
                                    <button onClick={() => viewPhoto(v)} disabled={photoLoading} style={smallBtnStyle('#1e3a5f')}>
                                        {photoLoading ? '⏳' : '📷'} View Photo
                                    </button>
                                )}
                            </div>

                            {/* Action buttons */}
                            {v.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                                    <button
                                        onClick={() => handleApprove(v._id)}
                                        disabled={actioningId === v._id}
                                        id={`approve-visitor-${v._id}`}
                                        style={actionBtnStyle('#10b981', '#059669')}
                                    >
                                        {actioningId === v._id ? '⏳' : '✅'} Approve
                                    </button>
                                    <button
                                        onClick={() => { setRejectModal(v); setRejectReason(''); }}
                                        disabled={actioningId === v._id}
                                        id={`reject-visitor-${v._id}`}
                                        style={actionBtnStyle('#ef4444', '#dc2626')}
                                    >
                                        ❌ Reject
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* ── Reject reason modal ────────────────────────────────── */}
            {rejectModal && (
                <div style={overlayStyle} onClick={() => setRejectModal(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 0.5rem', color: '#f1f5f9' }}>❌ Reject Visitor</h3>
                        <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: '0 0 1rem' }}>
                            Rejecting <strong style={{ color: '#f1f5f9' }}>{rejectModal.visitorName}</strong>
                        </p>
                        <textarea
                            placeholder="Reason for rejection (optional)"
                            value={rejectReason}
                            onChange={e => setRejectReason(e.target.value)}
                            rows={3}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', justifyContent: 'flex-end' }}>
                            <button className="btn btn--secondary" onClick={() => setRejectModal(null)}>Cancel</button>
                            <button onClick={handleRejectSubmit} disabled={!!actioningId} style={actionBtnStyle('#ef4444', '#dc2626')}>
                                {actioningId ? '⏳' : '❌'} Confirm Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Photo modal ─────────────────────────────────────────── */}
            {photoModal && (
                <div style={overlayStyle} onClick={() => setPhotoModal(null)}>
                    <div style={{ ...modalStyle, maxWidth: '480px' }} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: '#f1f5f9' }}>📷 Visitor Photo</h3>
                            <button onClick={() => setPhotoModal(null)} style={grayCloseStyle}>✕</button>
                        </div>
                        <img src={photoModal} alt="Visitor" style={{ width: '100%', borderRadius: '10px', objectFit: 'contain', maxHeight: '420px' }} />
                    </div>
                </div>
            )}

            {/* ── Quick-action modal (opened by push notification click) ──── */}
            {quickModal && (
                <QuickActionModal
                    visitor={quickModal}
                    photo={quickPhotoUrl}
                    actioningId={actioningId}
                    onApprove={() => handleApprove(quickModal._id, true)}
                    onReject={handleQuickReject}
                    onClose={() => setQuickModal(null)}
                />
            )}
        </div>
    );
};

// ── Quick-action modal component ─────────────────────────────────────────────
interface QuickActionModalProps {
    visitor:    Visitor;
    photo:      string | null;
    actioningId: string | null;
    onApprove:  () => void;
    onReject:   (reason: string) => void;
    onClose:    () => void;
}

const QuickActionModal: React.FC<QuickActionModalProps> = ({
    visitor, photo, actioningId, onApprove, onReject, onClose,
}) => {
    const [showReject, setShowReject] = useState(false);
    const [reason, setReason]         = useState('');
    const busy = actioningId === visitor._id;

    const timeLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div
                style={{
                    ...modalStyle,
                    maxWidth: '460px',
                    border: '1px solid rgba(249,115,22,0.4)',
                    boxShadow: '0 25px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(249,115,22,0.2)',
                }}
                onClick={e => e.stopPropagation()}
            >
                {/* Title */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                            background: 'linear-gradient(135deg,#f59e0b,#ef4444)',
                            borderRadius: '8px',
                            padding: '4px 8px',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            color: '#fff',
                            letterSpacing: '0.05em',
                        }}>
                            ⚡ ACTION REQUIRED
                        </span>
                        <h3 style={{ margin: 0, color: '#f1f5f9', fontSize: '1rem' }}>Visitor Approval</h3>
                    </div>
                    <button onClick={onClose} style={grayCloseStyle}>✕</button>
                </div>

                {/* Photo + details */}
                <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', alignItems: 'flex-start' }}>
                    {photo ? (
                        <img
                            src={photo}
                            alt="Visitor"
                            style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0, border: '1px solid rgba(255,255,255,0.1)' }}
                        />
                    ) : (
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '10px', background: 'rgba(255,255,255,0.05)',
                            border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center',
                            justifyContent: 'center', fontSize: '2rem', flexShrink: 0,
                        }}>
                            👤
                        </div>
                    )}
                    <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1.1rem', color: '#f1f5f9', marginBottom: '0.25rem' }}>
                            {visitor.visitorName}
                        </div>
                        {visitor.visitorPhone && (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📞 {visitor.visitorPhone}</div>
                        )}
                        <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '0.25rem' }}>
                            🏢 Wing {visitor.wing} · Flat {visitor.flatNo}
                        </div>
                        {visitor.purpose && (
                            <div style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📝 {visitor.purpose}</div>
                        )}
                        {visitor.vehicle?.regNo && (
                            <div style={{ marginTop: '0.3rem' }}>
                                <InfoChip icon="🚗" label={visitor.vehicle.regNo} color="#1d4ed8" />
                            </div>
                        )}
                        <div style={{ fontSize: '0.75rem', color: '#f59e0b', marginTop: '0.4rem', fontWeight: 600 }}>
                            ⏳ {timeLeft(visitor.expiresAt)}
                        </div>
                    </div>
                </div>

                {/* Action area */}
                {!showReject ? (
                    <div style={{ display: 'flex', gap: '0.75rem' }}>
                        <button
                            onClick={onApprove}
                            disabled={busy}
                            id={`quick-approve-${visitor._id}`}
                            style={{ ...actionBtnStyle('#10b981', '#059669'), flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                        >
                            {busy ? '⏳' : '✅'} Approve
                        </button>
                        <button
                            onClick={() => setShowReject(true)}
                            disabled={busy}
                            id={`quick-reject-${visitor._id}`}
                            style={{ ...actionBtnStyle('#ef4444', '#dc2626'), flex: 1, padding: '0.75rem', fontSize: '1rem' }}
                        >
                            ❌ Reject
                        </button>
                    </div>
                ) : (
                    <div>
                        <p style={{ color: '#f1f5f9', margin: '0 0 0.5rem', fontSize: '0.9rem' }}>
                            Reason for rejection <span style={{ color: '#64748b' }}>(optional)</span>
                        </p>
                        <textarea
                            autoFocus
                            placeholder="e.g. Resident not home, unknown person…"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                            rows={2}
                            style={{ ...inputStyle, resize: 'vertical' }}
                        />
                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.75rem' }}>
                            <button
                                className="btn btn--secondary"
                                onClick={() => { setShowReject(false); setReason(''); }}
                            >
                                ← Back
                            </button>
                            <button
                                onClick={() => onReject(reason)}
                                disabled={busy}
                                style={{ ...actionBtnStyle('#ef4444', '#dc2626'), flex: 1 }}
                            >
                                {busy ? '⏳' : '❌'} Confirm Reject
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const InfoChip: React.FC<{ icon: string; label: string; color: string }> = ({ icon, label, color }) => (
    <span style={{
        fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px',
        background: color + '22', border: `1px solid ${color}44`, color: '#cbd5e1',
        display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}>
        {icon} {label}
    </span>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const notifCardStyle: React.CSSProperties = {
    background: 'rgba(30,37,60,0.95)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px', padding: '1.25rem 1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
};
const badgeStyle: React.CSSProperties = {
    fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
    border: '1px solid', display: 'inline-block',
};
const actionBtnStyle = (from: string, to: string): React.CSSProperties => ({
    padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
    background: `linear-gradient(135deg,${from},${to})`, color: '#fff',
    fontWeight: 700, fontSize: '0.9rem', boxShadow: `0 3px 10px ${from}44`,
});
const smallBtnStyle = (bg: string): React.CSSProperties => ({
    padding: '3px 10px', borderRadius: '20px', border: `1px solid ${bg}66`,
    background: bg + '22', color: '#cbd5e1', cursor: 'pointer', fontSize: '0.78rem',
    display: 'inline-flex', alignItems: 'center', gap: '4px',
});
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
    background: '#1e2538', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px', padding: '1.75rem', width: '90%', maxWidth: '420px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.6rem 0.75rem', borderRadius: '8px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none', fontFamily: 'Inter,sans-serif',
};
const grayCloseStyle: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
    color: '#94a3b8', cursor: 'pointer', padding: '2px 8px', fontSize: '0.9rem',
};

export default VisitorNotificationsPage;
