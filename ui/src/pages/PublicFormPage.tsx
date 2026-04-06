import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { VALID_WINGS, VALID_TYPES } from '../types';
import type { WingType, MemberType } from '../types';
import { MemberForm, emptyVehicles } from '../components/member';
import type { MemberFormData } from '../components/member';

const PublicFormPage: React.FC = () => {
    const { wing, type } = useParams<{ wing: string; type: string }>();

    const wingUpper = (wing?.toUpperCase() || '') as WingType;
    const typeLower = (type?.toLowerCase() || '') as MemberType;

    const isValidWing = VALID_WINGS.includes(wingUpper);
    const isValidType = VALID_TYPES.includes(typeLower);

    const [loading, setLoading]     = useState(false);
    const [submitted, setSubmitted] = useState(false);

    // ── Invalid URL guard ─────────────────────────────────────────────────────
    if (!isValidWing || !isValidType) {
        return (
            <div className="app-layout">
                <div className="hero">
                    <div className="hero__content">
                        <h1 className="hero__title">Invalid URL</h1>
                        <p className="hero__subtitle">
                            Please use a valid URL format: /public/A-K/owner or /public/A-K/tenant
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // ── Submit — parent handles the API call ──────────────────────────────────
    const handleSubmit = async (data: MemberFormData) => {
        setLoading(true);
        try {
            const payload = new FormData();
            payload.append('fullName',    data.fullName.trim());
            payload.append('email',       data.email.trim());
            payload.append('caste',       data.caste);
            payload.append('phoneNumber', data.phoneNumber);
            payload.append('flatNo',      data.flatNo.trim());
            payload.append('wing',        wingUpper);
            payload.append('type',        typeLower);
            payload.append('vehicles', JSON.stringify({
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
            }));

            if (typeLower === 'owner') {
                if (data.file) payload.append('index2', data.file);
            } else {
                if (data.file) payload.append('agreement', data.file);
                payload.append('tenantDetails', JSON.stringify({ lastDayOfAgreement: data.lastDayOfAgreement }));
            }

            await api.post('/public/member', payload, { headers: { 'Content-Type': 'multipart/form-data' } });
            toast.success('Member registered successfully!');
            setSubmitted(true);
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to register member');
        } finally {
            setLoading(false);
        }
    };

    // ── Initial values (blank for public form) ────────────────────────────────
    const blankValues = { vehicles: emptyVehicles() };

    // ── Success screen ────────────────────────────────────────────────────────
    if (submitted) {
        return (
            <div className="app-layout">
                <div className="hero">
                    <div className="hero__content">
                        <div className="hero__wing-badge">🏢 Wing {wingUpper}</div>
                        <h1 className="hero__title">Society Book Registration</h1>
                    </div>
                </div>
                <div className="container container--narrow" style={{ padding: '2rem' }}>
                    <div className="success-screen">
                        <div className="success-screen__icon">✓</div>
                        <h2 className="success-screen__title">Registration Successful!</h2>
                        <p className="success-screen__message">
                            Your details have been recorded for Wing {wingUpper} as{' '}
                            {typeLower === 'owner' ? 'an Owner' : 'a Tenant'}.
                        </p>
                        <button
                            className="btn btn--primary btn--lg"
                            onClick={() => setSubmitted(false)}
                            id="register-another-btn"
                        >
                            Register Another Member
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // ── Form ──────────────────────────────────────────────────────────────────
    return (
        <div className="app-layout">
            <div className="hero">
                <div className="hero__content">
                    <div className="hero__wing-badge">
                        🏢 Wing {wingUpper} · {typeLower === 'owner' ? '🏠 Owner' : '📋 Tenant'}
                    </div>
                    <h1 className="hero__title">Society Book Registration</h1>
                    <p className="hero__subtitle">
                        Fill in your details to register as {typeLower === 'owner' ? 'an owner' : 'a tenant'} in Wing {wingUpper}
                    </p>
                </div>
            </div>

            <div className="container container--narrow" style={{ padding: '2rem 1.5rem' }}>
                <div className="card card--elevated">
                    <div className="card__body">
                        <MemberForm
                            initialValues={blankValues}
                            config={{
                                memberType:       typeLower,
                                idPrefix:         'pub',
                                // All personal fields visible & editable
                                showFullName:     true,
                                fullNameEditable: true,
                                phoneEditable:    true,
                                flatNoEditable:   true,
                                // Show read-only wing & type from URL
                                showWing:         true,
                                wingDisplay:      `Wing ${wingUpper}`,
                                showType:         true,
                                typeDisplay:      typeLower === 'owner' ? 'Owner' : 'Tenant',
                                // File upload required
                                fileMode:         'upload',
                                fileLabel:        typeLower === 'owner' ? 'Index 2 Document' : 'Rental Agreement',
                                fileRequired:     true,
                                // Inline validation for public form UX
                                validationStyle:  'inline',
                                // Submit
                                submitLabel:      'Submit Registration',
                                submitting:       loading,
                            }}
                            onSubmit={handleSubmit}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicFormPage;
