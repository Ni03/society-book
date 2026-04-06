import React from 'react';
import type { carDetails } from '../../types';

interface CarSectionProps {
    /** Current car count */
    carCount: number;
    /** Current car details array */
    carRegs: carDetails[];
    /** Called when the count changes */
    onCountChange: (count: number) => void;
    /** Called when any field of a car entry changes */
    onCarChange: (index: number, field: keyof carDetails, value: string | boolean) => void;
    /** Optional id prefix to keep ids unique per page (default: "car") */
    idPrefix?: string;
    /** Error for the count field */
    countError?: string;
    /** Per-index errors keyed as `carReg{i}` */
    errors?: Record<string, string>;
    /** Whether all inputs should be disabled */
    disabled?: boolean;
    /** Extra top margin when bikes section is visible */
    hasTopMargin?: boolean;
}

/**
 * Reusable section that renders:
 *  - a "Number of Cars" number input
 *  - dynamic car-detail cards (regNo, parkingSlot, fastTag)
 *
 * Used by: EditMemberPage · MemberProfilePage · PublicFormPage
 */
const CarSection: React.FC<CarSectionProps> = ({
    carCount,
    carRegs,
    onCountChange,
    onCarChange,
    idPrefix = 'car',
    countError,
    errors = {},
    disabled = false,
    hasTopMargin = false,
}) => {
    return (
        <>
            <div className="form-group" style={hasTopMargin ? { marginTop: '1rem' } : undefined}>
                <label className="form-label" htmlFor={`${idPrefix}-count`}>
                    Number of Cars
                </label>
                <input
                    id={`${idPrefix}-count`}
                    type="number"
                    min="0"
                    className={`form-input${countError ? ' form-input--error' : ''}`}
                    value={carCount}
                    disabled={disabled}
                    onChange={(e) => onCountChange(parseInt(e.target.value) || 0)}
                />
                {countError && <div className="form-error">⚠ {countError}</div>}
            </div>

            {carCount > 0 && (
                <div className="dynamic-fields">
                    <div className="dynamic-fields__title">🚗 Car Details</div>
                    {Array.from({ length: carCount }).map((_, i) => {
                        const regErrKey = `carReg${i}`;
                        return (
                            <div
                                key={`${idPrefix}-car-${i}`}
                                style={{
                                    border: '1px solid var(--border-color)',
                                    borderRadius: 'var(--border-radius-md)',
                                    padding: '1rem',
                                    marginBottom: '0.75rem',
                                    background: 'var(--gray-50)',
                                }}
                            >
                                <div
                                    style={{
                                        fontWeight: 600,
                                        marginBottom: '0.75rem',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    🚗 Car #{i + 1}
                                </div>

                                {/* Registration Number */}
                                <div className="form-group">
                                    <label
                                        className="form-label form-label--required"
                                        htmlFor={`${idPrefix}-carReg${i}`}
                                    >
                                        Registration Number
                                    </label>
                                    <input
                                        id={`${idPrefix}-carReg${i}`}
                                        type="text"
                                        className={`form-input${errors[regErrKey] ? ' form-input--error' : ''}`}
                                        placeholder="e.g. MH14XY5678"
                                        value={carRegs[i]?.regNo || ''}
                                        disabled={disabled}
                                        onChange={(e) => onCarChange(i, 'regNo', e.target.value)}
                                    />
                                    {errors[regErrKey] && (
                                        <div className="form-error">⚠ {errors[regErrKey]}</div>
                                    )}
                                </div>

                                {/* Parking Slot */}
                                <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                    <label
                                        className="form-label"
                                        htmlFor={`${idPrefix}-carParking${i}`}
                                    >
                                        🅿️ Parking Slot
                                    </label>
                                    <input
                                        id={`${idPrefix}-carParking${i}`}
                                        type="text"
                                        className="form-input"
                                        placeholder="e.g. B-12"
                                        value={carRegs[i]?.parkingSlot || ''}
                                        disabled={disabled}
                                        onChange={(e) => onCarChange(i, 'parkingSlot', e.target.value)}
                                    />
                                </div>

                                {/* FASTag */}
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.6rem',
                                        marginTop: '0.75rem',
                                    }}
                                >
                                    <input
                                        id={`${idPrefix}-carFasttag${i}`}
                                        type="checkbox"
                                        style={{ width: '1.1rem', height: '1.1rem', cursor: 'pointer' }}
                                        checked={carRegs[i]?.fastTag || false}
                                        disabled={disabled}
                                        onChange={(e) => onCarChange(i, 'fastTag', e.target.checked)}
                                    />
                                    <label
                                        htmlFor={`${idPrefix}-carFasttag${i}`}
                                        style={{
                                            cursor: disabled ? 'default' : 'pointer',
                                            fontWeight: 500,
                                            userSelect: 'none',
                                        }}
                                    >
                                        📡 FASTag Enabled
                                    </label>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default CarSection;
