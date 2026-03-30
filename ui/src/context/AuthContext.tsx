import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import { subscribePush, unsubscribePush } from '../utils/pushNotifications';

interface AuthContextType {
    token: string | null;
    wing: string | null;
    role: string | null;
    memberId: string | null;
    fullName: string | null;
    isAuthenticated: boolean;
    isMember: boolean;
    login: (username: string, password: string) => Promise<void>;
    memberLogin: (phoneNumber: string, flatNo: string) => Promise<void>;
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
    const [token,    setToken]    = useState<string | null>(localStorage.getItem('token'));
    const [wing,     setWing]     = useState<string | null>(localStorage.getItem('wing'));
    const [role,     setRole]     = useState<string | null>(localStorage.getItem('role'));
    const [memberId, setMemberId] = useState<string | null>(localStorage.getItem('memberId'));
    const [fullName, setFullName] = useState<string | null>(localStorage.getItem('fullName'));

    const isAuthenticated = !!token;
    const isMember = role === 'member';

    useEffect(() => {
        if (token)    localStorage.setItem('token',    token);    else localStorage.removeItem('token');
        if (wing)     localStorage.setItem('wing',     wing);     else localStorage.removeItem('wing');
        if (role)     localStorage.setItem('role',     role);     else localStorage.removeItem('role');
        if (memberId) localStorage.setItem('memberId', memberId); else localStorage.removeItem('memberId');
        if (fullName) localStorage.setItem('fullName', fullName); else localStorage.removeItem('fullName');
    }, [token, wing, role, memberId, fullName]);

    // Admin / chairman login
    const login = async (username: string, password: string): Promise<void> => {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.success) {
            setToken(response.data.token);
            setWing(response.data.wing);
            setRole(response.data.role || 'chairman');
            setMemberId(null);
            setFullName(null);
            // Subscribe to push notifications
            setTimeout(() => subscribePush().catch(console.error), 300);
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    };

    // Member login
    const memberLogin = async (phoneNumber: string, flatNo: string): Promise<void> => {
        const response = await api.post('/member/login', { phoneNumber, flatNo });
        if (response.data.success) {
            setToken(response.data.token);
            setWing(response.data.wing);
            setRole('member');
            setMemberId(response.data.memberId);
            setFullName(response.data.fullName);
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    };

    const logout = () => {
        if (!isMember) unsubscribePush().catch(console.error);
        setToken(null);
        setWing(null);
        setRole(null);
        setMemberId(null);
        setFullName(null);
        localStorage.removeItem('token');
        localStorage.removeItem('wing');
        localStorage.removeItem('role');
        localStorage.removeItem('memberId');
        localStorage.removeItem('fullName');
    };

    return (
        <AuthContext.Provider value={{ token, wing, role, memberId, fullName, isAuthenticated, isMember, login, memberLogin, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
