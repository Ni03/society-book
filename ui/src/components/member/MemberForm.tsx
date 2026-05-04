import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { MemberVehicles, CasteType } from '../../types';
import { CASTE_OPTIONS } from '../../types';
import { VehicleSection, emptyVehicles, FileViewLink, FormField } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Public types — import these in parent pages
// ─────────────────────────────────────────────────────────────────────────────

/** Values the parent page pre-fills the form with */
export interface MemberFormInitialValues {
    firstName?: string;
    middleName?: string;
    lastName?: string;
    email?: string;
    caste?: CasteType | '';
    birthDate?: string;
    phoneNumber?: string;
    flatNo?: string;
    vehicles?: MemberVehicles;
    lastDayOfAgreement?: string;
    /** URL of an already-uploaded file (owner index2 / tenant agreement) */
    currentFileUrl?: string | null;
}

/** Data emitted to the parent when the form is submitted */
export interface MemberFormData {
    firstName: string;
    middleName: string;
    lastName: string;
    email: string;
    caste: CasteType | '';
    birthDate: string;
    phoneNumber: string;
    flatNo: string;
    vehicles: MemberVehicles;
    lastDayOfAgreement: string;
    /** The newly selected file to upload, or null if unchanged */
    file: File | null;
}

/**
 * Controls what the form shows and how it behaves.
 * Each page passes a different config — no page-specific logic lives here.
 */
export interface MemberFormConfig {
    /** 'owner' | 'tenant' — drives conditional sections */
    memberType: 'owner' | 'tenant';

    // ── Field visibility / editability ───────────────────────────────────────
    /** Show the name section (First / Middle / Last Name). Default: false */
    showFullName?: boolean;
    /** Allow editing name fields. Default: false */
    fullNameEditable?: boolean;

    /** Allow editing Phone Number. Default: true */
    phoneEditable?: boolean;
    /** Allow editing Flat Number. Default: true */
    flatNoEditable?: boolean;
    /** Allow editing Email. Default: true */
    emailEditable?: boolean;
    /** Allow editing Caste. Default: true */
    casteEditable?: boolean;
    /** Allow editing Birth Date. Default: true */
    birthDateEditable?: boolean;

    /** Show a read-only Wing field. Default: false */
    showWing?: boolean;
    wingDisplay?: string;

    /** Show a read-only Type (Owner/Tenant) field. Default: false */
    showType?: boolean;
    typeDisplay?: string;

    // ── Attachment / file section ────────────────────────────────────────────
    /**
     * - 'none'             → hide the file section
     * - 'upload'           → file input only (PublicFormPage)
     * - 'view-and-replace' → view current + optional upload (MemberProfilePage)
     * - 'view-only'        → view current, no upload (EditMemberPage)
     */
    fileMode?: 'none' | 'upload' | 'view-and-replace' | 'view-only';
    fileLabel?: string;
    /**
     * In 'upload' mode: file is always required.
     * In 'view-and-replace' mode: file is required only when no currentFileUrl exists.
     * Default: false
     */
    fileRequired?: boolean;

    // ── Submit button ────────────────────────────────────────────────────────
    submitLabel?: string;
    submitting?: boolean;
    extraActions?: React.ReactNode;

    // ── Validation style ─────────────────────────────────────────────────────
    /** 'toast' (default) | 'inline' */
    validationStyle?: 'toast' | 'inline';

    /** Unique prefix for element ids */
    idPrefix?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    initialValues?: MemberFormInitialValues;
    config: MemberFormConfig;
    onSubmit: (data: MemberFormData) => void | Promise<void>;
}

/**
 * MemberForm — single form component used across all three pages.
 *
 * ┌──────────────────────────────────────────────────────────────┐
 * │ To ADD a field:    add state + JSX + validation here        │
 * │ To REMOVE a field: delete state + JSX here                  │
 * │ Pages never need to change for field additions/removals     │
 * └──────────────────────────────────────────────────────────────┘
 */
const MemberForm: React.FC<Props> = ({ initialValues = {}, config, onSubmit }) => {
    const {
        memberType,
        showFullName       = false,
        fullNameEditable   = false,
        phoneEditable      = true,
        flatNoEditable     = true,
        emailEditable      = true,
        casteEditable      = true,
        birthDateEditable  = true,
        showWing           = false,
        wingDisplay        = '',
        showType           = false,
        typeDisplay        = '',
        fileMode           = 'none',
        fileLabel          = memberType === 'owner' ? 'Index 2 Document' : 'Rental Agreement',
        fileRequired       = false,
        submitLabel        = 'Save Changes',
        submitting         = false,
        extraActions,
        validationStyle    = 'toast',
        idPrefix           = 'mf',
    } = config;

    // ── Internal state — ADD NEW FIELDS HERE ─────────────────────────────────
    const [firstName,          setFirstName]          = useState(initialValues.firstName          ?? '');
    const [middleName,         setMiddleName]         = useState(initialValues.middleName         ?? '');
    const [lastName,           setLastName]           = useState(initialValues.lastName           ?? '');
    const [email,              setEmail]              = useState(initialValues.email              ?? '');
    const [caste,              setCaste]              = useState<CasteType | ''>(initialValues.caste ?? '');
    const [birthDate,          setBirthDate]          = useState(initialValues.birthDate          ?? '');
    const [phoneNumber,        setPhoneNumber]        = useState(initialValues.phoneNumber        ?? '');
    const [flatNo,             setFlatNo]             = useState(initialValues.flatNo             ?? '');
    const [vehicles,           setVehicles]           = useState<MemberVehicles>(initialValues.vehicles ?? emptyVehicles());
    const [lastDayOfAgreement, setLastDayOfAgreement] = useState(initialValues.lastDayOfAgreement ?? '');
    const [file,               setFile]               = useState<File | null>(null);

    // Inline validation errors
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Re-sync when initialValues change (after async fetch)
    useEffect(() => {
        setFirstName(          initialValues.firstName          ?? '');
        setMiddleName(         initialValues.middleName         ?? '');
        setLastName(           initialValues.lastName           ?? '');
        setEmail(              initialValues.email              ?? '');
        setCaste(              initialValues.caste              ?? '');
        setBirthDate(          initialValues.birthDate          ?? '');
        setPhoneNumber(        initialValues.phoneNumber        ?? '');
        setFlatNo(             initialValues.flatNo             ?? '');
        setVehicles(           initialValues.vehicles           ?? emptyVehicles());
        setLastDayOfAgreement( initialValues.lastDayOfAgreement ?? '');
        setFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initialValues)]);

    // ── Validation — ADD NEW FIELD RULES HERE ────────────────────────────────
    const validate = (): boolean => {
        const inline: Record<string, string> = {};
        const toasts: string[] = [];

        const err = (key: string, msg: string) => {
            if (validationStyle === 'inline') inline[key] = msg;
            else toasts.push(msg);
        };

        if (showFullName && fullNameEditable) {
            if (!firstName || firstName.trim().length < 2)
                err('firstName', 'First name must be at least 2 characters');
            if (!lastName || lastName.trim().length < 2)
                err('lastName', 'Last name must be at least 2 characters');
        }

        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            err('email', 'A valid email address is required');

        if (!caste)
            err('caste', 'Caste is required');

        if (!birthDate)
            err('birthDate', 'Birth date is required');

        if (!phoneNumber || !/^\d{10}$/.test(phoneNumber))
            err('phoneNumber', 'Phone number must be exactly 10 digits');

        if (!flatNo.trim())
            err('flatNo', 'Flat number is required');

        // Bikes
        for (let i = 0; i < vehicles.bikes.count; i++) {
            if (!vehicles.bikes.registrationNumbers[i]?.trim())
                err(`bikeReg${i}`, `Bike registration #${i + 1} is required`);
        }

        // Cars
        for (let i = 0; i < vehicles.cars.count; i++) {
            if (!vehicles.cars.list[i]?.regNo?.trim())
                err(`carReg${i}`, `Car registration #${i + 1} is required`);
        }

        // Tenant: last day
        if (memberType === 'tenant' && !lastDayOfAgreement)
            err('lastDayOfAgreement', 'Last day of agreement is required');

        // File: required in 'upload' mode, OR in 'view-and-replace' when no existing file
        const fileIsRequired =
            fileRequired &&
            (fileMode === 'upload' ||
                (fileMode === 'view-and-replace' && !initialValues.currentFileUrl));

        if (fileIsRequired && !file)
            err('file', `${fileLabel} is required`);

        if (validationStyle === 'toast') {
            if (toasts.length > 0) { toast.error(toasts[0]); return false; }
        } else {
            setErrors(inline);
            if (Object.keys(inline).length > 0) {
                toast.error('Please fix the errors before submitting');
                return false;
            }
        }

        setErrors({});
        return true;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit({ firstName, middleName, lastName, email, caste, birthDate, phoneNumber, flatNo, vehicles, lastDayOfAgreement, file });
    };

    // ── Render — ADD NEW FIELD JSX HERE ──────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} noValidate>

            {/* Name Fields — First Name, Last Name (required), Middle Name (optional) */}
            {showFullName && (
                <>
                    <div style={{
                        display: 'grid', gridTemplateColumns: '1fr 1fr',
                        gap: '1rem', marginTop: '1rem',
                    }}>
                        <FormField
                            id={`${idPrefix}-firstName`}
                            label="First Name"
                            value={firstName}
                            placeholder="Enter first name"
                            required={fullNameEditable}
                            disabled={!fullNameEditable}
                            error={errors.firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                        />
                        <FormField
                            id={`${idPrefix}-lastName`}
                            label="Last Name"
                            value={lastName}
                            placeholder="Enter last name"
                            required={fullNameEditable}
                            disabled={!fullNameEditable}
                            error={errors.lastName}
                            onChange={(e) => setLastName(e.target.value)}
                        />
                    </div>
                    <FormField
                        id={`${idPrefix}-middleName`}
                        label="Middle Name"
                        value={middleName}
                        placeholder="Enter middle name (optional)"
                        disabled={!fullNameEditable}
                        onChange={(e) => setMiddleName(e.target.value)}
                        style={{ marginTop: '1rem' }}
                    />
                </>
            )}

            {/* Email */}
            <FormField
                id={`${idPrefix}-email`}
                label="Email Address"
                type="email"
                value={email}
                placeholder="Enter your email address"
                required
                disabled={!emailEditable}
                error={errors.email}
                onChange={(e) => setEmail(e.target.value)}
            />

            {/* Caste */}
            <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label form-label--required" htmlFor={`${idPrefix}-caste`}>
                    Caste
                </label>
                <select
                    id={`${idPrefix}-caste`}
                    className={`form-input${errors.caste ? ' form-input--error' : ''}`}
                    value={caste}
                    disabled={!casteEditable}
                    onChange={(e) => setCaste(e.target.value as CasteType)}
                >
                    <option value="" disabled>Select caste category</option>
                    {CASTE_OPTIONS.map((c) => (
                        <option key={c} value={c}>{c}</option>
                    ))}
                </select>
                {errors.caste && <div className="form-error">⚠ {errors.caste}</div>}
            </div>

            {/* Birth Date */}
            <FormField
                id={`${idPrefix}-birthDate`}
                label="Birth Date"
                type="date"
                value={birthDate}
                required
                disabled={!birthDateEditable}
                error={errors.birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                style={{ marginTop: '1rem' }}
            />

            {/* Phone Number */}
            <FormField
                id={`${idPrefix}-phone`}
                label="Phone Number"
                type="tel"
                value={phoneNumber}
                placeholder="Enter 10-digit phone number"
                required={phoneEditable}
                disabled={!phoneEditable}
                maxLength={10}
                error={errors.phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                style={{ marginTop: '1rem' }}
            />

            {/* Flat Number */}
            <FormField
                id={`${idPrefix}-flatNo`}
                label="Flat Number"
                value={flatNo}
                placeholder="Enter flat number (e.g. 101)"
                required={flatNoEditable}
                disabled={!flatNoEditable}
                error={errors.flatNo}
                onChange={(e) => setFlatNo(e.target.value)}
                style={{ marginTop: '1rem' }}
            />

            {/* Wing & Type (read-only display) */}
            {(showWing || showType) && (
                <div className="form-row">
                    {showWing && (
                        <FormField id={`${idPrefix}-wing`} label="Wing" value={wingDisplay} disabled />
                    )}
                    {showType && (
                        <FormField id={`${idPrefix}-type`} label="Type" value={typeDisplay} disabled />
                    )}
                </div>
            )}

            {/* ── Vehicles ─────────────────────────────────────────────────── */}
            <div style={{ marginTop: '1rem' }}>
                <VehicleSection
                    value={vehicles}
                    onChange={setVehicles}
                    idPrefix={idPrefix}
                    errors={errors}
                />
            </div>

            {/* ── Attachment / File section ─────────────────────────────────── */}
            {fileMode !== 'none' && (
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label className={`form-label${fileRequired ? ' form-label--required' : ''}`}>
                        📎 {fileLabel}
                    </label>

                    {/* View existing file */}
                    {(fileMode === 'view-only' || fileMode === 'view-and-replace') && (
                        <FileViewLink
                            fileUrl={initialValues.currentFileUrl}
                            linkText="📄 View Current File"
                            showReplaceHint={fileMode === 'view-and-replace' && !file}
                        />
                    )}

                    {/* Newly selected file preview */}
                    {file && (fileMode === 'upload' || fileMode === 'view-and-replace') && (
                        <div style={{
                            padding: '0.6rem 0.9rem', background: '#ecfdf5',
                            border: '1px solid #6ee7b7', borderRadius: 'var(--border-radius-md)',
                            marginBottom: '0.5rem', fontSize: '0.85rem', color: '#065f46',
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span>✅ {file.name}</span>
                            <button type="button" onClick={() => setFile(null)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontWeight: 700 }}>
                                ✕
                            </button>
                        </div>
                    )}

                    {/* File input */}
                    {(fileMode === 'upload' || fileMode === 'view-and-replace') && (
                        <>
                            <input
                                id={`${idPrefix}-file`}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,image/*"
                                className={`form-input${errors.file ? ' form-input--error' : ''}`}
                                style={{ padding: '0.4rem' }}
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                            />
                            <small style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                Accepted: PDF, JPG, PNG · Max 10 MB
                            </small>
                            {errors.file && <div className="form-error">⚠ {errors.file}</div>}
                        </>
                    )}
                </div>
            )}

            {/* ── Tenant: Last Day of Agreement ─────────────────────────────── */}
            {memberType === 'tenant' && (
                <FormField
                    id={`${idPrefix}-lastDay`}
                    label="Last Day of Agreement"
                    type="date"
                    value={lastDayOfAgreement}
                    required
                    error={errors.lastDayOfAgreement}
                    onChange={(e) => setLastDayOfAgreement(e.target.value)}
                    style={{ marginTop: '1rem' }}
                />
            )}

            {/* ── Actions ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button
                    type="submit"
                    className="btn btn--primary btn--lg"
                    disabled={submitting}
                    style={{ flex: 1 }}
                    id={`${idPrefix}-submit-btn`}
                >
                    {submitting ? <><span className="spinner" /> Saving...</> : submitLabel}
                </button>
                {extraActions}
            </div>
        </form>
    );
};

export default MemberForm;
