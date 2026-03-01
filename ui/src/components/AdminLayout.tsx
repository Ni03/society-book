import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const AdminLayout: React.FC = () => {
    const { wing, logout } = useAuth();
    const navigate = useNavigate();

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
                            <div className="navbar__subtitle">Management System</div>
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
                </aside>
                <main className="admin-content">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
