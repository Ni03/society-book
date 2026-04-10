import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { Member, MembersResponse } from '../types';

const MembersPage: React.FC = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [stats, setStats] = useState({ total: 0, owners: 0, tenants: 0 });
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'owner' | 'tenant'>('all');
    const [search, setSearch] = useState('');
    const [confirmDelete, setConfirmDelete] = useState<Member | null>(null);
    const [deleting, setDeleting] = useState(false);
    const navigate = useNavigate();

    const fetchMembers = async () => {
        setLoading(true);
        try {
            const params: Record<string, string> = {};
            if (filter !== 'all') params.type = filter;
            if (search.trim()) params.search = search.trim();

            const response = await api.get<MembersResponse>('/admin/members', { params });
            if (response.data.success) {
                setMembers(response.data.data);
                setStats(response.data.stats);
            }
        } catch (error) {
            toast.error('Failed to fetch members');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMembers();
    }, [filter]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchMembers();
    };

    const handleExport = async () => {
        try {
            const params: Record<string, string> = {};
            if (filter !== 'all') params.type = filter;
            if (search.trim()) params.search = search.trim();

            const response = await api.get('/admin/members/export', {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            // Use filename from Content-Disposition if available
            const disposition = response.headers['content-disposition'] as string | undefined;
            const match = disposition?.match(/filename="(.+?)"/);
            link.download = match ? match[1] : `Members_${new Date().toISOString().slice(0, 10)}.xlsx`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Excel file downloaded!');
        } catch (error) {
            toast.error('Failed to export Excel file');
        }
    };

    const handleExportAttachments = async () => {
        try {
            const params: Record<string, string> = {};
            if (filter !== 'all') params.type = filter;
            if (search.trim()) params.search = search.trim();

            toast.loading('Preparing ZIP archive...', { id: 'zip-toast' });

            const response = await api.get('/admin/members/export-attachments', {
                params,
                responseType: 'blob',
            });

            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;

            const disposition = response.headers['content-disposition'] as string | undefined;
            const match = disposition?.match(/filename="(.+?)"/);
            link.download = match ? match[1] : `Attachments_${new Date().toISOString().slice(0, 10)}.zip`;

            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
            toast.success('Attachments fully downloaded!', { id: 'zip-toast' });
        } catch (error) {
            toast.error('Failed to export attachments', { id: 'zip-toast' });
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setDeleting(true);
        try {
            await api.delete(`/admin/members/${confirmDelete._id}`);
            // Optimistically remove from list and update stats
            setMembers((prev) => prev.filter((m) => m._id !== confirmDelete._id));
            setStats((prev) => ({
                total: prev.total - 1,
                owners: confirmDelete.type === 'owner' ? prev.owners - 1 : prev.owners,
                tenants: confirmDelete.type === 'tenant' ? prev.tenants - 1 : prev.tenants,
            }));
            toast.success(`${confirmDelete.fullName} deleted successfully`);
            setConfirmDelete(null);
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to delete member');
        } finally {
            setDeleting(false);
        }
    };

    const getVehicleSummary = (member: Member): string => {
        const parts: string[] = [];
        if (member.vehicles.bikes.count > 0) {
            parts.push(`🏍️ ${member.vehicles.bikes.count}`);
        }
        if (member.vehicles.cars.count > 0) {
            parts.push(`🚗 ${member.vehicles.cars.count}`);
        }
        return parts.length > 0 ? parts.join(' · ') : 'None';
    };

    return (
        <>
            <div className="page-wrapper">
                <div className="page-header">
                    <h1 className="page-header__title">Members</h1>
                    <p className="page-header__subtitle">
                        Manage your wing's member records ({stats.total} total)
                    </p>
                </div>

                {/* Filters */}
                <div className="toolbar">
                    <div className="toolbar__left">
                        <div className="filter-tabs">
                            <button
                                className={`filter-tab ${filter === 'all' ? 'filter-tab--active' : ''}`}
                                onClick={() => setFilter('all')}
                                id="filter-all"
                            >
                                All ({stats.total})
                            </button>
                            <button
                                className={`filter-tab ${filter === 'owner' ? 'filter-tab--active' : ''}`}
                                onClick={() => setFilter('owner')}
                                id="filter-owners"
                            >
                                Owners ({stats.owners})
                            </button>
                            <button
                                className={`filter-tab ${filter === 'tenant' ? 'filter-tab--active' : ''}`}
                                onClick={() => setFilter('tenant')}
                                id="filter-tenants"
                            >
                                Tenants ({stats.tenants})
                            </button>
                        </div>
                    </div>
                    <div className="toolbar__right" style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                        <form className="search-bar" onSubmit={handleSearch} style={{ marginBottom: 0 }}>
                            <div className="search-bar__input-wrapper">
                                <span className="search-bar__icon">🔍</span>
                                <input
                                    type="text"
                                    className="search-bar__input"
                                    placeholder="Search by name..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    id="search-name-input"
                                />
                            </div>
                            <button type="submit" className="btn btn--primary" id="search-name-btn">
                                Search
                            </button>
                        </form>
                        <button
                            className="btn btn--info"
                            onClick={handleExportAttachments}
                            id="export-attachments-btn"
                            title={`Download all attachments as ZIP${filter !== 'all' ? ` (${filter}s only)` : ''}`}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            🗂️ Download Attachments
                        </button>
                        <button
                            className="btn btn--success"
                            onClick={handleExport}
                            id="export-excel-btn"
                            title={`Export current view as Excel${filter !== 'all' ? ` (${filter}s only)` : ''}`}
                            style={{ whiteSpace: 'nowrap' }}
                        >
                            📥 Export Excel
                        </button>
                    </div>
                </div>

                {/* Table */}
                {loading ? (
                    <div className="loading-overlay">
                        <div className="loading-spinner"></div>
                        <span className="loading-text">Loading members...</span>
                    </div>
                ) : members.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-state__icon">📭</div>
                        <h3 className="empty-state__title">No members found</h3>
                        <p>
                            {search
                                ? 'Try a different search term'
                                : 'No members registered in this wing yet'}
                        </p>
                    </div>
                ) : (
                    <div className="table-container">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Name</th>
                                    <th>Phone</th>
                                    <th>Type</th>
                                    <th>Vehicles</th>
                                    <th>Details</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {members.map((member, index) => (
                                    <tr key={member._id}>
                                        <td style={{ fontWeight: 600, color: 'var(--text-muted)' }}>
                                            {index + 1}
                                        </td>
                                        <td>
                                            <div style={{ fontWeight: 600 }}>{member.fullName}</div>
                                            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                                                Flat: {member.flatNo}
                                            </div>
                                        </td>
                                        <td>{member.phoneNumber}</td>
                                        <td>
                                            <span
                                                className={`badge ${member.type === 'owner'
                                                    ? 'badge--owner'
                                                    : 'badge--tenant'
                                                    }`}
                                            >
                                                {member.type === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="vehicle-tags">
                                                {member.vehicles.bikes.registrationNumbers.map((reg) => (
                                                    <span key={reg} className="vehicle-tag vehicle-tag--bike">
                                                        🏍️ {reg}
                                                    </span>
                                                ))}
                                                {member.vehicles.cars.list.map((car) => (
                                                    <span key={car.regNo} className="vehicle-tag vehicle-tag--car">
                                                        🚗 {car.regNo}
                                                    </span>
                                                ))}
                                                {member.vehicles.bikes.count === 0 &&
                                                    member.vehicles.cars.count === 0 && (
                                                        <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                                            No vehicles
                                                        </span>
                                                    )}
                                            </div>
                                        </td>
                                        <td>
                                            {member.type === 'owner' && member.ownerDetails?.index2 && (
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>📄 Index 2</div>
                                                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                        <a
                                                            href={member.ownerDetails.index2}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn--secondary btn--sm"
                                                            id={`view-index2-${member._id}`}
                                                        >
                                                            👁️ View
                                                        </a>
                                                        <a
                                                            href={member.ownerDetails.index2}
                                                            download
                                                            className="btn btn--primary btn--sm"
                                                            id={`download-index2-${member._id}`}
                                                        >
                                                            ⬇️ Download
                                                        </a>
                                                    </div>
                                                </div>
                                            )}
                                            {member.type === 'tenant' && (
                                                <div style={{ fontSize: '0.85rem' }}>
                                                    {member.tenantDetails?.agreement && (
                                                        <div style={{ marginBottom: '6px' }}>
                                                            <div style={{ fontWeight: 600, marginBottom: '4px', color: 'var(--text-secondary)' }}>📄 Agreement</div>
                                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                                <a
                                                                    href={member.tenantDetails.agreement}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="btn btn--secondary btn--sm"
                                                                    id={`view-agreement-${member._id}`}
                                                                >
                                                                    👁️ View
                                                                </a>
                                                                <a
                                                                    href={member.tenantDetails.agreement}
                                                                    download
                                                                    className="btn btn--primary btn--sm"
                                                                    id={`download-agreement-${member._id}`}
                                                                >
                                                                    ⬇️ Download
                                                                </a>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {member.tenantDetails?.lastDayOfAgreement && (
                                                        <div style={{ color: 'var(--text-muted)', marginTop: '2px' }}>
                                                            Exp:{' '}
                                                            {new Date(
                                                                member.tenantDetails.lastDayOfAgreement
                                                            ).toLocaleDateString()}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                                                <button
                                                    className="btn btn--secondary btn--sm"
                                                    onClick={() => navigate(`/admin/members/${member._id}/edit`)}
                                                    id={`edit-member-${member._id}`}
                                                >
                                                    ✏️ Edit
                                                </button>
                                                <button
                                                    className="btn btn--danger btn--sm"
                                                    onClick={() => setConfirmDelete(member)}
                                                    id={`delete-member-${member._id}`}
                                                >
                                                    🗑️ Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div
                    style={{
                        position: 'fixed', inset: 0,
                        background: 'rgba(0,0,0,0.55)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000,
                    }}
                    onClick={() => !deleting && setConfirmDelete(null)}
                >
                    <div
                        style={{
                            background: 'var(--card-bg, #1e2538)',
                            border: '1px solid rgba(220,38,38,0.3)',
                            borderRadius: '16px',
                            padding: '2rem',
                            maxWidth: '420px',
                            width: '90%',
                            boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                            <div style={{ fontSize: '3rem', marginBottom: '0.5rem' }}>🗑️</div>
                            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>Delete Member</h3>
                            <p style={{ margin: '0.5rem 0 0', color: 'var(--text-muted)', fontSize: '0.95rem' }}>
                                Are you sure you want to permanently delete{' '}
                                <strong style={{ color: 'var(--text-primary)' }}>{confirmDelete!.fullName}</strong>
                                {' '}(Flat {confirmDelete!.flatNo}, Wing {confirmDelete!.wing})?
                            </p>
                            <p style={{ margin: '0.5rem 0 0', color: '#f87171', fontSize: '0.85rem' }}>
                                ⚠️ This action cannot be undone. The uploaded attachment will also be deleted.
                            </p>
                        </div>
                        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center' }}>
                            <button
                                className="btn btn--secondary"
                                onClick={() => setConfirmDelete(null)}
                                disabled={deleting}
                                id="cancel-delete-btn"
                            >
                                Cancel
                            </button>
                            <button
                                className="btn btn--danger"
                                onClick={handleDelete}
                                disabled={deleting}
                                id="confirm-delete-btn"
                                style={{ minWidth: '120px' }}
                            >
                                {deleting ? (
                                    <><span className="spinner" /> Deleting...</>
                                ) : (
                                    '🗑️ Yes, Delete'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default MembersPage;
