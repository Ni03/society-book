import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Member, Visitor, SearchResponse } from '../types';

// Build the full URL for an upload path (e.g. /uploads/file.pdf)
const SERVER_ORIGIN = 'http://localhost:5000';
const getUploadUrl = (path: string) =>
    path.startsWith('http') ? path : `${SERVER_ORIGIN}${path}`;

const VehicleSearchPage: React.FC = () => {
    const [registrationNo, setRegistrationNo] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState<Member[] | null>(null);
    const [visitorResults, setVisitorResults] = useState<Visitor[]>([]);
    const [searched, setSearched] = useState(false);
    const navigate = useNavigate();
    const { role, wing } = useAuth();
    const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();

        const normalized = registrationNo.trim().toUpperCase().replace(/\s+/g, '');

        if (!normalized) {
            toast.error('Please enter a registration number');
            return;
        }

        if (normalized.length < 6 || normalized.length > 15) {
            toast.error('Registration number must be between 6 and 15 characters');
            return;
        }

        if (!/^[A-Z0-9]+$/.test(normalized)) {
            toast.error('Registration number must be alphanumeric only');
            return;
        }

        setLoading(true);
        setSearched(true);

        try {
            const response = await api.get<SearchResponse>('/admin/search', {
                params: { registrationNo: normalized },
            });

            if (response.data.success && response.data.data) {
                setResults(response.data.data);
            } else {
                setResults([]);
            }
            setVisitorResults(response.data.visitors ?? []);
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || 'Search failed'
            );
            setResults([]);
            setVisitorResults([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="page-wrapper" style={{ maxWidth: '900px' }}>
            <div className="page-header">
                <h1 className="page-header__title">🔍 Vehicle Search</h1>
                <p className="page-header__subtitle">
                    Search members by bike or car registration number across all wings
                </p>
            </div>

            <div className="vehicle-search">
                <div className="vehicle-search__title">
                    Search by Registration Number
                </div>
                <form className="vehicle-search__form" onSubmit={handleSearch}>
                    <div className="search-bar__input-wrapper" style={{ flex: 1 }}>
                        <span className="search-bar__icon">🚗</span>
                        <input
                            type="text"
                            className="search-bar__input"
                            placeholder="Enter vehicle registration number (e.g. MH12AB1234)"
                            value={registrationNo}
                            onChange={(e) => setRegistrationNo(e.target.value)}
                            id="vehicle-search-input"
                            style={{ textTransform: 'uppercase' }}
                        />
                    </div>
                    <button
                        type="submit"
                        className="btn btn--primary"
                        disabled={loading}
                        id="vehicle-search-btn"
                    >
                        {loading ? (
                            <>
                                <span className="spinner"></span>
                                Searching...
                            </>
                        ) : (
                            'Search'
                        )}
                    </button>
                </form>

                <p className="form-hint" style={{ marginTop: '0.5rem' }}>
                    Registration number must be 6-15 alphanumeric characters
                </p>
            </div>

            {/* Results */}
            {searched && !loading && (
                <div className="vehicle-search__result">
                    {results && results.length > 0 ? (
                        results.map((member) => (
                            <div className="member-card" key={member._id} style={{ marginBottom: '1rem' }}>
                                <div className="member-card__header">
                                    <h3 className="member-card__name">{member.fullName}</h3>
                                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                                        <span
                                            className={`badge ${member.type === 'owner'
                                                ? 'badge--owner'
                                                : 'badge--tenant'
                                                }`}
                                        >
                                            {member.type === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                                        </span>
                                        <span className="badge badge--wing">
                                            Wing {member.wing}
                                        </span>
                                    </div>
                                </div>
                                <div className="member-card__details">
                                    <div className="member-card__field">
                                        <div className="member-card__field-label">Phone</div>
                                        <div className="member-card__field-value">
                                            {member.phoneNumber}
                                        </div>
                                    </div>
                                    <div className="member-card__field">
                                        <div className="member-card__field-label">Type</div>
                                        <div className="member-card__field-value">
                                            {member.type === 'owner' ? 'Owner' : 'Tenant'}
                                        </div>
                                    </div>

                                    {member.vehicles.bikes.count > 0 && (
                                        <div className="member-card__field" style={{ gridColumn: '1 / -1' }}>
                                            <div className="member-card__field-label">
                                                🏍️ Bikes ({member.vehicles.bikes.count})
                                            </div>
                                            <div className="vehicle-tags" style={{ marginTop: '4px' }}>
                                                {member.vehicles.bikes.registrationNumbers.map(
                                                    (reg) => (
                                                        <span
                                                            key={reg}
                                                            className="vehicle-tag vehicle-tag--bike"
                                                            style={{
                                                                fontWeight:
                                                                    reg ===
                                                                        registrationNo
                                                                            .trim()
                                                                            .toUpperCase()
                                                                            .replace(/\s+/g, '')
                                                                        ? 800
                                                                        : 600,
                                                                border:
                                                                    reg ===
                                                                        registrationNo
                                                                            .trim()
                                                                            .toUpperCase()
                                                                            .replace(/\s+/g, '')
                                                                        ? '2px solid #92400e'
                                                                        : 'none',
                                                            }}
                                                        >
                                                            🏍️ {reg}
                                                        </span>
                                                    )
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {member.vehicles.cars.count > 0 && (
                                        <div className="member-card__field" style={{ gridColumn: '1 / -1' }}>
                                            <div className="member-card__field-label">
                                                🚗 Cars ({member.vehicles.cars.count})
                                            </div>
                                            <div className="vehicle-tags" style={{ marginTop: '4px' }}>
                                                {member.vehicles.cars.list.map((car) => {
                                                    const isMatch =
                                                        car.regNo ===
                                                        registrationNo
                                                            .trim()
                                                            .toUpperCase()
                                                            .replace(/\s+/g, '');
                                                    return (
                                                        <span
                                                            key={car.regNo}
                                                            className="vehicle-tag vehicle-tag--car"
                                                            style={{
                                                                fontWeight: isMatch ? 800 : 600,
                                                                border: isMatch
                                                                    ? '2px solid #1e40af'
                                                                    : 'none',
                                                            }}
                                                        >
                                                            🚗 {car.regNo}
                                                            {car.fastTag && (
                                                                <span
                                                                    title="FASTag"
                                                                    style={{
                                                                        marginLeft: '4px',
                                                                        fontSize: '0.75rem',
                                                                        opacity: 0.85,
                                                                    }}
                                                                >
                                                                    📡
                                                                </span>
                                                            )}
                                                            {car.parkingSlot && (
                                                                <span
                                                                    style={{
                                                                        marginLeft: '4px',
                                                                        fontSize: '0.75rem',
                                                                        opacity: 0.7,
                                                                    }}
                                                                >
                                                                    🅿️ {car.parkingSlot}
                                                                </span>
                                                            )}
                                                        </span>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {member.type === 'owner' && member.ownerDetails?.index2 && (
                                        <div className="member-card__field" style={{ gridColumn: '1 / -1' }}>
                                            <div className="member-card__field-label">📄 Index 2 Document</div>
                                            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px', flexWrap: 'wrap' }}>
                                                <a
                                                    href={getUploadUrl(member.ownerDetails.index2)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="btn btn--secondary btn--sm"
                                                    id={`view-index2-${member._id}`}
                                                >
                                                    👁️ View
                                                </a>
                                                <a
                                                    href={getUploadUrl(member.ownerDetails.index2)}
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
                                        <>
                                            {member.tenantDetails?.agreement && (
                                                <div className="member-card__field" style={{ gridColumn: '1 / -1' }}>
                                                    <div className="member-card__field-label">📄 Rental Agreement</div>
                                                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '6px', flexWrap: 'wrap' }}>
                                                        <a
                                                            href={getUploadUrl(member.tenantDetails.agreement)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="btn btn--secondary btn--sm"
                                                            id={`view-agreement-${member._id}`}
                                                        >
                                                            👁️ View
                                                        </a>
                                                        <a
                                                            href={getUploadUrl(member.tenantDetails.agreement)}
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
                                                <div className="member-card__field">
                                                    <div className="member-card__field-label">Agreement Expiry</div>
                                                    <div className="member-card__field-value">
                                                        {new Date(
                                                            member.tenantDetails.lastDayOfAgreement
                                                        ).toLocaleDateString()}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}
                                </div>

                                <div style={{ marginTop: '1rem' }}>
                                    {
                                        wing === member.wing && (<button
                                            className="btn btn--secondary btn--sm"
                                            onClick={() => navigate(`/admin/members/${member._id}/edit`)}
                                            id={`edit-search-result-${member._id}`}
                                        >
                                            ✏️ Edit Member
                                        </button>)
                                    }
                                </div>
                            </div>
                        ))
                    ) : visitorResults.length > 0 ? null : (
                        <div className="empty-state">
                            <div className="empty-state__icon">🔍</div>
                            <h3 className="empty-state__title">No results found</h3>
                            <p>
                                No member found with this registration number across all wings
                            </p>
                        </div>
                    )}

                    {/* ── Visitor results ──────────────────────────────────────── */}
                    {visitorResults.length > 0 && (
                        <>
                            <div style={{ marginTop: (results && results.length > 0) ? '1.5rem' : 0 }}>
                                <h3 style={{
                                    fontSize: '0.9rem', fontWeight: 700, color: '#5eead4',
                                    textTransform: 'uppercase', letterSpacing: '0.06em',
                                    margin: '0 0 0.75rem',
                                }}>
                                    🚸 Approved Visitor Match
                                </h3>
                                {visitorResults.map(v => {
                                    const expiry = new Date(v.expiresAt);
                                    const diffMs = expiry.getTime() - Date.now();
                                    const h = Math.floor(diffMs / 3_600_000);
                                    const m = Math.floor((diffMs % 3_600_000) / 60_000);
                                    const timeLeft = diffMs > 0
                                        ? (h > 0 ? `${h}h ${m}m left` : `${m}m left`)
                                        : 'Expired';

                                    return (
                                        <div key={v._id} style={{
                                            background: 'rgba(20,184,166,0.08)',
                                            border: '1px solid rgba(94,234,212,0.25)',
                                            borderRadius: '14px', padding: '1.25rem',
                                            marginBottom: '0.75rem',
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                                                <div>
                                                    <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#f1f5f9' }}>
                                                        👤 {v.visitorName}
                                                    </div>
                                                    {v.visitorPhone && <div style={{ fontSize: '0.85rem', color: '#94a3b8' }}>📞 {v.visitorPhone}</div>}
                                                    <div style={{ fontSize: '0.85rem', color: '#5eead4', marginTop: '4px' }}>
                                                        🏢 Flat {v.wing}-{v.flatNo}
                                                        {v.purpose && <> · {v.purpose}</>}
                                                    </div>
                                                </div>
                                                <div style={{ textAlign: 'right' }}>
                                                    <span style={{
                                                        background: '#14b8a622', color: '#5eead4',
                                                        border: '1px solid #5eead444', fontSize: '0.72rem',
                                                        fontWeight: 700, padding: '3px 10px', borderRadius: '20px',
                                                    }}>
                                                        🚸 VISITOR – APPROVED
                                                    </span>
                                                    <div style={{
                                                        fontSize: '0.75rem', marginTop: '4px',
                                                        color: diffMs > 0 ? '#6ee7b7' : '#f87171',
                                                    }}>
                                                        ⏳ {timeLeft}
                                                    </div>
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8rem', color: '#94a3b8' }}>
                                                <span>🚗 {v.vehicle.regNo} ({v.vehicle.type})</span>
                                                <span>·</span>
                                                <span>Entry: {new Date(v.entryTime).toLocaleString()}</span>
                                                <span>·</span>
                                                <span>By: {v.loggedByUsername || 'Security'}</span>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default VehicleSearchPage;
