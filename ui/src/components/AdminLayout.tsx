import React, { useEffect, useState, useCallback } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';

const AdminLayout: React.FC = () => {
    const { wing, role, logout } = useAuth();
    const navigate = useNavigate();
    const isSecurity = role === 'security';
    const isSuperAdmin = role === 'superadmin' || wing === 'ALL';

    const [pendingCount, setPendingCount] = useState(0);

    // Poll notification count every 30s (for chairman / superadmin)
    const fetchNotifCount = useCallback(async () => {
        if (isSecurity) return;
        try {
            const res = await api.get('/admin/visitors/notifications');
            if (res.data.success) setPendingCount(res.data.count ?? 0);
        } catch {
            // silent
        }
    }, [isSecurity]);

    useEffect(() => {
        fetchNotifCount();
        const id = setInterval(fetchNotifCount, 30_000);
        return () => clearInterval(id);
    }, [fetchNotifCount]);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <div className="app-layout">
            <nav className="navbar">
                <div className="navbar__inner">
                    <div className="navbar__brand">
                        <div className="navbar__logo">SB</div>
                        <div>
                            <div className="navbar__title">Society Book</div>
                            <div className="navbar__subtitle">
                                {isSecurity ? '🛡️ Security Supervisor' : 'Management System'}
                            </div>
                        </div>
                    </div>
                    <div className="navbar__actions">
                        <div className="navbar__wing-badge">
                            <span>🏢</span>
                            <span>Wing {wing}</span>
                        </div>
                        <button className="btn btn--ghost btn--sm" onClick={handleLogout} id="logout-btn">
                            Logout
                        </button>
                    </div>
                </div>
            </nav>

            <div className="admin-layout">
                <aside className="sidebar">
                    {isSecurity ? (
                        /* ── Security sidebar ─────────────────────────────── */
                        <NavLink
                            to="/admin/security"
                            className={({ isActive }) =>
                                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                            }
                            id="nav-security"
                        >
                            <span>🛡️</span> Visitor Entry
                        </NavLink>
                    ) : (
                        /* ── Chairman / superadmin sidebar ────────────────── */
                        <>
                            <NavLink
                                to="/admin/dashboard"
                                className={({ isActive }) =>
                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                id="nav-dashboard"
                            >
                                <span>📊</span> Dashboard
                            </NavLink>
                            <NavLink
                                to="/admin/members"
                                className={({ isActive }) =>
                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                id="nav-members"
                            >
                                <span>👥</span> Members
                            </NavLink>
                            <NavLink
                                to="/admin/search"
                                className={({ isActive }) =>
                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                id="nav-search"
                            >
                                <span>🔍</span> Vehicle Search
                            </NavLink>


                            <NavLink
                                to="/admin/visitors/history"
                                className={({ isActive }) =>
                                    `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
                                }
                                id="nav-visitor-history"
                            >
                                <span>📋</span> Visitor Log
                            </NavLink>
                        </>
                    )}
                </aside>
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
