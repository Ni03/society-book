import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { MembersResponse } from '../types';

const DashboardPage: React.FC = () => {
    const { wing } = useAuth();
    const [stats, setStats] = useState({ total: 0, owners: 0, tenants: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get<MembersResponse>('/admin/members');
                if (response.data.success) {
                    setStats(response.data.stats);
                }
            } catch (error) {
                console.error('Failed to fetch stats:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    if (loading) {
        return (
            <div className="loading-overlay">
                <div className="loading-spinner"></div>
                <span className="loading-text">Loading dashboard...</span>
            </div>
        );
    }

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <h1 className="page-header__title">
                    Wing {wing} Dashboard
                </h1>
                <p className="page-header__subtitle">
                    Overview of your wing's member statistics
                </p>
            </div>

            <div className="stats-grid">
                <div className="stat-card stat-card--primary">
                    <div className="stat-card__icon">👥</div>
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">Total Members</div>
                </div>

                <div className="stat-card stat-card--accent">
                    <div className="stat-card__icon">🏠</div>
                    <div className="stat-card__value">{stats.owners}</div>
                    <div className="stat-card__label">Owners</div>
                </div>

                <div className="stat-card stat-card--warning">
                    <div className="stat-card__icon">📋</div>
                    <div className="stat-card__value">{stats.tenants}</div>
                    <div className="stat-card__label">Tenants</div>
                </div>
            </div>

            <div className="card">
                <div className="card__header">
                    <h2 className="card__title">📊 Quick Summary</h2>
                </div>
                <div className="card__body">
                    <div style={{ display: 'grid', gap: '1rem' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--border-radius-md)',
                        }}>
                            <span style={{ fontWeight: 600 }}>Wing</span>
                            <span className="badge badge--wing">Wing {wing}</span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--border-radius-md)',
                        }}>
                            <span style={{ fontWeight: 600 }}>Owner Ratio</span>
                            <span style={{ fontWeight: 700, color: 'var(--primary-600)' }}>
                                {stats.total > 0
                                    ? `${Math.round((stats.owners / stats.total) * 100)}%`
                                    : '0%'}
                            </span>
                        </div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '1rem',
                            background: 'var(--gray-50)',
                            borderRadius: 'var(--border-radius-md)',
                        }}>
                            <span style={{ fontWeight: 600 }}>Tenant Ratio</span>
                            <span style={{ fontWeight: 700, color: 'var(--accent-600)' }}>
                                {stats.total > 0
                                    ? `${Math.round((stats.tenants / stats.total) * 100)}%`
                                    : '0%'}
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DashboardPage;
