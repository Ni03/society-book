import React, { useState, useEffect, useCallback } from 'react';
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
    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [actioningId, setActioningId] = useState<string | null>(null);
    const [rejectModal, setRejectModal] = useState<Visitor | null>(null);
    const [rejectReason, setRejectReason] = useState('');
    const [photoModal, setPhotoModal] = useState<string | null>(null); // base64 URL
    const [photoLoading, setPhotoLoading] = useState(false);

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
        // Poll every 30s for native-app-like feel
        const interval = setInterval(fetchNotifications, 30_000);
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    const handleApprove = async (id: string) => {
        setActioningId(id);
        try {
            await api.put(`/admin/visitors/${id}/approve`);
            toast.success('✅ Visitor approved!');
            setVisitors(prev => prev.filter(v => v._id !== id));
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
