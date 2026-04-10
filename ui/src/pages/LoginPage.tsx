import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';

const LoginPage: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const { login, isAuthenticated, isMember } = useAuth();
    const navigate  = useNavigate();
    const location  = useLocation();

    // iOS PWA fix: mark this device as preferring the admin login route
    useEffect(() => {
        localStorage.setItem('preferredLogin', 'admin');
    }, []);

    // Where to go after login: honour deep-link redirect, else dashboard
    const from = (location.state as any)?.from?.pathname + ((location.state as any)?.from?.search ?? '') || '/admin/dashboard';

    // If already authenticated, redirect appropriately
    if (isAuthenticated) {
        navigate(isMember ? '/member/profile' : '/admin/dashboard', { replace: true });
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!username.trim() || !password.trim()) {
            toast.error('Please enter both username and password');
            return;
        }

        setLoading(true);
        try {
            await login(username.trim(), password);
            toast.success('Login successful!');
            navigate(from, { replace: true });
        } catch (error: any) {
            const message = error.response?.data?.message || error.message || 'Login failed';
            toast.error(message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <div className="login-card__header">
                    <div className="login-card__icon">🏢</div>
                    <h1 className="login-card__title">Admin Login</h1>
                </div>
                <div className="login-card__body">
                    <form onSubmit={handleSubmit} noValidate>
                        <div className="form-group">
                            <label className="form-label form-label--required" htmlFor="login-username">
                                Username
                            </label>
                            <input
                                id="login-username"
                                type="text"
                                className="form-input"
                                placeholder="e.g. chairmana"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                autoComplete="username"
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label form-label--required" htmlFor="login-password">
                                Password
                            </label>
                            <input
                                id="login-password"
                                type="password"
                                className="form-input"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                autoComplete="current-password"
                            />
                        </div>

                        <button
                            type="submit"
                            className="btn btn--primary btn--lg btn--block"
                            disabled={loading}
                            style={{ marginTop: '0.5rem' }}
                            id="login-submit-btn"
                        >
                            {loading ? (
                                <><span className="spinner"></span> Signing in...</>
                            ) : (
                                'Sign In'
                            )}
                        </button>
                    </form>
                </div>
                
                {/* Link to Member login */}
                <div style={{
                    textAlign: 'center',
                    marginTop: '1.5rem',
                    marginBottom: '1rem',
                    fontSize: '0.85rem',
                    color: 'var(--text-muted, #94a3b8)'
                }}>
                    Are you a resident?{' '}
                    <a href="/member-login" onClick={(e) => {
                        e.preventDefault();
                        navigate('/member-login');
                    }} style={{ color: 'var(--primary-400, #818cf8)', fontWeight: 500, textDecoration: 'none' }}>
                        Member Login
                    </a>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;
