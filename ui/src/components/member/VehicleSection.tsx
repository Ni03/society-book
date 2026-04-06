import React from 'react';
import type { MemberVehicles, carDetails } from '../../types';

// ─────────────────────────────────────────────────────────────────────────────
// Default / empty value helper — import this in pages to initialise state.
// ─────────────────────────────────────────────────────────────────────────────
export const emptyVehicles = (): MemberVehicles => ({
    bikes: { count: 0, registrationNumbers: [] },
    cars:  { count: 0, list: [] },
});

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────
interface VehicleSectionProps {
    /** Current vehicle data (controlled) */
    value: MemberVehicles;
    /** Called whenever any vehicle field changes */
    onChange: (vehicles: MemberVehicles) => void;
    /**
     * Unique prefix for all element ids on the page.
     * Prevents duplicate-id issues when multiple forms exist.
     * Default: "vehicle"
     */
    idPrefix?: string;
    /**
     * Validation errors keyed by field name.
     * Supported keys: "bikeCount", "bikeReg{n}", "carCount", "carReg{n}"
     */
    errors?: Record<string, string>;
    /** Disables all inputs (e.g. read-only view mode) */
    disabled?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────

/**
 * VehicleSection — single source of truth for the vehicle form UI.
 *
 * To add a new bike field   → add it to `carDetails` in types/index.ts and render it in the "Bike card" block below.
 * To add a new car field    → add it to `carDetails` in types/index.ts and render it in the "Car card" block below.
 * To add a new vehicle type → duplicate the bikes/cars pattern below.
 *
 * Used by: EditMemberPage · MemberProfilePage · PublicFormPage
 */
const VehicleSection: React.FC<VehicleSectionProps> = ({
    value,
    onChange,
    idPrefix = 'vehicle',
    errors = {},
    disabled = false,
}) => {

    // ── internal helpers ────────────────────────────────────────────────────

    /** Produce a new MemberVehicles object merging only the changed slice */
    const update = (patch: Partial<MemberVehicles>) =>
        onChange({ ...value, ...patch });

    // ── Bike helpers ────────────────────────────────────────────────────────

    const onBikeCountChange = (count: number) => {
        const n = Math.max(0, count);
        const regs = [...value.bikes.registrationNumbers];
        while (regs.length < n) regs.push('');
        update({ bikes: { count: n, registrationNumbers: regs.slice(0, n) } });
    };

    const onBikeRegChange = (index: number, val: string) => {
        const regs = [...value.bikes.registrationNumbers];
        regs[index] = val;
        update({ bikes: { ...value.bikes, registrationNumbers: regs } });
    };

    // ── Car helpers ─────────────────────────────────────────────────────────

    const onCarCountChange = (count: number) => {
        const n = Math.max(0, count);
        const list = [...value.cars.list];
        while (list.length < n) list.push({ regNo: '', fastTag: false, parkingSlot: '' });
        update({ cars: { count: n, list: list.slice(0, n) } });
    };

    const onCarFieldChange = (index: number, field: keyof carDetails, val: string | boolean) => {
        const list = value.cars.list.map((car, i) =>
            i === index ? { ...car, [field]: val } : car
        );
        update({ cars: { ...value.cars, list } });
    };

    // ── Render ──────────────────────────────────────────────────────────────

    return (
        <>
            {/* ── BIKES ───────────────────────────────────────────────────── */}
            <div className="form-group">
                <label className="form-label" htmlFor={`${idPrefix}-bike-count`}>
                    Number of Bikes
                </label>
                <input
                    id={`${idPrefix}-bike-count`}
                    type="number"
                    min="0"
                    className={`form-input${errors.bikeCount ? ' form-input--error' : ''}`}
                    value={value.bikes.count}
                    disabled={disabled}
                    onChange={(e) => onBikeCountChange(parseInt(e.target.value) || 0)}
                />
                {errors.bikeCount && <div className="form-error">⚠ {errors.bikeCount}</div>}
            </div>

            {value.bikes.count > 0 && (
                <div className="dynamic-fields">
                    <div className="dynamic-fields__title">🏍️ Bike Registration Numbers</div>
                    {Array.from({ length: value.bikes.count }).map((_, i) => (
                        // ── Bike card ──────────────────────────────────────
                        // Add new bike fields here; they will appear in all 3 pages automatically.
                        <div className="form-group" key={`${idPrefix}-bike-${i}`}>
                            <label
                                className="form-label form-label--required"
                                htmlFor={`${idPrefix}-bikeReg-${i}`}
                            >
                                Bike #{i + 1} Registration
                            </label>
                            <input
                                id={`${idPrefix}-bikeReg-${i}`}
                                type="text"
                                className={`form-input${errors[`bikeReg${i}`] ? ' form-input--error' : ''}`}
                                placeholder="e.g. MH12AB1234"
                                value={value.bikes.registrationNumbers[i] || ''}
                                disabled={disabled}
                                onChange={(e) => onBikeRegChange(i, e.target.value)}
                            />
                            {errors[`bikeReg${i}`] && (
                                <div className="form-error">⚠ {errors[`bikeReg${i}`]}</div>
                            )}
                        </div>
                        // ── End bike card ──────────────────────────────────
                    ))}
                </div>
            )}

            {/* ── CARS ────────────────────────────────────────────────────── */}
            <div className="form-group" style={{ marginTop: value.bikes.count > 0 ? '1rem' : undefined }}>
                <label className="form-label" htmlFor={`${idPrefix}-car-count`}>
                    Number of Cars
                </label>
                <input
                    id={`${idPrefix}-car-count`}
                    type="number"
                    min="0"
                    className={`form-input${errors.carCount ? ' form-input--error' : ''}`}
                    value={value.cars.count}
                    disabled={disabled}
                    onChange={(e) => onCarCountChange(parseInt(e.target.value) || 0)}
                />
                {errors.carCount && <div className="form-error">⚠ {errors.carCount}</div>}
            </div>

            {value.cars.count > 0 && (
                <div className="dynamic-fields">
                    <div className="dynamic-fields__title">🚗 Car Details</div>
                    {Array.from({ length: value.cars.count }).map((_, i) => (
                        // ── Car card ───────────────────────────────────────
                        // Add new car fields here (e.g. color, insuranceNo);
                        // they will appear in all 3 pages automatically.
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
                            <div style={{ fontWeight: 600, marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
                                🚗 Car #{i + 1}
                            </div>

                            {/* Registration Number */}
                            <div className="form-group">
                                <label className="form-label form-label--required" htmlFor={`${idPrefix}-carReg-${i}`}>
                                    Registration Number
                                </label>
                                <input
                                    id={`${idPrefix}-carReg-${i}`}
                                    type="text"
                                    className={`form-input${errors[`carReg${i}`] ? ' form-input--error' : ''}`}
                                    placeholder="e.g. MH14XY5678"
                                    value={value.cars.list[i]?.regNo || ''}
                                    disabled={disabled}
                                    onChange={(e) => onCarFieldChange(i, 'regNo', e.target.value)}
                                />
                                {errors[`carReg${i}`] && (
                                    <div className="form-error">⚠ {errors[`carReg${i}`]}</div>
                                )}
                            </div>

                            {/* Parking Slot */}
                            <div className="form-group" style={{ marginTop: '0.5rem' }}>
                                <label className="form-label" htmlFor={`${idPrefix}-carParking-${i}`}>
                                    🅿️ Parking Slot
                                </label>
                                <input
                                    id={`${idPrefix}-carParking-${i}`}
                                    type="text"
                                    className="form-input"
                                    placeholder="e.g. B-12"
                                    value={value.cars.list[i]?.parkingSlot || ''}
                                    disabled={disabled}
                                    onChange={(e) => onCarFieldChange(i, 'parkingSlot', e.target.value)}
                                />
                            </div>

                            {/* FASTag */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.75rem' }}>
                                <input
                                    id={`${idPrefix}-carFasttag-${i}`}
                                    type="checkbox"
                                    style={{ width: '1.1rem', height: '1.1rem', cursor: disabled ? 'default' : 'pointer' }}
                                    checked={value.cars.list[i]?.fastTag || false}
                                    disabled={disabled}
                                    onChange={(e) => onCarFieldChange(i, 'fastTag', e.target.checked)}
                                />
                                <label
                                    htmlFor={`${idPrefix}-carFasttag-${i}`}
                                    style={{ cursor: disabled ? 'default' : 'pointer', fontWeight: 500, userSelect: 'none' }}
                                >
                                    📡 FASTag Enabled
                                </label>
                            </div>
                            {/* ── End car card ── */}
                        </div>
                    ))}
                </div>
            )}
        </>
    );
};

export default VehicleSection;
