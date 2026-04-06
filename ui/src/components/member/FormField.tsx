import React from 'react';

interface FormFieldProps {
    /** The <label> text */
    label: string;
    /** HTML id for the input — also used as htmlFor on the label */
    id: string;
    /** Input type (default: "text") */
    type?: React.HTMLInputTypeAttribute;
    value: string | number;
    onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    /** Makes the label show the required asterisk */
    required?: boolean;
    /** Disables the input */
    disabled?: boolean;
    placeholder?: string;
    maxLength?: number;
    min?: string | number;
    /** Validation error string — renders below the input */
    error?: string;
    /** Extra inline style on the wrapping .form-group div */
    style?: React.CSSProperties;
    /** Additional className forwarded to the input */
    inputClassName?: string;
}

/**
 * Simple, reusable form-field: label + input + error message.
 *
 * Used by: EditMemberPage · MemberProfilePage · PublicFormPage
 */
const FormField: React.FC<FormFieldProps> = ({
    label,
    id,
    type = 'text',
    value,
    onChange,
    required = false,
    disabled = false,
    placeholder,
    maxLength,
    min,
    error,
    style,
    inputClassName,
}) => {
    const labelClass = `form-label${required ? ' form-label--required' : ''}`;
    const inputClass = `form-input${error ? ' form-input--error' : ''}${inputClassName ? ` ${inputClassName}` : ''}`;

    return (
        <div className="form-group" style={style}>
            <label className={labelClass} htmlFor={id}>
                {label}
            </label>
            <input
                id={id}
                type={type}
                className={inputClass}
                value={value}
                onChange={onChange}
                disabled={disabled}
                placeholder={placeholder}
                maxLength={maxLength}
                min={min}
            />
            {error && <div className="form-error">⚠ {error}</div>}
        </div>
    );
};

export default FormField;
