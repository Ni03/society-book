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
const STATUS_ICON: Record<string, string> = {
    pending: '⏳', approved: '✅', rejected: '❌', expired: '⌛', archived: '📦',
};

const MemberVisitorHistoryPage: React.FC = () => {
    const [visitors,     setVisitors]     = useState<Visitor[]>([]);
    const [loading,      setLoading]      = useState(true);
    const [statusFilter, setStatusFilter] = useState('all');
    const [dateFilter,   setDateFilter]   = useState('');
    const [photoModal,   setPhotoModal]   = useState<string | null>(null);

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (dateFilter) params.date = dateFilter;

            const res = await api.get('/member/visitors/history', { params });
            if (res.data.success) setVisitors(res.data.data);
        } catch {
            toast.error('Failed to load visitor history');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, dateFilter]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const viewPhoto = async (v: Visitor) => {
        if (!v.hasPhoto) { toast('No photo for this visitor'); return; }
        try {
            const res = await api.get(`/member/visitors/${v._id}/photo`);
            if (res.data.success) setPhotoModal(res.data.photo);
        } catch { toast.error('Could not load photo'); }
    };

    const counts = {
        all:      visitors.length,
        pending:  visitors.filter(v => v.status === 'pending').length,
        approved: visitors.filter(v => v.status === 'approved').length,
        rejected: visitors.filter(v => v.status === 'rejected').length,
        expired:  visitors.filter(v => v.status === 'expired').length,
    };

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <h1 className="page-header__title">📋 My Visitor Log</h1>
                <p className="page-header__subtitle">
                    {loading ? 'Loading…' : `${visitors.length} visitor record${visitors.length !== 1 ? 's' : ''} found`}
                </p>
            </div>

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div className="filter-tabs" style={{ flexWrap: 'wrap' }}>
                    {(['all', 'pending', 'approved', 'rejected', 'expired'] as const).map(s => (
                        <button
                            key={s}
                            className={`filter-tab ${statusFilter === s ? 'filter-tab--active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                            id={`member-log-filter-${s}`}
                        >
                            {STATUS_ICON[s] || '📋'} {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
                    <input
                        type="date"
                        style={filterSelectStyle}
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        id="member-log-date-filter"
                    />
                    {dateFilter && (
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={() => setDateFilter('')}
                        >
                            ✕ Clear
                        </button>
                    )}
                    <button
                        className="btn btn--secondary btn--sm"
                        onClick={fetchHistory}
                        id="member-log-refresh-btn"
                    >
                        🔄 Refresh
                    </button>
                </div>
            </div>

            {/* ── Content ──────────────────────────────────────────────────── */}
            {loading ? (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span className="loading-text">Loading visitor history…</span>
                </div>
            ) : visitors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">📭</div>
                    <h3 className="empty-state__title">No visitors found</h3>
                    <p>Try adjusting the filters above.</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Visitor</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                                <th>Entry Time</th>
                                <th>Logged By</th>
                                <th>Photo</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visitors.map((v, i) => (
                                <tr key={v._id}>
                                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{v.visitorName}</div>
                                        {v.visitorPhone && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {v.visitorPhone}</div>
                                        )}
                                        {v.purpose && (
                                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.purpose}</div>
                                        )}
                                    </td>
                                    <td>
                                        {v.vehicle?.regNo ? (
                                            <div>
                                                <div style={{ fontWeight: 600 }}>🚗 {v.vehicle.regNo}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.vehicle.type}</div>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 700,
                                            padding: '3px 9px', borderRadius: '20px',
                                            background: STATUS_COLOR[v.status] + '22',
                                            color: STATUS_COLOR[v.status],
                                            border: `1px solid ${STATUS_COLOR[v.status]}44`,
                                        }}>
                                            {STATUS_ICON[v.status]} {v.status}
                                        </span>
                                        {v.rejectReason && (
                                            <div style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '2px' }}>
                                                {v.rejectReason}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ fontSize: '0.85rem' }}>
                                        {new Date(v.entryTime).toLocaleString()}
                                    </td>
                                    <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                        {v.loggedByUsername ? `🛡️ ${v.loggedByUsername}` : '—'}
                                    </td>
                                    <td>
                                        {v.hasPhoto ? (
                                            <button
                                                className="btn btn--secondary btn--sm"
                                                onClick={() => viewPhoto(v)}
                                                id={`member-log-photo-${v._id}`}
                                            >
                                                📷
                                            </button>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)' }}>—</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── Photo modal ───────────────────────────────────────────────── */}
            {photoModal && (
                <div style={overlayStyle} onClick={() => setPhotoModal(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: '#f1f5f9' }}>📷 Visitor Photo</h3>
                            <button onClick={() => setPhotoModal(null)} style={closeStyle}>✕</button>
                        </div>
                        <img
                            src={photoModal}
                            alt="Visitor"
                            style={{ width: '100%', borderRadius: '10px', maxHeight: '440px', objectFit: 'contain' }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

// ── Styles ─────────────────────────────────────────────────────────────────────
const filterSelectStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem', borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)', color: '#f1f5f9',
    fontSize: '0.85rem', outline: 'none',
};
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)',
    backdropFilter: 'blur(4px)', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
    background: '#1e2538', border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: '16px', padding: '1.75rem', width: '90%', maxWidth: '480px',
    boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
};
const closeStyle: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(255,255,255,0.15)',
    borderRadius: '6px', color: '#94a3b8', cursor: 'pointer', padding: '2px 8px',
};

export default MemberVisitorHistoryPage;
