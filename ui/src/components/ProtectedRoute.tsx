import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
    children: React.ReactNode;
    /**
     * 'member'  → only role === 'member' may access
     * 'admin'   → any role other than 'member' (chairman, superadmin, security)
     * undefined → any authenticated user
     */
    requiredRole?: 'member' | 'admin';
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requiredRole }) => {
    const { isAuthenticated, isMember } = useAuth();
    const location = useLocation();

    // Not logged in → send to the right login page, preserving the return URL
    if (!isAuthenticated) {
        const loginPath = requiredRole === 'member' ? '/member-login' : '/login';
        return (
            <Navigate
                to={loginPath}
                state={{ from: location }}   // e.g. /admin/visitors/notifications?visitor=XYZ
                replace
            />
        );
    }

    // Member trying to access admin area → redirect to their profile
    if (requiredRole === 'admin' && isMember) {
        return <Navigate to="/member/profile" replace />;
    }

    // Non-member trying to access member portal → redirect to admin
    if (requiredRole === 'member' && !isMember) {
        return <Navigate to="/admin/dashboard" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
