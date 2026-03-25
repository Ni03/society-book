import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import { subscribePush, unsubscribePush } from '../utils/pushNotifications';

interface AuthContextType {
    token: string | null;
    wing: string | null;
    role: string | null;
    isAuthenticated: boolean;
    login: (username: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

interface AuthProviderProps {
    children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
    const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
    const [wing, setWing] = useState<string | null>(localStorage.getItem('wing'));
    const [role, setRole] = useState<string | null>(localStorage.getItem('role'));

    const isAuthenticated = !!token;

    useEffect(() => {
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
        if (wing) {
            localStorage.setItem('wing', wing);
        } else {
            localStorage.removeItem('wing');
        }
        if (role) {
            localStorage.setItem('role', role);
        } else {
            localStorage.removeItem('role');
        }
    }, [token, wing, role]);

    const login = async (username: string, password: string): Promise<void> => {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.success) {
            setToken(response.data.token);
            setWing(response.data.wing);
            setRole(response.data.role || 'chairman');
            // Subscribe to push after token is stored (token is set synchronously above)
            // Small timeout to allow axios interceptor to pick up the new token
            setTimeout(() => subscribePush().catch(console.error), 300);
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    };

    const logout = () => {
        unsubscribePush().catch(console.error);
        setToken(null);
        setWing(null);
        setRole(null);
        localStorage.removeItem('token');
        localStorage.removeItem('wing');
        localStorage.removeItem('role');
    };

    return (
        <AuthContext.Provider value={{ token, wing, role, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

