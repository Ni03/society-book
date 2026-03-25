import React, { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Visitor } from '../types';
import { VALID_WINGS } from '../types';

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

const VisitorHistoryPage: React.FC = () => {
    const { role, wing: myWing } = useAuth();
    const isSuperAdmin = role === 'superadmin' || myWing === 'ALL';

    const [visitors, setVisitors] = useState<Visitor[]>([]);
    const [loading, setLoading] = useState(true);
    const [archiving, setArchiving] = useState(false);
    const [photoModal, setPhotoModal] = useState<string | null>(null);

    // Filters
    const [statusFilter, setStatusFilter] = useState('all');
    const [wingFilter, setWingFilter] = useState('');
    const [dateFilter, setDateFilter] = useState('');

    const fetchHistory = useCallback(async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (statusFilter !== 'all') params.status = statusFilter;
            if (wingFilter) params.wing = wingFilter;
            if (dateFilter) params.date = dateFilter;

            const res = await api.get('/admin/visitors/history', { params });
            if (res.data.success) setVisitors(res.data.data);
        } catch {
            toast.error('Failed to load visitor history');
        } finally {
            setLoading(false);
        }
    }, [statusFilter, wingFilter, dateFilter]);

    useEffect(() => { fetchHistory(); }, [fetchHistory]);

    const handleArchiveExpired = async () => {
        setArchiving(true);
        try {
            const res = await api.post('/admin/visitors/archive-expired');
            toast.success(res.data.message);
            fetchHistory();
        } catch {
            toast.error('Failed to archive');
        } finally {
            setArchiving(false);
        }
    };

    const handleArchiveOne = async (id: string) => {
        try {
            await api.put(`/admin/visitors/${id}/archive`);
            toast.success('Archived');
            setVisitors(prev => prev.map(v => v._id === id ? { ...v, status: 'archived' } : v));
        } catch {
            toast.error('Failed to archive');
        }
    };

    const viewPhoto = async (v: Visitor) => {
        if (!v.hasPhoto) { toast('No photo'); return; }
        try {
            const res = await api.get(`/admin/visitors/${v._id}/photo`);
            if (res.data.success) setPhotoModal(res.data.photo);
        } catch { toast.error('Could not load photo'); }
    };

    const counts = {
        all: visitors.length,
        pending: visitors.filter(v => v.status === 'pending').length,
        approved: visitors.filter(v => v.status === 'approved').length,
        rejected: visitors.filter(v => v.status === 'rejected').length,
        expired: visitors.filter(v => v.status === 'expired').length,
        archived: visitors.filter(v => v.status === 'archived').length,
    };

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <h1 className="page-header__title">📋 Visitor History</h1>
                <p className="page-header__subtitle">
                    Complete log of all visitor entries{isSuperAdmin ? ' across all wings' : ` for Wing ${myWing}`}
                </p>
            </div>

            {/* Toolbar */}
            <div className="toolbar" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
                <div className="filter-tabs" style={{ flexWrap: 'wrap' }}>
                    {(['all', 'pending', 'approved', 'rejected', 'expired', 'archived'] as const).map(s => (
                        <button
                            key={s}
                            className={`filter-tab ${statusFilter === s ? 'filter-tab--active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                            id={`filter-${s}`}
                        >
                            {STATUS_ICON[s] || '📋'} {s.charAt(0).toUpperCase() + s.slice(1)} ({counts[s]})
                        </button>
                    ))}
                </div>
                <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {isSuperAdmin && (
                        <select
                            style={filterSelectStyle}
                            value={wingFilter}
                            onChange={e => setWingFilter(e.target.value)}
                            id="wing-filter"
                        >
                            <option value="">All Wings</option>
                            {VALID_WINGS.map(w => <option key={w} value={w}>Wing {w}</option>)}
                        </select>
                    )}
                    <input
                        type="date"
                        style={filterSelectStyle}
                        value={dateFilter}
                        onChange={e => setDateFilter(e.target.value)}
                        id="date-filter"
                    />
                    <button className="btn btn--secondary btn--sm" onClick={fetchHistory} id="refresh-btn">🔄 Refresh</button>
                    <button
                        className="btn btn--sm"
                        onClick={handleArchiveExpired}
                        disabled={archiving}
                        id="archive-expired-btn"
                        style={{ background: 'linear-gradient(135deg,#374151,#1f2937)', color: '#9ca3af', border: '1px solid #374151' }}
                    >
                        {archiving ? '⏳' : '📦'} Archive Expired
                    </button>
                </div>
            </div>

            {/* Table */}
            {loading ? (
                <div className="loading-overlay">
                    <div className="loading-spinner" />
                    <span className="loading-text">Loading history…</span>
                </div>
            ) : visitors.length === 0 ? (
                <div className="empty-state">
                    <div className="empty-state__icon">📭</div>
                    <h3 className="empty-state__title">No visitors found</h3>
                    <p>Try adjusting the filters above</p>
                </div>
            ) : (
                <div className="table-container">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Visitor</th>
                                <th>Destination</th>
                                <th>Vehicle</th>
                                <th>Status</th>
                                <th>Entry Time</th>
                                <th>Expires</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {visitors.map((v, i) => (
                                <tr key={v._id}>
                                    <td style={{ color: 'var(--text-muted)', fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <div style={{ fontWeight: 600 }}>{v.visitorName}</div>
                                        {v.visitorPhone && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>📞 {v.visitorPhone}</div>}
                                        {v.purpose && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.purpose}</div>}
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 700 }}>Wing {v.wing}</span>
                                        <span style={{ color: 'var(--text-muted)' }}> – Flat {v.flatNo}</span>
                                    </td>
                                    <td>
                                        {v.vehicle?.regNo ? (
                                            <div>
                                                <div style={{ fontWeight: 600 }}>🚗 {v.vehicle.regNo}</div>
                                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{v.vehicle.type}</div>
                                            </div>
                                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                                    </td>
                                    <td>
                                        <span style={{
                                            fontSize: '0.75rem', fontWeight: 700, padding: '3px 9px', borderRadius: '20px',
                                            background: STATUS_COLOR[v.status] + '22', color: STATUS_COLOR[v.status],
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
                                    <td style={{ fontSize: '0.85rem' }}>{new Date(v.entryTime).toLocaleString()}</td>
                                    <td style={{ fontSize: '0.82rem', color: new Date(v.expiresAt) < new Date() ? '#ef4444' : 'var(--text-muted)' }}>
                                        {new Date(v.expiresAt).toLocaleString()}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                            {v.hasPhoto && (
                                                <button className="btn btn--secondary btn--sm" onClick={() => viewPhoto(v)} id={`photo-${v._id}`}>
                                                    📷
                                                </button>
                                            )}
                                            {v.status !== 'archived' && (
                                                <button
                                                    className="btn btn--sm"
                                                    onClick={() => handleArchiveOne(v._id)}
                                                    id={`archive-${v._id}`}
                                                    style={{ background: '#374151', color: '#9ca3af', border: 'none' }}
                                                >
                                                    📦
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Photo Modal */}
            {photoModal && (
                <div style={overlayStyle} onClick={() => setPhotoModal(null)}>
                    <div style={modalStyle} onClick={e => e.stopPropagation()}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 style={{ margin: 0, color: '#f1f5f9' }}>📷 Visitor Photo</h3>
                            <button onClick={() => setPhotoModal(null)} style={closeStyle}>✕</button>
                        </div>
                        <img src={photoModal} alt="Visitor" style={{ width: '100%', borderRadius: '10px', maxHeight: '440px', objectFit: 'contain' }} />
                    </div>
                </div>
            )}
        </div>
    );
};

const filterSelectStyle: React.CSSProperties = {
    padding: '0.4rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
    background: 'rgba(255,255,255,0.06)', color: '#f1f5f9', fontSize: '0.85rem', outline: 'none',
};
const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
};
const modalStyle: React.CSSProperties = {
    background: '#1e2538', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px',
    padding: '1.75rem', width: '90%', maxWidth: '480px', boxShadow: '0 25px 60px rgba(0,0,0,0.6)',
};
const closeStyle: React.CSSProperties = {
    background: 'none', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '6px',
    color: '#94a3b8', cursor: 'pointer', padding: '2px 8px',
};

export default VisitorHistoryPage;
