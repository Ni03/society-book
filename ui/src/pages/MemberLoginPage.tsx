import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const MemberLoginPage: React.FC = () => {
    const [flatNo, setFlatNo] = useState('');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPin, setShowPin] = useState(false);

    // Field-level error state
    const [flatError, setFlatError] = useState('');
    const [phoneError, setPhoneError] = useState('');

    const { memberLogin, isAuthenticated, isMember } = useAuth();
    const navigate = useNavigate();

    // Already logged in — redirect
    if (isAuthenticated) {
        navigate(isMember ? '/member/profile' : '/admin/dashboard', { replace: true });
        return null;
    }

    // ── Validation helpers ────────────────────────────────────────────────────
    const validateFlat = (val: string) => {
        if (!val.trim()) return 'Flat number is required';
        if (val.trim().length < 2) return 'Please enter a valid flat number (e.g. 101 or A-101)';
        return '';
    };

    const validatePhone = (val: string) => {
        if (!val.trim()) return 'Phone number is required';
        if (!/^\d{10}$/.test(val.trim())) return 'Must be exactly 10 digits';
        return '';
    };

    // ── Submit ────────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const fErr = validateFlat(flatNo);
        const pErr = validatePhone(phoneNumber);
        setFlatError(fErr);
        setPhoneError(pErr);
        if (fErr || pErr) return;

        setLoading(true);
        try {
            await memberLogin(phoneNumber.trim(), flatNo.trim());
            toast.success('Welcome back!');
            navigate('/member/profile', { replace: true });
        } catch (error: any) {
            const serverMsg: string =
                error.response?.data?.message || error.message || 'Login failed';

            // Map backend messages to friendly field hints
            if (serverMsg.toLowerCase().includes('flat') || serverMsg.toLowerCase().includes('credentials')) {
                setFlatError('Flat number not recognised — check spelling');
                setPhoneError('Phone number does not match our records');
            } else if (serverMsg.toLowerCase().includes('phone') || serverMsg.toLowerCase().includes('10 digits')) {
                setPhoneError(serverMsg);
            } else {
                toast.error(serverMsg);
            }
        } finally {
            setLoading(false);
        }
    };

    // ── Field change handlers ─────────────────────────────────────────────────
    const handleFlatChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFlatNo(e.target.value);
        if (flatError) setFlatError(validateFlat(e.target.value));
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 10);
        setPhoneNumber(digits);
        if (phoneError) setPhoneError(validatePhone(digits));
    };

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div className="login-page">
            <div className="login-card" style={{ maxWidth: '420px' }}>

                {/* Header */}
                <div className="login-card__header">
                    <div className="login-card__icon">🏠</div>
                    <h1 className="login-card__title">Member Login</h1>
                    <p className="login-card__subtitle">
                        Resident portal — view &amp; update your profile
                    </p>
                </div>

                <div className="login-card__body">
                    <form onSubmit={handleSubmit} noValidate>

                        {/* ── Flat Number (username) ── */}
                        <div className="form-group">
                            <label className="form-label form-label--required" htmlFor="member-flatno">
                                🏢 Flat Number
                            </label>
                            <input
                                id="member-flatno"
                                type="text"
                                className={`form-input${flatError ? ' form-input--error' : ''}`}
                                placeholder="e.g. 101 or A-101"
                                value={flatNo}
                                onChange={handleFlatChange}
                                onBlur={() => setFlatError(validateFlat(flatNo))}
                                autoFocus
                                autoComplete="off"
                                style={flatError ? { borderColor: '#ef4444' } : undefined}
                            />
                            {flatError && (
                                <span style={{
                                    display: 'block',
                                    marginTop: '0.3rem',
                                    fontSize: '0.78rem',
                                    color: '#ef4444',
                                    fontWeight: 500,
                                }}>
                                    ⚠️ {flatError}
                                </span>
                            )}
                        </div>

                        {/* ── Phone Number (PIN — hidden) ── */}
                        <div className="form-group" style={{ marginTop: '1rem' }}>
                            <label className="form-label form-label--required" htmlFor="member-phone">
                                📱 Phone Number{' '}
                                <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>
                                    (used as your PIN)
                                </span>
                            </label>
                            <div style={{ position: 'relative' }}>
                                <input
                                    id="member-phone"
                                    type={showPin ? 'text' : 'password'}
                                    className="form-input"
                                    placeholder="10-digit mobile number"
                                    value={phoneNumber}
                                    maxLength={10}
                                    onChange={handlePhoneChange}
                                    onBlur={() => setPhoneError(validatePhone(phoneNumber))}
                                    autoComplete="off"
                                    inputMode="numeric"
                                    style={{
                                        paddingRight: '3rem',
                                        ...(phoneError ? { borderColor: '#ef4444' } : {}),
                                    }}
                                />
                                {/* Show / hide toggle */}
                                <button
                                    type="button"
                                    onClick={() => setShowPin((p) => !p)}
                                    tabIndex={-1}
                                    aria-label={showPin ? 'Hide phone number' : 'Show phone number'}
                                    style={{
                                        position: 'absolute',
                                        right: '0.75rem',
                                        top: '50%',
                                        transform: 'translateY(-50%)',
                                        background: 'none',
                                        border: 'none',
                                        cursor: 'pointer',
                                        fontSize: '1rem',
                                        color: 'var(--text-muted)',
                                        padding: 0,
                                        lineHeight: 1,
                                    }}
                                >
                                    {showPin ? '🙈' : '👁️'}
                                </button>
                            </div>
                            {phoneError && (
                                <span style={{
                                    display: 'block',
                                    marginTop: '0.3rem',
                                    fontSize: '0.78rem',
                                    color: '#ef4444',
                                    fontWeight: 500,
                                }}>
                                    ⚠️ {phoneError}
                                </span>
                            )}
                        </div>

                        {/* ── Hint ── */}
                        <div style={{
                            marginTop: '0.85rem',
                            padding: '0.6rem 0.9rem',
                            background: 'var(--primary-50, #eff6ff)',
                            border: '1px solid var(--primary-200, #bfdbfe)',
                            borderRadius: 'var(--border-radius-md)',
                            fontSize: '0.78rem',
                            color: 'var(--primary-700, #1d4ed8)',
                            lineHeight: 1.5,
                        }}>
                            💡 Enter your <strong>flat number</strong> (e.g. <em>101</em> or <em>A-101</em>) and your <strong>registered 10-digit mobile number</strong> as the PIN.
                        </div>

                        {/* ── Submit ── */}
                        <button
                            type="submit"
                            className="btn btn--primary btn--lg btn--block"
                            disabled={loading}
                            style={{ marginTop: '1.25rem' }}
                            id="member-login-submit-btn"
                        >
                            {loading
                                ? <><span className="spinner"></span> Signing in...</>
                                : 'Sign In as Member'
                            }
                        </button>

                        {/* Link to Admin login */}
                        <div style={{
                            textAlign: 'center',
                            marginTop: '1.5rem',
                            marginBottom: '1rem',
                            fontSize: '0.85rem',
                            color: 'var(--text-muted, #94a3b8)'
                        }}>
                            Are you an admin?{' '}
                            <a href="/login" onClick={(e) => {
                                e.preventDefault();
                                navigate('/login');
                            }} style={{ color: 'var(--primary-400, #818cf8)', fontWeight: 500, textDecoration: 'none' }}>
                                Admin Login
                            </a>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default MemberLoginPage;
