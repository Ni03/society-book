import React from 'react';
import { Navigate } from 'react-router-dom';
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

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    if (requiredRole === 'member' && !isMember) {
        // Non-members trying to reach member portal → send to admin
        return <Navigate to="/admin/dashboard" replace />;
    }

    if (requiredRole === 'admin' && isMember) {
        // Members trying to reach admin area → send to their profile
        return <Navigate to="/member/profile" replace />;
    }

    return <>{children}</>;
};

export default ProtectedRoute;
