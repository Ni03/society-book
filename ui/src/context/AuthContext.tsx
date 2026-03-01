import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';

interface AuthContextType {
    token: string | null;
    wing: string | null;
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
    }, [token, wing]);

    const login = async (username: string, password: string): Promise<void> => {
        const response = await api.post('/auth/login', { username, password });
        if (response.data.success) {
            setToken(response.data.token);
            setWing(response.data.wing);
        } else {
            throw new Error(response.data.message || 'Login failed');
        }
    };

    const logout = () => {
        setToken(null);
        setWing(null);
        localStorage.removeItem('token');
        localStorage.removeItem('wing');
    };

    return (
        <AuthContext.Provider value={{ token, wing, isAuthenticated, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
