import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { Member, MemberResponse } from '../types';
import {
    MemberForm,
    LoadingScreen,
    EmptyState,
} from '../components/member';
import type { MemberFormData, MemberFormInitialValues } from '../components/member';

const EditMemberPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [member, setMember] = useState<Member | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [initialValues, setInitialValues] = useState<MemberFormInitialValues>({});

    // ── Fetch member ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await api.get<MemberResponse>(`/admin/members/${id}`);
                if (res.data.success) {
                    const m = res.data.data;
                    setMember(m);
                    setInitialValues({
                        fullName:    m.fullName,
                        phoneNumber: m.phoneNumber,
                        flatNo:      m.flatNo || '',
                        vehicles: {
                            bikes: { ...m.vehicles.bikes, registrationNumbers: [...m.vehicles.bikes.registrationNumbers] },
                            cars:  { ...m.vehicles.cars,  list: [...m.vehicles.cars.list] },
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
                toast.error(err.response?.data?.message || 'Failed to load member');
                navigate('/admin/members');
            } finally {
                setLoading(false);
            }
        };
        fetch();
    }, [id]);

    // ── Submit — parent handles the API call ──────────────────────────────────
    const handleSubmit = async (data: MemberFormData) => {
        setSaving(true);
        try {
            const payload: Record<string, unknown> = {
                phoneNumber: data.phoneNumber,
                flatNo:      data.flatNo.trim(),
                vehicles: {
                    bikes: {
                        count: data.vehicles.bikes.count,
                        registrationNumbers: data.vehicles.bikes.registrationNumbers.map((r) => r.trim().toUpperCase()),
                    },
                    cars: {
                        count: data.vehicles.cars.count,
                        list:  data.vehicles.cars.list.map((r) => ({
                            regNo:       r.regNo.trim().toUpperCase(),
                            fastTag:     r.fastTag,
                            parkingSlot: r.parkingSlot.trim(),
                        })),
                    },
                },
            };

            if (member?.type === 'tenant') {
                payload.tenantDetails = {
                    agreement:            initialValues.currentFileUrl ?? '',
                    lastDayOfAgreement:   data.lastDayOfAgreement || null,
                };
            }

            await api.put(`/admin/members/${id}`, payload);
            toast.success('Member updated successfully!');
            navigate('/admin/members');
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to update member');
        } finally {
            setSaving(false);
        }
    };

    // ── Guards ────────────────────────────────────────────────────────────────
    if (loading) return <LoadingScreen message="Loading member details..." />;
    if (!member)  return <EmptyState icon="❌" title="Member not found" />;

    const fileLabel = member.type === 'owner' ? 'Index 2 File' : 'Agreement File';

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
                    <h2 className="card__title">✏️ Edit Member</h2>
                    <span className={`badge ${member.type === 'owner' ? 'badge--owner' : 'badge--tenant'}`}>
                        {member.type === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                    </span>
                </div>
                <div className="card__body">
                    <MemberForm
                        initialValues={initialValues}
                        config={{
                            memberType:       member.type,
                            idPrefix:         'edit',
                            // Personal fields — fullName read-only, phone + flat editable
                            showFullName:     true,
                            fullNameEditable: false,
                            phoneEditable:    true,
                            flatNoEditable:   true,
                            // Wing display
                            showWing:         true,
                            wingDisplay:      `Wing ${member.wing}`,
                            // File — view only (admin doesn't re-upload)
                            fileMode:         'view-only',
                            fileLabel,
                            // Submit
                            submitLabel:      'Save Changes',
                            submitting:       saving,
                            extraActions: (
                                <button
                                    type="button"
                                    className="btn btn--secondary btn--lg"
                                    onClick={() => navigate('/admin/members')}
                                    id="cancel-edit-btn"
                                >
                                    Cancel
                                </button>
                            ),
                        }}
                        onSubmit={handleSubmit}
                    />
                </div>
            </div>
        </div>
    );
};

export default EditMemberPage;
