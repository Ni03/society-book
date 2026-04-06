import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import type { Member, MemberResponse } from '../types';
import {
    MemberForm,
    LoadingScreen,
    EmptyState,
} from '../components/member';
import type { MemberFormData, MemberFormInitialValues } from '../components/member';

const MemberProfilePage: React.FC = () => {
    const { logout, fullName: authFullName } = useAuth();
    const navigate = useNavigate();

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialValues, setInitialValues] = useState<MemberFormInitialValues>({});

    // ── Fetch profile ─────────────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get<MemberResponse>('/member/profile');
                if (res.data.success) {
                    const m = res.data.data;
                    setMember(m);
                    setInitialValues({
                        fullName: m.fullName,
                        email: m.email ?? '',
                        caste: m.caste ?? '',
                        phoneNumber: m.phoneNumber,
                        flatNo: m.flatNo || '',
                        vehicles: {
                            bikes: { ...m.vehicles.bikes, registrationNumbers: [...m.vehicles.bikes.registrationNumbers] },
                            cars: { ...m.vehicles.cars, list: [...m.vehicles.cars.list] },
                        },
                        lastDayOfAgreement:
                            m.tenantDetails?.lastDayOfAgreement
                                ? new Date(m.tenantDetails.lastDayOfAgreement).toISOString().split('T')[0]
                                : '',
                        currentFileUrl:
                            m.type === 'owner'
                                ? m.ownerDetails?.index2
                                : m.tenantDetails?.agreement,
                    });
                }
            } catch (err: any) {
                toast.error(err.response?.data?.message || 'Failed to load profile');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, []);

    // ── Submit — parent handles the API call ──────────────────────────────────
    const handleSubmit = async (data: MemberFormData) => {
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('phoneNumber', data.phoneNumber);
            formData.append('email', data.email.trim());
            formData.append('caste', data.caste);
            formData.append('flatNo', data.flatNo.trim());
            formData.append('vehicles', JSON.stringify({
                bikes: {
                    count: data.vehicles.bikes.count,
                    registrationNumbers: data.vehicles.bikes.registrationNumbers.map((r) => r.trim().toUpperCase()),
                },
                cars: {
                    count: data.vehicles.cars.count,
                    list: data.vehicles.cars.list.map((r) => ({
                        regNo: r.regNo.trim().toUpperCase(),
                        fastTag: r.fastTag,
                        parkingSlot: r.parkingSlot.trim(),
                    })),
                },
            }));

            if (member?.type === 'tenant') {
                formData.append('tenantDetails', JSON.stringify({ lastDayOfAgreement: data.lastDayOfAgreement || null }));
            }
            if (data.file) formData.append('attachment', data.file);

            const res = await api.put('/member/profile', formData);
            if (res.data.success) {
                toast.success('Profile updated successfully!');
                setMember(res.data.data);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = () => { logout(); navigate('/login'); };

    // ── Guards ────────────────────────────────────────────────────────────────
    if (loading) return <LoadingScreen message="Loading your profile..." />;
    if (!member) return <EmptyState icon="❌" title="Profile not found" />;

    const attachmentLabel = member.type === 'owner' ? 'Index 2 Document' : 'Rental Agreement';

    return (
        <div className="app-layout">

            <div style={{ padding: '2rem 1rem', maxWidth: '720px', margin: '0 auto' }}>
                {/* Welcome banner */}
                <div style={{
                    background: 'linear-gradient(135deg, var(--primary-600), var(--primary-800, #1e40af))',
                    borderRadius: 'var(--border-radius-lg)', padding: '1.5rem 1.75rem',
                    marginBottom: '1.75rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '1rem',
                }}>
                    <div style={{
                        width: '52px', height: '52px', borderRadius: '50%',
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
                            Wing {member.wing} · Flat {member.flatNo} · {member.type === 'owner' ? 'Owner' : 'Tenant'}
                        </div>
                    </div>
                </div>

                {/* Notice */}
                <div style={{
                    background: 'var(--warning-50, #fffbeb)', border: '1px solid var(--warning-200, #fde68a)',
                    borderRadius: 'var(--border-radius-md)', padding: '0.75rem 1rem',
                    marginBottom: '1.5rem', fontSize: '0.85rem', color: 'var(--warning-700, #92400e)',
                }}>
                    ℹ️ You can update your <strong>vehicle details</strong> and your{' '}
                    <strong>{attachmentLabel}</strong>. Other fields are managed by your wing chairman.
                </div>

                <div className="card card--elevated">
                    <div className="card__header">
                        <h2 className="card__title">✏️ My Profile</h2>
                        <span className={`badge ${member.type === 'owner' ? 'badge--owner' : 'badge--tenant'}`}>
                            {member.type === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                        </span>
                    </div>
                    <div className="card__body">
                        <MemberForm
                            initialValues={initialValues}
                            config={{
                                memberType: member.type,
                                idPrefix: 'member',
                                // Personal fields — all read-only for member portal
                                showFullName: true,
                                fullNameEditable: false,
                                phoneEditable: false,
                                flatNoEditable: false,
                                // Attachment
                                fileMode: 'view-and-replace',
                                fileLabel: attachmentLabel,
                                fileRequired: true,
                                // Caste / email are read-only in member portal
                                emailEditable: true,
                                casteEditable: true,
                                // Submit
                                submitLabel: 'Save Changes',
                                submitting: saving,
                                extraActions: (
                                    <button
                                        type="button"
                                        className="btn btn--ghost btn--lg"
                                        onClick={handleLogout}
                                        id="member-logout-form-btn"
                                    >
                                        Logout
                                    </button>
                                ),
                            }}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MemberProfilePage;
