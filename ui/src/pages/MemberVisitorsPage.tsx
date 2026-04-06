import React, { useState, useEffect, useCallback } from 'react';
import { useOutletContext } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { Visitor } from '../types';
import type { MemberLayoutContext } from '../components/MemberLayout';

const MemberVisitorsPage: React.FC = () => {
    const { openQuickModal, registerRefresh } = useOutletContext<
        MemberLayoutContext & { registerRefresh: (fn: () => void) => void }
    >();

    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading,  setLoading]  = useState(true);

    // ── Pull pending visitors for this member's flat ──────────────────────────
    const fetchVisitors = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/member/visitors/pending');
            if (res.data.success) setVisitors(res.data.data);
        } catch {
            toast.error('Failed to load visitors');
        } finally {
            setLoading(false);
        }
    }, []);

    // Register fetch with layout so it can refresh after approve/reject
    useEffect(() => {
        registerRefresh(fetchVisitors);
    }, [registerRefresh, fetchVisitors]);

    useEffect(() => {
        fetchVisitors();
        const interval = setInterval(fetchVisitors, 30_000);
        return () => clearInterval(interval);
    }, [fetchVisitors]);

    const timeLeft = (expiresAt: string) => {
        const diff = new Date(expiresAt).getTime() - Date.now();
        if (diff <= 0) return 'Expired';
        const h = Math.floor(diff / 3_600_000);
        const m = Math.floor((diff % 3_600_000) / 60_000);
        return h > 0 ? `${h}h ${m}m left` : `${m}m left`;
    };

    return (
        <div className="page-wrapper">
            {/* Header */}
            <div className="page-header">
                <h1 className="page-header__title">🔔 Visitor Alerts</h1>
                <p className="page-header__subtitle">
                    {loading
                        ? 'Checking for visitors…'
                        : visitors.length === 0
                            ? 'No pending visitor approvals'
                            : `${visitors.length} visitor${visitors.length > 1 ? 's' : ''} waiting at the gate`}
                </p>
            </div>

            {/* Toolbar */}
            <div className="toolbar">
                <div />
                <button
                    className="btn btn--secondary btn--sm"
                    onClick={fetchVisitors}
                    id="member-alerts-refresh-btn"
                >
                    🔄 Refresh
                </button>
            </div>

            {loading ? (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span className="loading-text">Loading...</span>
                </div>
            ) : visitors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">✅</div>
                    <h3 className="empty-state__title">All clear!</h3>
                    <p>No visitors are waiting for your approval.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    {visitors.map(v => (
                        <div key={v._id} style={cardStyle}>
                            {/* Left accent bar */}
                            <div style={accentBar} />

                            <div style={{ flex: 1 }}>
                                {/* Header row */}
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                    <div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                                            <span style={{ fontSize: '1.3rem' }}>👤</span>
                                            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#f1f5f9' }}>
                                                {v.visitorName}
                                            </span>
                                            {v.visitorPhone && (
                                                <span style={{ color: '#94a3b8', fontSize: '0.85rem' }}>📞 {v.visitorPhone}</span>
                                            )}
                                        </div>
                                        {v.purpose && (
                                            <div style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>
                                                📝 {v.purpose}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                                        <div style={{
                                            background: '#f59e0b22', color: '#f59e0b',
                                            border: '1px solid #f59e0b55', borderRadius: '20px',
                                            padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700,
                                            display: 'inline-block',
                                        }}>PENDING</div>
                                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px' }}>
                                            ⏳ {timeLeft(v.expiresAt)}
                                        </div>
                                    </div>
                                </div>

                                {/* Chips */}
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem' }}>
                                    {v.vehicle?.regNo ? (
                                        <Chip icon="🚗" label={`${v.vehicle.type !== 'none' ? v.vehicle.type + ' · ' : ''}${v.vehicle.regNo}`} />
                                    ) : (
                                        <Chip icon="🚶" label="No vehicle" />
                                    )}
                                    <Chip icon="🕐" label={new Date(v.entryTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
                                    {v.loggedByUsername && <Chip icon="🛡️" label={`By ${v.loggedByUsername}`} />}
                                    {(v as any).hasPhoto && <Chip icon="📸" label="Has photo" />}
                                </div>

                                {/* Single Review button → opens global modal */}
                                <div style={{ marginTop: '1rem' }}>
                                    <button
                                        onClick={() => openQuickModal(v._id)}
                                        id={`member-review-${v._id}`}
                                        style={reviewBtnStyle}
                                    >
                                        👁️ Review &amp; Decide →
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ── Sub-components ──────────────────────────────────────────────────────────
const Chip: React.FC<{ icon: string; label: string }> = ({ icon, label }) => (
    <span style={{
        fontSize: '0.78rem', padding: '3px 10px', borderRadius: '20px',
        background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
        color: '#cbd5e1', display: 'inline-flex', alignItems: 'center', gap: '4px',
    }}>
        {icon} {label}
    </span>
);

// ── Styles ──────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
    background: 'rgba(30,37,60,0.95)',
    border: '1px solid rgba(245,158,11,0.18)',
    borderRadius: '14px', padding: '1.25rem 1.5rem',
    boxShadow: '0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px rgba(245,158,11,0.06)',
    display: 'flex',
    gap: '0',
    position: 'relative',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
};
const accentBar: React.CSSProperties = {
    position: 'absolute',
    left: 0, top: 0, bottom: 0,
    width: '4px',
    background: 'linear-gradient(180deg, #f59e0b, #ef4444)',
    borderRadius: '14px 0 0 14px',
};
const reviewBtnStyle: React.CSSProperties = {
    padding: '0.55rem 1.4rem', borderRadius: '10px', border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
    color: '#fff', fontWeight: 700, fontSize: '0.9rem',
    boxShadow: '0 4px 14px rgba(99,102,241,0.4)',
    transition: 'opacity 0.15s, transform 0.1s',
};

export default MemberVisitorsPage;
