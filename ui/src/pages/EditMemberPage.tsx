import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { Member, MemberResponse } from '../types';

const EditMemberPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable fields
    const [phoneNumber, setPhoneNumber] = useState('');
    const [flatNo, setFlatNo] = useState('');
    const [bikeCount, setBikeCount] = useState(0);
    const [bikeRegs, setBikeRegs] = useState<string[]>([]);
    const [carCount, setCarCount] = useState(0);
    const [carRegs, setCarRegs] = useState<string[]>([]);
    const [index2, setIndex2] = useState('');
    const [agreement, setAgreement] = useState('');
    const [lastDayOfAgreement, setLastDayOfAgreement] = useState('');

    useEffect(() => {
        const fetchMember = async () => {
            try {
                const response = await api.get<MemberResponse>(`/admin/members/${id}`);
                if (response.data.success) {
                    const m = response.data.data;
                    setMember(m);
                    setPhoneNumber(m.phoneNumber);
                    setFlatNo(m.flatNo || '');
                    setBikeCount(m.vehicles.bikes.count);
                    setBikeRegs([...m.vehicles.bikes.registrationNumbers]);
                    setCarCount(m.vehicles.cars.count);
                    setCarRegs([...m.vehicles.cars.registrationNumbers]);
                    setIndex2(m.ownerDetails?.index2 || '');
                    setAgreement(m.tenantDetails?.agreement || '');
                    setLastDayOfAgreement(
                        m.tenantDetails?.lastDayOfAgreement
                            ? new Date(m.tenantDetails.lastDayOfAgreement)
                                .toISOString()
                                .split('T')[0]
                            : ''
                    );
                }
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to load member');
                navigate('/admin/members');
            } finally {
                setLoading(false);
            }
        };
        fetchMember();
    }, [id]);

    const handleBikeCountChange = (count: number) => {
        const newCount = Math.max(0, count);
        const newRegs = [...bikeRegs];
        while (newRegs.length < newCount) newRegs.push('');
        setBikeCount(newCount);
        setBikeRegs(newRegs.slice(0, newCount));
    };

    const handleCarCountChange = (count: number) => {
        const newCount = Math.max(0, count);
        const newRegs = [...carRegs];
        while (newRegs.length < newCount) newRegs.push('');
        setCarCount(newCount);
        setCarRegs(newRegs.slice(0, newCount));
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            toast.error('Phone number must be exactly 10 digits');
            return;
        }

        if (!flatNo || flatNo.trim().length === 0) {
            toast.error('Flat number is required');
            return;
        }

        if (bikeCount > 0) {
            for (let i = 0; i < bikeCount; i++) {
                if (!bikeRegs[i]?.trim()) {
                    toast.error(`Bike registration #${i + 1} is required`);
                    return;
                }
            }
        }

        if (carCount > 0) {
            for (let i = 0; i < carCount; i++) {
                if (!carRegs[i]?.trim()) {
                    toast.error(`Car registration #${i + 1} is required`);
                    return;
                }
            }
        }

        setSaving(true);

        try {
            const payload: Record<string, unknown> = {
                phoneNumber,
                flatNo: flatNo.trim(),
                vehicles: {
                    bikes: {
                        count: bikeCount,
                        registrationNumbers: bikeRegs.map((r) =>
                            r.trim().toUpperCase()
                        ),
                    },
                    cars: {
                        count: carCount,
                        registrationNumbers: carRegs.map((r) =>
                            r.trim().toUpperCase()
                        ),
                    },
                },
            };

            if (member?.type === 'owner') {
                // index2 is not updated here, it's a file
            } else {
                payload.tenantDetails = {
                    agreement: agreement, // keep existing
                    lastDayOfAgreement: lastDayOfAgreement || null,
                };
            }

            await api.put(`/admin/members/${id}`, payload);
            toast.success('Member updated successfully!');
            navigate('/admin/members');
        } catch (error: any) {
            toast.error(
                error.response?.data?.message || 'Failed to update member'
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading member details...</span>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="page-wrapper">
                <div className="empty-state">
                    <div className="empty-state__icon">❌</div>
                    <h3 className="empty-state__title">Member not found</h3>
                </div>
            </div>
        );
    }

    return (
        <div className="page-wrapper" style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: '1.5rem' }}>
                <button
                    className="btn btn--secondary btn--sm"
                    onClick={() => navigate('/admin/members')}
                    id="back-to-members-btn"
                >
                    ← Back to Members
                </button>
            </div>

            <div className="card card--elevated">
                <div className="card__header">
                    <h2 className="card__title">
                        ✏️ Edit Member
                    </h2>
                    <span
                        className={`badge ${member.type === 'owner' ? 'badge--owner' : 'badge--tenant'
                            }`}
                    >
                        {member.type === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                    </span>
                </div>
                <div className="card__body">
                    <form onSubmit={handleSave} noValidate>
                        {/* Read-only fields */}
                        <div className="form-row">
                            <div className="form-group">
                                <label className="form-label">Full Name</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={member.fullName}
                                    disabled
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Wing</label>
                                <input
                                    type="text"
                                    className="form-input"
                                    value={`Wing ${member.wing}`}
                                    disabled
                                />
                            </div>
                        </div>

                        {/* Editable: Phone */}
                        <div className="form-group">
                            <label className="form-label form-label--required" htmlFor="edit-phone">
                                Phone Number
                            </label>
                            <input
                                id="edit-phone"
                                type="tel"
                                className="form-input"
                                value={phoneNumber}
                                onChange={(e) => {
                                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                    setPhoneNumber(val);
                                }}
                            />
                        </div>

                        {/* Editable: Flat No */}
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="form-label form-label--required" htmlFor="edit-flatNo">
                                Flat Number
                            </label>
                            <input
                                id="edit-flatNo"
                                type="text"
                                className="form-input"
                                value={flatNo}
                                onChange={(e) => setFlatNo(e.target.value)}
                            />
                        </div>

                        {/* Bikes */}
                        <div className="form-group">
                            <label className="form-label" htmlFor="edit-bike-count">
                                Number of Bikes
                            </label>
                            <input
                                id="edit-bike-count"
                                type="number"
                                min="0"
                                className="form-input"
                                value={bikeCount}
                                onChange={(e) =>
                                    handleBikeCountChange(parseInt(e.target.value) || 0)
                                }
                            />
                        </div>

                        {bikeCount > 0 && (
                            <div className="dynamic-fields">
                                <div className="dynamic-fields__title">
                                    🏍️ Bike Registration Numbers
                                </div>
                                {Array.from({ length: bikeCount }).map((_, i) => (
                                    <div className="form-group" key={`bike-${i}`}>
                                        <label className="form-label form-label--required" htmlFor={`edit-bikeReg${i}`}>
                                            Bike #{i + 1}
                                        </label>
                                        <input
                                            id={`edit-bikeReg${i}`}
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. MH12AB1234"
                                            value={bikeRegs[i] || ''}
                                            onChange={(e) => {
                                                const newRegs = [...bikeRegs];
                                                newRegs[i] = e.target.value;
                                                setBikeRegs(newRegs);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Cars */}
                        <div className="form-group" style={{ marginTop: bikeCount > 0 ? '1rem' : undefined }}>
                            <label className="form-label" htmlFor="edit-car-count">
                                Number of Cars
                            </label>
                            <input
                                id="edit-car-count"
                                type="number"
                                min="0"
                                className="form-input"
                                value={carCount}
                                onChange={(e) =>
                                    handleCarCountChange(parseInt(e.target.value) || 0)
                                }
                            />
                        </div>

                        {carCount > 0 && (
                            <div className="dynamic-fields">
                                <div className="dynamic-fields__title">
                                    🚗 Car Registration Numbers
                                </div>
                                {Array.from({ length: carCount }).map((_, i) => (
                                    <div className="form-group" key={`car-${i}`}>
                                        <label className="form-label form-label--required" htmlFor={`edit-carReg${i}`}>
                                            Car #{i + 1}
                                        </label>
                                        <input
                                            id={`edit-carReg${i}`}
                                            type="text"
                                            className="form-input"
                                            placeholder="e.g. MH14XY5678"
                                            value={carRegs[i] || ''}
                                            onChange={(e) => {
                                                const newRegs = [...carRegs];
                                                newRegs[i] = e.target.value;
                                                setCarRegs(newRegs);
                                            }}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Owner-specific */}
                        {member.type === 'owner' && (
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label">
                                    Index 2 File
                                </label>
                                {index2 ? (
                                    <div style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius-md)' }}>
                                        <a href={index2} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                                            📄 View Uploaded File
                                        </a>
                                    </div>
                                ) : (
                                    <div style={{ color: 'var(--text-muted)' }}>No file uploaded.</div>
                                )}
                            </div>
                        )}

                        {/* Tenant-specific */}
                        {member.type === 'tenant' && (
                            <>
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label">
                                        Agreement File
                                    </label>
                                    {agreement ? (
                                        <div style={{ padding: '0.75rem', background: 'var(--gray-50)', borderRadius: 'var(--border-radius-md)' }}>
                                            <a href={agreement} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-600)', fontWeight: 600 }}>
                                                📄 View Uploaded Agreement
                                            </a>
                                        </div>
                                    ) : (
                                        <div style={{ color: 'var(--text-muted)' }}>No file uploaded.</div>
                                    )}
                                </div>
                                <div className="form-group">
                                    <label
                                        className="form-label form-label--required"
                                        htmlFor="edit-lastDay"
                                    >
                                        Last Day of Agreement
                                    </label>
                                    <input
                                        id="edit-lastDay"
                                        type="date"
                                        className="form-input"
                                        value={lastDayOfAgreement}
                                        onChange={(e) => setLastDayOfAgreement(e.target.value)}
                                    />
                                </div>
                            </>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                            <button
                                type="submit"
                                className="btn btn--primary btn--lg"
                                disabled={saving}
                                style={{ flex: 1 }}
                                id="save-member-btn"
                            >
                                {saving ? (
                                    <>
                                        <span className="spinner"></span>
                                        Saving...
                                    </>
                                ) : (
                                    'Save Changes'
                                )}
                            </button>
                            <button
                                type="button"
                                className="btn btn--secondary btn--lg"
                                onClick={() => navigate('/admin/members')}
                                id="cancel-edit-btn"
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default EditMemberPage;
