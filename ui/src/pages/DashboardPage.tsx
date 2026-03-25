import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import type { MembersResponse } from '../types';

const DashboardPage: React.FC = () => {
    const { wing } = useAuth();
    const [stats, setStats] = useState({
        total: 0,
        owners: 0,
        tenants: 0,
        twoWheelers: 0,
        fourWheelers: 0,
        ownerTwoWheelers: 0,
        ownerFourWheelers: 0,
        tenantTwoWheelers: 0,
        tenantFourWheelers: 0,
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await api.get<MembersResponse>('/admin/members');
                if (response.data.success) {
                    const s = response.data.stats;
                    setStats({
                        total:               s.total,
                        owners:              s.owners,
                        tenants:             s.tenants,
                        twoWheelers:         s.twoWheelers         ?? 0,
                        fourWheelers:        s.fourWheelers        ?? 0,
                        ownerTwoWheelers:    s.ownerTwoWheelers    ?? 0,
                        ownerFourWheelers:   s.ownerFourWheelers   ?? 0,
                        tenantTwoWheelers:   s.tenantTwoWheelers   ?? 0,
                        tenantFourWheelers:  s.tenantFourWheelers  ?? 0,
                    });
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

    const totalVehicles = stats.twoWheelers + stats.fourWheelers;

    /* ── reusable split-bar sub-card ──────────────────────────────────── */
    const VehicleBreakdownCard = ({
        emoji, label, total, ownerCount, tenantCount, gradient,
    }: {
        emoji: string;
        label: string;
        total: number;
        ownerCount: number;
        tenantCount: number;
        gradient: string;
    }) => {
        const ownerPct  = total > 0 ? Math.round((ownerCount  / total) * 100) : 0;
        const tenantPct = total > 0 ? Math.round((tenantCount / total) * 100) : 0;

        return (
            <div style={{
                background: gradient,
                borderRadius: '1rem',
                padding: '1.25rem 1.5rem',
                color: '#fff',
                boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
            }}>
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ fontSize: '1.6rem' }}>{emoji}</span>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{total}</div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.1rem' }}>{label}</div>
                    </div>
                </div>

                {/* Progress bar */}
                <div style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: 'rgba(255,255,255,0.25)',
                    overflow: 'hidden',
                    display: 'flex',
                }}>
                    <div style={{
                        width: `${ownerPct}%`,
                        background: 'rgba(255,255,255,0.85)',
                        transition: 'width 0.4s ease',
                    }} />
                    <div style={{
                        width: `${tenantPct}%`,
                        background: 'rgba(255,255,255,0.35)',
                        transition: 'width 0.4s ease',
                    }} />
                </div>

                {/* Legend */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.82rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                            display: 'inline-block', width: 10, height: 10,
                            borderRadius: '50%', background: 'rgba(255,255,255,0.85)',
                        }} />
                        <span style={{ opacity: 0.9 }}>Owners:&nbsp;</span>
                        <strong>{ownerCount}</strong>
                        <span style={{ opacity: 0.65 }}>({ownerPct}%)</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{
                            display: 'inline-block', width: 10, height: 10,
                            borderRadius: '50%', background: 'rgba(255,255,255,0.35)',
                        }} />
                        <span style={{ opacity: 0.9 }}>Tenants:&nbsp;</span>
                        <strong>{tenantCount}</strong>
                        <span style={{ opacity: 0.65 }}>({tenantPct}%)</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="page-wrapper">
            <div className="page-header">
                <h1 className="page-header__title">Wing {wing} Dashboard</h1>
                <p className="page-header__subtitle">
                    Overview of your wing's member &amp; vehicle statistics
                </p>
            </div>

            {/* ── Section label helper ─────────────────────────────── */}
            {(() => {
                const SectionLabel = ({ children }: { children: React.ReactNode }) => (
                    <h2 style={{
                        fontSize: '0.8rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        letterSpacing: '0.09em',
                        color: 'var(--gray-500)',
                        marginBottom: '0.75rem',
                    }}>{children}</h2>
                );

                return (
                    <>
                        {/* ── Members ───────────────────────────────── */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <SectionLabel>👥 Members</SectionLabel>
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
                        </div>

                        {/* ── Vehicles with Owner/Tenant breakdown ──── */}
                        <div style={{ marginBottom: '1.75rem' }}>
                            <SectionLabel>🚗 Vehicles — Owner vs Tenant Breakdown</SectionLabel>
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                                gap: '1rem',
                            }}>
                                <VehicleBreakdownCard
                                    emoji="🛵"
                                    label="Two Wheelers (Bikes)"
                                    total={stats.twoWheelers}
                                    ownerCount={stats.ownerTwoWheelers}
                                    tenantCount={stats.tenantTwoWheelers}
                                    gradient="linear-gradient(135deg, #0f4c81 0%, #1a6fad 100%)"
                                />
                                <VehicleBreakdownCard
                                    emoji="🚗"
                                    label="Four Wheelers (Cars)"
                                    total={stats.fourWheelers}
                                    ownerCount={stats.ownerFourWheelers}
                                    tenantCount={stats.tenantFourWheelers}
                                    gradient="linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)"
                                />
                                <div style={{
                                    background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
                                    borderRadius: '1rem',
                                    padding: '1.25rem 1.5rem',
                                    color: '#fff',
                                    boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    gap: '0.4rem',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <span style={{ fontSize: '1.6rem' }}>🅿️</span>
                                        <div>
                                            <div style={{ fontWeight: 700, fontSize: '1.5rem', lineHeight: 1 }}>{totalVehicles}</div>
                                            <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.1rem' }}>Total Vehicles</div>
                                        </div>
                                    </div>
                                    <div style={{ fontSize: '0.82rem', opacity: 0.9, marginTop: '0.25rem' }}>
                                        🛵 {stats.twoWheelers} bikes &nbsp;+&nbsp; 🚗 {stats.fourWheelers} cars
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ── Quick Summary ─────────────────────────── */}
                        <div className="card">
                            <div className="card__header">
                                <h2 className="card__title">📊 Quick Summary</h2>
                            </div>
                            <div className="card__body">
                                <div style={{ display: 'grid', gap: '1rem' }}>
                                    {[
                                        {
                                            label: 'Wing',
                                            value: <span className="badge badge--wing">Wing {wing}</span>,
                                        },
                                        {
                                            label: 'Owner Ratio',
                                            value: <span style={{ fontWeight: 700, color: 'var(--primary-600)' }}>
                                                {stats.total > 0 ? `${Math.round((stats.owners / stats.total) * 100)}%` : '0%'}
                                            </span>,
                                        },
                                        {
                                            label: 'Tenant Ratio',
                                            value: <span style={{ fontWeight: 700, color: 'var(--accent-600)' }}>
                                                {stats.total > 0 ? `${Math.round((stats.tenants / stats.total) * 100)}%` : '0%'}
                                            </span>,
                                        },
                                        {
                                            label: '🛵 Bikes — Owners / Tenants',
                                            value: <span style={{ fontWeight: 700, color: '#0f4c81' }}>
                                                {stats.ownerTwoWheelers} &nbsp;/&nbsp; {stats.tenantTwoWheelers}
                                            </span>,
                                        },
                                        {
                                            label: '🚗 Cars — Owners / Tenants',
                                            value: <span style={{ fontWeight: 700, color: '#7c3aed' }}>
                                                {stats.ownerFourWheelers} &nbsp;/&nbsp; {stats.tenantFourWheelers}
                                            </span>,
                                        },
                                        {
                                            label: 'Avg. Vehicles / Member',
                                            value: <span style={{ fontWeight: 700, color: '#065f46' }}>
                                                {stats.total > 0 ? (totalVehicles / stats.total).toFixed(1) : '0.0'}
                                            </span>,
                                        },
                                    ].map(({ label, value }) => (
                                        <div key={label} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '0.9rem 1rem',
                                            background: 'var(--gray-50)',
                                            borderRadius: 'var(--border-radius-md)',
                                        }}>
                                            <span style={{ fontWeight: 600 }}>{label}</span>
                                            {value}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                );
            })()}
        </div>
    );
};

export default DashboardPage;
