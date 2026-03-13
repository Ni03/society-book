import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import api from '../api/axios';
import { VALID_WINGS, VALID_TYPES } from '../types';
import type { WingType, MemberType } from '../types';

interface FormErrors {
    [key: string]: string;
}

const PublicFormPage: React.FC = () => {
    const { wing, type } = useParams<{ wing: string; type: string }>();
    const navigate = useNavigate();

    const wingUpper = (wing?.toUpperCase() || '') as WingType;
    const typeLower = (type?.toLowerCase() || '') as MemberType;

    const isValidWing = VALID_WINGS.includes(wingUpper);
    const isValidType = VALID_TYPES.includes(typeLower);

    const [formData, setFormData] = useState({
        fullName: '',
        phoneNumber: '',
        flatNo: '',
        bikeCount: 0,
        bikeRegistrations: [] as string[],
        carCount: 0,
        carRegistrations: [] as string[],
        index2: null as File | null,
        agreement: null as File | null,
        lastDayOfAgreement: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [loading, setLoading] = useState(false);
    const [submitted, setSubmitted] = useState(false);

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

    const validate = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.fullName || formData.fullName.trim().length < 3) {
            newErrors.fullName = 'Full name must be at least 3 characters';
        }

        if (!formData.phoneNumber || !/^\d{10}$/.test(formData.phoneNumber)) {
            newErrors.phoneNumber = 'Phone number must be exactly 10 digits';
        }

        if (!formData.flatNo || formData.flatNo.trim().length === 0) {
            newErrors.flatNo = 'Flat number is required';
        }

        if (formData.bikeCount < 0) {
            newErrors.bikeCount = 'Bike count cannot be negative';
        }

        if (formData.bikeCount > 0) {
            for (let i = 0; i < formData.bikeCount; i++) {
                if (!formData.bikeRegistrations[i]?.trim()) {
                    newErrors[`bikeReg${i}`] = `Bike registration #${i + 1} is required`;
                }
            }
        }

        if (formData.carCount < 0) {
            newErrors.carCount = 'Car count cannot be negative';
        }

        if (formData.carCount > 0) {
            for (let i = 0; i < formData.carCount; i++) {
                if (!formData.carRegistrations[i]?.trim()) {
                    newErrors[`carReg${i}`] = `Car registration #${i + 1} is required`;
                }
            }
        }

        if (typeLower === 'owner') {
            if (!formData.index2) {
                newErrors.index2 = 'Index 2 document is required for owners';
            }
        }

        if (typeLower === 'tenant') {
            if (!formData.agreement) {
                newErrors.agreement = 'Agreement file is required for tenants';
            }
            if (!formData.lastDayOfAgreement) {
                newErrors.lastDayOfAgreement = 'Last day of agreement is required';
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleBikeCountChange = (count: number) => {
        const newCount = Math.max(0, count);
        const newRegs = [...formData.bikeRegistrations];
        while (newRegs.length < newCount) newRegs.push('');
        setFormData({
            ...formData,
            bikeCount: newCount,
            bikeRegistrations: newRegs.slice(0, newCount),
        });
    };

    const handleCarCountChange = (count: number) => {
        const newCount = Math.max(0, count);
        const newRegs = [...formData.carRegistrations];
        while (newRegs.length < newCount) newRegs.push('');
        setFormData({
            ...formData,
            carCount: newCount,
            carRegistrations: newRegs.slice(0, newCount),
        });
    };

    const handleBikeRegChange = (index: number, value: string) => {
        const newRegs = [...formData.bikeRegistrations];
        newRegs[index] = value;
        setFormData({ ...formData, bikeRegistrations: newRegs });
    };

    const handleCarRegChange = (index: number, value: string) => {
        const newRegs = [...formData.carRegistrations];
        newRegs[index] = value;
        setFormData({ ...formData, carRegistrations: newRegs });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validate()) {
            toast.error('Please fix the errors before submitting');
            return;
        }

        setLoading(true);

        try {
            const formDataPayload = new FormData();
            formDataPayload.append('fullName', formData.fullName.trim());
            formDataPayload.append('phoneNumber', formData.phoneNumber);
            formDataPayload.append('flatNo', formData.flatNo.trim());
            formDataPayload.append('wing', wingUpper);
            formDataPayload.append('type', typeLower);

            formDataPayload.append('vehicles', JSON.stringify({
                bikes: {
                    count: formData.bikeCount,
                    registrationNumbers: formData.bikeRegistrations.map((r) =>
                        r.trim().toUpperCase()
                    ),
                },
                cars: {
                    count: formData.carCount,
                    registrationNumbers: formData.carRegistrations.map((r) =>
                        r.trim().toUpperCase()
                    ),
                },
            }));

            if (typeLower === 'owner') {
                if (formData.index2) {
                    formDataPayload.append('index2', formData.index2);
                }
            } else {
                if (formData.agreement) {
                    formDataPayload.append('agreement', formData.agreement);
                }
                formDataPayload.append('tenantDetails', JSON.stringify({
                    lastDayOfAgreement: formData.lastDayOfAgreement,
                }));
            }

            await api.post('/public/member', formDataPayload, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Member registered successfully!');
            setSubmitted(true);
        } catch (error: any) {
            const message =
                error.response?.data?.message || 'Failed to register member';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    if (submitted) {
        return (
            <div className="app-layout">
                <div className="hero">
                    <div className="hero__content">
                        <div className="hero__wing-badge">
                            🏢 Wing {wingUpper}
                        </div>
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
                            onClick={() => {
                                setSubmitted(false);
                                setFormData({
                                    fullName: '',
                                    phoneNumber: '',
                                    flatNo: '',
                                    bikeCount: 0,
                                    bikeRegistrations: [],
                                    carCount: 0,
                                    carRegistrations: [],
                                    index2: null,
                                    agreement: null,
                                    lastDayOfAgreement: '',
                                });
                            }}
                            id="register-another-btn"
                        >
                            Register Another Member
                        </button>
                    </div>
                </div>
            </div>
        );
    }

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
                        <form onSubmit={handleSubmit} noValidate>
                            {/* Full Name */}
                            <div className="form-group">
                                <label className="form-label form-label--required" htmlFor="fullName">
                                    Full Name
                                </label>
                                <input
                                    id="fullName"
                                    type="text"
                                    className={`form-input ${errors.fullName ? 'form-input--error' : ''}`}
                                    placeholder="Enter your full name"
                                    value={formData.fullName}
                                    onChange={(e) =>
                                        setFormData({ ...formData, fullName: e.target.value })
                                    }
                                />
                                {errors.fullName && (
                                    <div className="form-error">⚠ {errors.fullName}</div>
                                )}
                            </div>

                            {/* Phone Number */}
                            <div className="form-group">
                                <label className="form-label form-label--required" htmlFor="phoneNumber">
                                    Phone Number
                                </label>
                                <input
                                    id="phoneNumber"
                                    type="tel"
                                    className={`form-input ${errors.phoneNumber ? 'form-input--error' : ''}`}
                                    placeholder="Enter 10-digit phone number"
                                    value={formData.phoneNumber}
                                    onChange={(e) => {
                                        const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                        setFormData({ ...formData, phoneNumber: val });
                                    }}
                                />
                                {errors.phoneNumber && (
                                    <div className="form-error">⚠ {errors.phoneNumber}</div>
                                )}
                            </div>

                            {/* Flat No */}
                            <div className="form-group">
                                <label className="form-label form-label--required" htmlFor="flatNo">
                                    Flat Number
                                </label>
                                <input
                                    id="flatNo"
                                    type="text"
                                    className={`form-input ${errors.flatNo ? 'form-input--error' : ''}`}
                                    placeholder="Enter flat number (e.g. 101)"
                                    value={formData.flatNo}
                                    onChange={(e) =>
                                        setFormData({ ...formData, flatNo: e.target.value })
                                    }
                                />
                                {errors.flatNo && (
                                    <div className="form-error">⚠ {errors.flatNo}</div>
                                )}
                            </div>

                            {/* Wing & Type (read-only) */}
                            <div className="form-row">
                                <div className="form-group">
                                    <label className="form-label">Wing</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={`Wing ${wingUpper}`}
                                        disabled
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Type</label>
                                    <input
                                        type="text"
                                        className="form-input"
                                        value={typeLower === 'owner' ? 'Owner' : 'Tenant'}
                                        disabled
                                    />
                                </div>
                            </div>

                            {/* Bikes */}
                            <div className="form-group">
                                <label className="form-label form-label--required" htmlFor="bikeCount">
                                    Number of Bikes
                                </label>
                                <input
                                    id="bikeCount"
                                    type="number"
                                    min="0"
                                    className={`form-input ${errors.bikeCount ? 'form-input--error' : ''}`}
                                    value={formData.bikeCount}
                                    onChange={(e) => handleBikeCountChange(parseInt(e.target.value) || 0)}
                                />
                                {errors.bikeCount && (
                                    <div className="form-error">⚠ {errors.bikeCount}</div>
                                )}
                            </div>

                            {formData.bikeCount > 0 && (
                                <div className="dynamic-fields">
                                    <div className="dynamic-fields__title">
                                        🏍️ Bike Registration Numbers
                                    </div>
                                    {Array.from({ length: formData.bikeCount }).map((_, i) => (
                                        <div className="form-group" key={`bike-${i}`}>
                                            <label className="form-label form-label--required" htmlFor={`bikeReg${i}`}>
                                                Bike #{i + 1} Registration
                                            </label>
                                            <input
                                                id={`bikeReg${i}`}
                                                type="text"
                                                className={`form-input ${errors[`bikeReg${i}`] ? 'form-input--error' : ''}`}
                                                placeholder="e.g. MH12AB1234"
                                                value={formData.bikeRegistrations[i] || ''}
                                                onChange={(e) => handleBikeRegChange(i, e.target.value)}
                                            />
                                            {errors[`bikeReg${i}`] && (
                                                <div className="form-error">⚠ {errors[`bikeReg${i}`]}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Cars */}
                            <div className="form-group" style={{ marginTop: formData.bikeCount > 0 ? '1.25rem' : undefined }}>
                                <label className="form-label form-label--required" htmlFor="carCount">
                                    Number of Cars
                                </label>
                                <input
                                    id="carCount"
                                    type="number"
                                    min="0"
                                    className={`form-input ${errors.carCount ? 'form-input--error' : ''}`}
                                    value={formData.carCount}
                                    onChange={(e) => handleCarCountChange(parseInt(e.target.value) || 0)}
                                />
                                {errors.carCount && (
                                    <div className="form-error">⚠ {errors.carCount}</div>
                                )}
                            </div>

                            {formData.carCount > 0 && (
                                <div className="dynamic-fields">
                                    <div className="dynamic-fields__title">
                                        🚗 Car Registration Numbers
                                    </div>
                                    {Array.from({ length: formData.carCount }).map((_, i) => (
                                        <div className="form-group" key={`car-${i}`}>
                                            <label className="form-label form-label--required" htmlFor={`carReg${i}`}>
                                                Car #{i + 1} Registration
                                            </label>
                                            <input
                                                id={`carReg${i}`}
                                                type="text"
                                                className={`form-input ${errors[`carReg${i}`] ? 'form-input--error' : ''}`}
                                                placeholder="e.g. MH14XY5678"
                                                value={formData.carRegistrations[i] || ''}
                                                onChange={(e) => handleCarRegChange(i, e.target.value)}
                                            />
                                            {errors[`carReg${i}`] && (
                                                <div className="form-error">⚠ {errors[`carReg${i}`]}</div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Owner-specific: index2 */}
                            {typeLower === 'owner' && (
                                <div className="form-group" style={{ marginTop: '1.25rem' }}>
                                    <label className="form-label form-label--required" htmlFor="index2">
                                        Index 2
                                    </label>
                                    <input
                                        id="index2"
                                        type="file"
                                        accept="image/*,.pdf"
                                        className={`form-input ${errors.index2 ? 'form-input--error' : ''}`}
                                        onChange={(e) => {
                                            const file = e.target.files ? e.target.files[0] : null;
                                            setFormData({ ...formData, index2: file });
                                        }}
                                        style={{ padding: '0.5rem' }}
                                    />
                                    {errors.index2 && (
                                        <div className="form-error">⚠ {errors.index2}</div>
                                    )}
                                </div>
                            )}

                            {/* Tenant-specific: agreement + lastDayOfAgreement */}
                            {typeLower === 'tenant' && (
                                <>
                                    <div className="form-group" style={{ marginTop: '1.25rem' }}>
                                        <label className="form-label form-label--required" htmlFor="agreement">
                                            Agreement File
                                        </label>
                                        <input
                                            id="agreement"
                                            type="file"
                                            accept="image/*,.pdf"
                                            className={`form-input ${errors.agreement ? 'form-input--error' : ''}`}
                                            onChange={(e) => {
                                                const file = e.target.files ? e.target.files[0] : null;
                                                setFormData({ ...formData, agreement: file });
                                            }}
                                            style={{ padding: '0.5rem' }}
                                        />
                                        {errors.agreement && (
                                            <div className="form-error">⚠ {errors.agreement}</div>
                                        )}
                                    </div>

                                    <div className="form-group">
                                        <label
                                            className="form-label form-label--required"
                                            htmlFor="lastDayOfAgreement"
                                        >
                                            Last Day of Agreement
                                        </label>
                                        <input
                                            id="lastDayOfAgreement"
                                            type="date"
                                            className={`form-input ${errors.lastDayOfAgreement ? 'form-input--error' : ''}`}
                                            value={formData.lastDayOfAgreement}
                                            onChange={(e) =>
                                                setFormData({
                                                    ...formData,
                                                    lastDayOfAgreement: e.target.value,
                                                })
                                            }
                                        />
                                        {errors.lastDayOfAgreement && (
                                            <div className="form-error">
                                                ⚠ {errors.lastDayOfAgreement}
                                            </div>
                                        )}
                                    </div>
                                </>
                            )}

                            <button
                                type="submit"
                                className="btn btn--primary btn--lg btn--block"
                                disabled={loading}
                                style={{ marginTop: '1.5rem' }}
                                id="submit-member-btn"
                            >
                                {loading ? (
                                    <>
                                        <span className="spinner"></span>
                                        Submitting...
                                    </>
                                ) : (
                                    'Submit Registration'
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PublicFormPage;
