import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { carDetails, Member, MemberResponse } from '../types';

const MemberProfilePage: React.FC = () => {
    const { logout, fullName: authFullName } = useAuth();
    const navigate = useNavigate();

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    // Editable state
    const [phoneNumber, setPhoneNumber] = useState('');
    const [flatNo, setFlatNo] = useState('');
    const [bikeCount, setBikeCount] = useState(0);
    const [bikeRegs, setBikeRegs] = useState<string[]>([]);
    const [carCount, setCarCount] = useState(0);
    const [carRegs, setCarRegs] = useState<carDetails[]>([]);
    const [lastDayOfAgreement, setLastDayOfAgreement] = useState('');
    const [attachmentFile, setAttachmentFile] = useState<File | null>(null);

    // ── Load profile ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const res = await api.get<MemberResponse>('/member/profile');
                if (res.data.success) {
                    const m = res.data.data;
                    setMember(m);
                    setPhoneNumber(m.phoneNumber);
                    setFlatNo(m.flatNo || '');
                    setBikeCount(m.vehicles.bikes.count);
                    setBikeRegs([...m.vehicles.bikes.registrationNumbers]);
                    setCarCount(m.vehicles.cars.count);
                    setCarRegs([...m.vehicles.cars.list]);
                    setLastDayOfAgreement(
                        m.tenantDetails?.lastDayOfAgreement
                            ? new Date(m.tenantDetails.lastDayOfAgreement).toISOString().split('T')[0]
                            : ''
                    );
                }
            } catch (error: any) {
                toast.error(error.response?.data?.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetchProfile();
    }, []);

    // ── Bike helpers ──────────────────────────────────────────────────────────
    const handleBikeCountChange = (count: number) => {
        const n = Math.max(0, count);
        const regs = [...bikeRegs];
        while (regs.length < n) regs.push('');
        setBikeCount(n);
        setBikeRegs(regs.slice(0, n));
    };

    // ── Car helpers ───────────────────────────────────────────────────────────
    const handleCarCountChange = (count: number) => {
        const n = Math.max(0, count);
        const regs = [...carRegs];
        while (regs.length < n) regs.push({ regNo: '', fastTag: false, parkingSlot: '' });
        setCarCount(n);
        setCarRegs(regs.slice(0, n));
    };

    // ── Save ──────────────────────────────────────────────────────────────────
    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber)) {
            toast.error('Phone number must be exactly 10 digits');
            return;
        }
        if (!flatNo.trim()) {
            toast.error('Flat number is required');
            return;
        }
        for (let i = 0; i < bikeCount; i++) {
            if (!bikeRegs[i]?.trim()) {
                toast.error(`Bike registration #${i + 1} is required`);
                return;
            }
        }
        for (let i = 0; i < carCount; i++) {
            if (!carRegs[i]?.regNo.trim()) {
                toast.error(`Car registration #${i + 1} is required`);
                return;
            }
        }

        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('phoneNumber', phoneNumber);
            formData.append('flatNo', flatNo.trim());
            formData.append(
                'vehicles',
                JSON.stringify({
                    bikes: {
                        count: bikeCount,
                        registrationNumbers: bikeRegs.map((r) => r.trim().toUpperCase()),
                    },
                    cars: {
                        count: carCount,
                        list: carRegs.map((r) => ({
                            regNo: r.regNo.trim().toUpperCase(),
                            fastTag: r.fastTag,
                            parkingSlot: r.parkingSlot.trim(),
                        })),
                    },
                })
            );

            if (member?.type === 'tenant') {
                formData.append(
                    'tenantDetails',
                    JSON.stringify({ lastDayOfAgreement: lastDayOfAgreement || null })
                );
            }

            if (attachmentFile) {
                formData.append('attachment', attachmentFile);
            }

            const res = await api.put('/member/profile', formData);

            if (res.data.success) {
                toast.success('Profile updated successfully!');
                setMember(res.data.data);
                setAttachmentFile(null);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    // ── Loading state ─────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading your profile...</span>
            </div>
        );
    }

    if (!member) {
        return (
            <div className="page-wrapper">
                <div className="empty-state">
                    <div className="empty-state__icon">❌</div>
                    <h3 className="empty-state__title">Profile not found</h3>
                </div>
            </div>
        );
    }

    const currentAttachment =
        member.type === 'owner'
            ? member.ownerDetails?.index2
            : member.tenantDetails?.agreement;

    const attachmentLabel =
        member.type === 'owner' ? 'Index 2 Document' : 'Rental Agreement';

    return (
        <div className="app-layout">
            {/* Minimal navbar */}
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
                            <span>Wing {member.wing} · {member.flatNo}</span>
                        </div>
                        <button
                            className="btn btn--ghost btn--sm"
                            onClick={handleLogout}
                            id="member-logout-btn"
                        >
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div style={{ padding: '2rem 1rem', maxWidth: '720px', margin: '0 auto' }}>

                {/* Welcome banner */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800, #1e40af))',
                        borderRadius: 'var(--border-radius-lg)',
                        padding: '1.5rem 1.75rem',
                        marginBottom: '1.75rem',
                        color: '#fff',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '1rem',
                    }}
                >
                    <div style={{
                        width: '52px', height: '52px',
                        borderRadius: '50%',
                        background: 'rgba(255,255,255,0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', flexShrink: 0,
                    }}>
                        {member.type === 'owner' ? '🏠' : '📋'}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.15rem' }}>
                            Welcome, {authFullName || member.fullName}
                        </div>
                        <div style={{ opacity: 0.85, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                            Wing {member.wing} · Flat {member.flatNo} ·{' '}
                            {member.type === 'owner' ? 'Owner' : 'Tenant'}
                        </div>
                    </div>
                </div>

                {/* ── Read-only notice ── */}
                <div
                    style={{
                        background: 'var(--warning-50, #fffbeb)',
                        border: '1px solid var(--warning-200, #fde68a)',
                        borderRadius: 'var(--border-radius-md)',
                        padding: '0.75rem 1rem',
                        marginBottom: '1.5rem',
                        fontSize: '0.85rem',
                        color: 'var(--warning-700, #92400e)',
                    }}
                >
                    ℹ️ You can update your <strong>phone number</strong>, <strong>flat number</strong>,{' '}
                    <strong>vehicle details</strong>, and your <strong>{attachmentLabel}</strong>. Other fields are managed by your wing chairman.
                </div>

                <div className="card card--elevated">
                    <div className="card__header">
                        <h2 className="card__title">✏️ My Profile</h2>
                        <span className={`badge ${member.type === 'owner' ? 'badge--owner' : 'badge--tenant'}`}>
                            {member.type === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                        </span>
                    </div>
                    <div className="card__body">
                        <form onSubmit={handleSave} noValidate>

                            {/* Read-only */}
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

                            {/* Phone */}
                            <div className="form-group">
                                <label className="form-label form-label--required" htmlFor="member-edit-phone">
                                    Phone Number
                                </label>
                                <input
                                    id="member-edit-phone"
                                    type="tel"
                                    className="form-input"
                                    value={phoneNumber}
                                    maxLength={10}
                                    disabled
                                />
                            </div>

                            {/* Flat No */}
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label form-label--required" htmlFor="member-edit-flatno">
                                    Flat Number
                                </label>
                                <input
                                    id="member-edit-flatno"
                                    type="text"
                                    className="form-input"
                                    value={flatNo}
                                    disabled
                                />
                            </div>

                            {/* ── Bikes ─────────────────────────────────── */}
                            <div className="form-group" style={{ marginTop: '1rem' }}>
                                <label className="form-label" htmlFor="member-bike-count">
                                    Number of Bikes
                                </label>
                                <input
                                    id="member-bike-count"
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    value={bikeCount}
                                    onChange={(e) => handleBikeCountChange(parseInt(e.target.value) || 0)}
                                />
                            </div>

                            {bikeCount > 0 && (
                                <div className="dynamic-fields">
                                    <div className="dynamic-fields__title">🏍️ Bike Registration Numbers</div>
                                    {Array.from({ length: bikeCount }).map((_, i) => (
                                        <div className="form-group" key={`bike-${i}`}>
                                            <label className="form-label form-label--required" htmlFor={`member-bikeReg${i}`}>
                                                Bike #{i + 1}
                                            </label>
                                            <input
                                                id={`member-bikeReg${i}`}
                                                type="text"
                                                className="form-input"
                                                placeholder="e.g. MH12AB1234"
                                                value={bikeRegs[i] || ''}
                                                onChange={(e) => {
                                                    const r = [...bikeRegs];
                                                    r[i] = e.target.value;
                                                    setBikeRegs(r);
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Cars ──────────────────────────────────── */}
                            <div className="form-group" style={{ marginTop: bikeCount > 0 ? '1rem' : undefined }}>
                                <label className="form-label" htmlFor="member-car-count">
                                    Number of Cars
                                </label>
                                <input
                                    id="member-car-count"
                                    type="number"
                                    min="0"
                                    className="form-input"
                                    value={carCount}
                                    onChange={(e) => handleCarCountChange(parseInt(e.target.value) || 0)}
                                />
                            </div>

                            {carCount > 0 && (
                                <div className="dynamic-fields">
                                    <div className="dynamic-fields__title">🚗 Car Details</div>
                                    {Array.from({ length: carCount }).map((_, i) => (
                                        <div
                                            key={`car-${i}`}
                                            style={{
                                                border: '1px solid var(--border-color)',
                                                borderRadius: 'var(--border-radius-md)',
                                                padding: '1rem',
                                                marginBottom: '0.75rem',
                                                background: 'var(--gray-50)',
                                            }}
                                        >
                                            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                                                🚗 Car #{i + 1}
                                            </div>

                                            <div className="form-group">
                                                <label className="form-label form-label--required" htmlFor={`member-carReg${i}`}>
                                                    Registration Number
                                                </label>
                                                <input
                                                    id={`member-carReg${i}`}
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="e.g. MH14XY5678"
                                                    value={carRegs[i]?.regNo || ''}
                                                    onChange={(e) => {
                                                        const r = carRegs.map((c, idx) =>
                                                            idx === i ? { ...c, regNo: e.target.value } : c
                                                        );
                                                        setCarRegs(r);
                                                    }}
                                                />
                                            </div>

                                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                                <label className="form-label" htmlFor={`member-carParking${i}`}>
                                                    🅿️ Parking Slot
                                                </label>
                                                <input
                                                    id={`member-carParking${i}`}
                                                    type="text"
                                                    className="form-input"
                                                    placeholder="e.g. B-12"
                                                    value={carRegs[i]?.parkingSlot || ''}
                                                    onChange={(e) => {
                                                        const r = carRegs.map((c, idx) =>
                                                            idx === i ? { ...c, parkingSlot: e.target.value } : c
                                                        );
                                                        setCarRegs(r);
                                                    }}
                                                />
                                            </div>

                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem' }}>
                                                <input
                                                    id={`member-carFasttag${i}`}
                                                    type="checkbox"
                                                    style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                                                    checked={carRegs[i]?.fastTag || false}
                                                    onChange={(e) => {
                                                        const r = carRegs.map((c, idx) =>
                                                            idx === i ? { ...c, fastTag: e.target.checked } : c
                                                        );
                                                        setCarRegs(r);
                                                    }}
                                                />
                                                <label htmlFor={`member-carFasttag${i}`} style={{ cursor: 'pointer', fontWeight: 500, userSelect: 'none' }}>
                                                    📡 FASTag Enabled
                                                </label>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* ── Attachment ─────────────────────────────── */}
                            <div className="form-group" style={{ marginTop: '1.5rem' }}>
                                <label className="form-label">
                                    📎 {attachmentLabel}
                                </label>

                                {currentAttachment && !attachmentFile && (
                                    <div style={{
                                        padding: '0.75rem 1rem',
                                        background: 'var(--gray-50)',
                                        borderRadius: 'var(--border-radius-md)',
                                        marginBottom: '0.75rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}>
                                        <a
                                            href={currentAttachment}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            style={{ color: 'var(--primary-600)', fontWeight: 600, textDecoration: 'none' }}
                                        >
                                            📄 View Current File
                                        </a>
                                        <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                                            Upload a new file below to replace
                                        </span>
                                    </div>
                                )}

                                {attachmentFile && (
                                    <div style={{
                                        padding: '0.6rem 0.9rem',
                                        background: '#ecfdf5',
                                        border: '1px solid #6ee7b7',
                                        borderRadius: 'var(--border-radius-md)',
                                        marginBottom: '0.5rem',
                                        fontSize: '0.85rem',
                                        color: '#065f46',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                    }}>
                                        <span>✅ {attachmentFile.name}</span>
                                        <button
                                            type="button"
                                            onClick={() => setAttachmentFile(null)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}
                                        >
                                            ✕
                                        </button>
                                    </div>
                                )}

                                <input
                                    id="member-attachment"
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    className="form-input"
                                    style={{ padding: '0.4rem' }}
                                    onChange={(e) => setAttachmentFile(e.target.files?.[0] || null)}
                                />
                                <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                    Accepted: PDF, JPG, PNG · Max 10 MB
                                </small>
                            </div>

                            {/* Tenant: agreement expiry */}
                            {member.type === 'tenant' && (
                                <div className="form-group" style={{ marginTop: '1rem' }}>
                                    <label className="form-label form-label--required" htmlFor="member-lastDay">
                                        Last Day of Agreement
                                    </label>
                                    <input
                                        id="member-lastDay"
                                        type="date"
                                        className="form-input"
                                        value={lastDayOfAgreement}
                                        onChange={(e) => setLastDayOfAgreement(e.target.value)}
                                    />
                                </div>
                            )}

                            {/* Actions */}
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                                <button
                                    type="submit"
                                    className="btn btn--primary btn--lg"
                                    disabled={saving}
                                    style={{ flex: 1 }}
                                    id="member-save-btn"
                                >
                                    {saving ? (
                                        <><span className="spinner"></span> Saving...</>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                                <button
                                    type="button"
                                    className="btn btn--ghost btn--lg"
                                    onClick={handleLogout}
                                    id="member-logout-form-btn"
                                >
                                    Logout
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberProfilePage;
