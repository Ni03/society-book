import React from 'react';

interface BikeSectionProps {
    /** Current bike count */
    bikeCount: number;
    /** Current bike registration array */
    bikeRegs: string[];
    /** Called when the count changes (already clamped to max 0) */
    onCountChange: (count: number) => void;
    /** Called when a specific bike reg changes */
    onRegChange: (index: number, value: string) => void;
    /** Optional id prefix to keep ids unique per page (default: "bike") */
    idPrefix?: string;
    /** If true the count field shows an error highlight */
    countError?: string;
    /** Per-index errors keyed as `bikeReg{i}` */
    errors?: Record<string, string>;
    /** Whether all inputs should be disabled */
    disabled?: boolean;
}

/**
 * Reusable section that renders:
 *  - a "Number of Bikes" number input
 *  - dynamic registration-number text inputs (one per bike)
 *
 * Used by: EditMemberPage · MemberProfilePage · PublicFormPage
 */
const BikeSection: React.FC<BikeSectionProps> = ({
    bikeCount,
    bikeRegs,
    onCountChange,
    onRegChange,
    idPrefix = 'bike',
    countError,
    errors = {},
    disabled = false,
}) => {
    return (
        <>
            <div className="form-group">
                <label className="form-label" htmlFor={`${idPrefix}-count`}>
                    Number of Bikes
                </label>
                <input
                    id={`${idPrefix}-count`}
                    type="number"
                    min="0"
                    className={`form-input${countError ? ' form-input--error' : ''}`}
                    value={bikeCount}
                    disabled={disabled}
                    onChange={(e) => onCountChange(parseInt(e.target.value) || 0)}
                />
                {countError && <div className="form-error">⚠ {countError}</div>}
            </div>

            {bikeCount > 0 && (
                <div className="dynamic-fields">
                    <div className="dynamic-fields__title">🏍️ Bike Registration Numbers</div>
                    {Array.from({ length: bikeCount }).map((_, i) => {
                        const errKey = `bikeReg${i}`;
                        return (
                            <div className="form-group" key={`${idPrefix}-bike-${i}`}>
                                <label
                                    className="form-label form-label--required"
                                    htmlFor={`${idPrefix}-bikeReg${i}`}
                                >
                                    Bike #{i + 1} Registration
                                </label>
                                <input
                                    id={`${idPrefix}-bikeReg${i}`}
                                    type="text"
                                    className={`form-input${errors[errKey] ? ' form-input--error' : ''}`}
                                    placeholder="e.g. MH12AB1234"
                                    value={bikeRegs[i] || ''}
                                    disabled={disabled}
                                    onChange={(e) => onRegChange(i, e.target.value)}
                                />
                                {errors[errKey] && (
                                    <div className="form-error">⚠ {errors[errKey]}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </>
    );
};

export default BikeSection;
