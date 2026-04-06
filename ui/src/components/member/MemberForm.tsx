import React, { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import type { MemberVehicles } from '../../types';
import { VehicleSection, emptyVehicles, FileViewLink, FormField } from './index';

// ─────────────────────────────────────────────────────────────────────────────
// Public types — import these in parent pages
// ─────────────────────────────────────────────────────────────────────────────

/** Values the parent page pre-fills the form with */
export interface MemberFormInitialValues {
    fullName?: string;
    phoneNumber?: string;
    flatNo?: string;
    vehicles?: MemberVehicles;
    lastDayOfAgreement?: string;
    /** URL of an already-uploaded file (owner index2 / tenant agreement) */
    currentFileUrl?: string | null;
}

/** Data emitted to the parent when the form is submitted */
export interface MemberFormData {
    fullName: string;
    phoneNumber: string;
    flatNo: string;
    vehicles: MemberVehicles;
    lastDayOfAgreement: string; // '' when not applicable
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
    /** Show a Full Name field. Default: false */
    showFullName?: boolean;
    /** Allow the user to edit Full Name. Default: false */
    fullNameEditable?: boolean;

    /** Allow the user to edit Phone Number. Default: true */
    phoneEditable?: boolean;
    /** Allow the user to edit Flat Number. Default: true */
    flatNoEditable?: boolean;

    /** Show a read-only Wing field. Default: false */
    showWing?: boolean;
    /** Value shown in the Wing field */
    wingDisplay?: string;

    /** Show a read-only Type (Owner/Tenant) field. Default: false */
    showType?: boolean;
    /** Value shown in the Type field */
    typeDisplay?: string;

    // ── Attachment / file section ────────────────────────────────────────────
    /**
     * - 'none'             → hide the file section entirely
     * - 'upload'           → file input only (PublicFormPage)
     * - 'view-and-replace' → view current + file input to replace (MemberProfilePage)
     * - 'view-only'        → view current file, no upload (EditMemberPage)
     * Default: 'none'
     */
    fileMode?: 'none' | 'upload' | 'view-and-replace' | 'view-only';
    /** Label shown above the file section */
    fileLabel?: string;
    /** Whether the file is required (PublicFormPage) */
    fileRequired?: boolean;

    // ── Submit button ────────────────────────────────────────────────────────
    submitLabel?: string;
    /** Shows spinner + disables button while parent is calling the API */
    submitting?: boolean;

    // ── Extra action buttons rendered next to Submit ─────────────────────────
    extraActions?: React.ReactNode;

    // ── Validation style ─────────────────────────────────────────────────────
    /**
     * - 'toast'  → show errors via react-hot-toast (MemberProfilePage, EditMemberPage)
     * - 'inline' → show errors under each field (PublicFormPage)
     * Default: 'toast'
     */
    validationStyle?: 'toast' | 'inline';

    /** Unique prefix for all element ids — prevents duplicate-id issues */
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
 * ┌─────────────────────────────────────────────────┐
 * │ To ADD a field:   add state + render it here    │
 * │ To REMOVE a field: delete state + JSX here      │
 * │ Pages never need to change for field changes    │
 * └─────────────────────────────────────────────────┘
 */
const MemberForm: React.FC<Props> = ({ initialValues = {}, config, onSubmit }) => {
    const {
        memberType,
        showFullName       = false,
        fullNameEditable   = false,
        phoneEditable      = true,
        flatNoEditable     = true,
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

    // ── Internal state ────────────────────────────────────────────────────────
    const [fullName,            setFullName]           = useState(initialValues.fullName            ?? '');
    const [phoneNumber,         setPhoneNumber]        = useState(initialValues.phoneNumber         ?? '');
    const [flatNo,              setFlatNo]             = useState(initialValues.flatNo              ?? '');
    const [vehicles,            setVehicles]           = useState<MemberVehicles>(initialValues.vehicles ?? emptyVehicles());
    const [lastDayOfAgreement,  setLastDayOfAgreement] = useState(initialValues.lastDayOfAgreement  ?? '');
    const [file,                setFile]               = useState<File | null>(null);

    // Inline-error map (only used when validationStyle === 'inline')
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Re-sync state if initialValues change (e.g. after async fetch)
    useEffect(() => {
        setFullName(           initialValues.fullName            ?? '');
        setPhoneNumber(        initialValues.phoneNumber         ?? '');
        setFlatNo(             initialValues.flatNo              ?? '');
        setVehicles(           initialValues.vehicles            ?? emptyVehicles());
        setLastDayOfAgreement( initialValues.lastDayOfAgreement  ?? '');
        setFile(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(initialValues)]);

    // ── Validation ────────────────────────────────────────────────────────────
    const validate = (): boolean => {
        const inline: Record<string, string> = {};
        const toasts: string[] = [];

        const err = (key: string, msg: string) => {
            if (validationStyle === 'inline') inline[key] = msg;
            else toasts.push(msg);
        };

        if (showFullName && fullNameEditable && (!fullName || fullName.trim().length < 3))
            err('fullName', 'Full name must be at least 3 characters');

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

        // Tenant
        if (memberType === 'tenant' && !lastDayOfAgreement)
            err('lastDayOfAgreement', 'Last day of agreement is required');

        // File
        if (fileRequired && (fileMode === 'upload') && !file)
            err('file', `${fileLabel} is required`);

        if (validationStyle === 'toast') {
            if (toasts.length > 0) { toast.error(toasts[0]); return false; }
        } else {
            setErrors(inline);
            if (Object.keys(inline).length > 0) { toast.error('Please fix the errors before submitting'); return false; }
        }

        setErrors({});
        return true;
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!validate()) return;
        await onSubmit({ fullName, phoneNumber, flatNo, vehicles, lastDayOfAgreement, file });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <form onSubmit={handleSubmit} noValidate>

            {/* Full Name */}
            {showFullName && (
                <FormField
                    id={`${idPrefix}-fullName`}
                    label="Full Name"
                    value={fullName}
                    placeholder="Enter your full name"
                    required={fullNameEditable}
                    disabled={!fullNameEditable}
                    error={errors.fullName}
                    onChange={(e) => setFullName(e.target.value)}
                />
            )}

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

            {/* ── File / Attachment section ─────────────────────────────────── */}
            {fileMode !== 'none' && (
                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                    <label className={`form-label${fileRequired ? ' form-label--required' : ''}`}>
                        📎 {fileLabel}
                    </label>

                    {/* View current file (view-only or view-and-replace) */}
                    {(fileMode === 'view-only' || fileMode === 'view-and-replace') && (
                        <FileViewLink
                            fileUrl={initialValues.currentFileUrl}
                            linkText="📄 View Current File"
                            showReplaceHint={fileMode === 'view-and-replace' && !file}
                        />
                    )}

                    {/* Newly selected file preview (view-and-replace / upload) */}
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

                    {/* File input (upload or view-and-replace) */}
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
