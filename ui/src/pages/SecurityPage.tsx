import React, { useState, useRef, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import api from '../api/axios';
import type { Visitor } from '../types';
import { VALID_WINGS } from '../types';

const STATUS_COLOR: Record<string, string> = {
    pending:  '#f59e0b',
    approved: '#10b981',
    rejected: '#ef4444',
    expired:  '#6b7280',
    archived: '#374151',
};

const SecurityPage: React.FC = () => {
    // ── Form state ──────────────────────────────────────────────────────────
    const [form, setForm] = useState({
        visitorName: '',
        visitorPhone: '',
        purpose: '',
        wing: '',
        flatNo: '',
        vehicleRegNo: '',
        vehicleType: 'none' as '2W' | '4W' | 'none',
        expiryHours: '24',
    });
    const [photo, setPhoto] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [showCamera, setShowCamera] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // ── Today's entries ─────────────────────────────────────────────────────
    const [entries, setEntries] = useState<Visitor[]>([]);
    const [loadingEntries, setLoadingEntries] = useState(true);

    const fetchEntries = useCallback(async () => {
        try {
            const res = await api.get('/security/visitors');
            if (res.data.success) setEntries(res.data.data);
        } catch {
            // silent
        } finally {
            setLoadingEntries(false);
        }
    }, []);

    useEffect(() => {
        fetchEntries();
    }, [fetchEntries]);

    // ── Camera ──────────────────────────────────────────────────────────────
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream;
            setShowCamera(true);
            requestAnimationFrame(() => {
                if (videoRef.current) videoRef.current.srcObject = stream;
            });
        } catch {
            toast.error('Camera not accessible');
        }
    };

    const stopCamera = () => {
        streamRef.current?.getTracks().forEach(t => t.stop());
        streamRef.current = null;
        setShowCamera(false);
    };

    const capturePhoto = () => {
        if (!videoRef.current) return;
        const canvas = document.createElement('canvas');
        canvas.width  = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        setPhoto(canvas.toDataURL('image/jpeg', 0.75));
        stopCamera();
    };

    const handleFilePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = ev => setPhoto(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    // ── Submit ───────────────────────────────────────────────────────────────
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.visitorName.trim()) { toast.error('Visitor name is required'); return; }
        if (!form.wing || !form.flatNo.trim()) { toast.error('Destination flat is required'); return; }

        setSubmitting(true);
        try {
            const res = await api.post('/security/visitors', { ...form, photo });
            if (res.data.success) {
                toast.success('✅ Visitor entry logged!');
                setForm({ visitorName: '', visitorPhone: '', purpose: '', wing: '', flatNo: '', vehicleRegNo: '', vehicleType: 'none', expiryHours: '24' });
                setPhoto(null);
                fetchEntries();
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || 'Failed to create entry');
        } finally {
            setSubmitting(false);
        }
    };

    const field = (key: keyof typeof form, value: string) =>
        setForm(prev => ({ ...prev, [key]: value }));

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '100vh', background: 'var(--bg-primary, #0f172a)', padding: '1.5rem', fontFamily: "'Inter', sans-serif" }}>
            <div style={{ maxWidth: '960px', margin: '0 auto' }}>

                {/* Header */}
                <div style={{ marginBottom: '2rem' }}>
                    <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f1f5f9', margin: 0 }}>
                        🛡️ Security Dashboard
                    </h1>
                    <p style={{ color: '#94a3b8', margin: '0.25rem 0 0' }}>Log visitor entries for the society</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>

                    {/* ── Entry Form ─────────────────────────────────────────────── */}
                    <div style={cardStyle}>
                        <h2 style={cardTitleStyle}>➕ New Visitor Entry</h2>
                        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>

                            <FormField label="Visitor Name *">
                                <input style={inputStyle} placeholder="John Doe" value={form.visitorName}
                                    onChange={e => field('visitorName', e.target.value)} />
                            </FormField>

                            <FormField label="Phone">
                                <input style={inputStyle} placeholder="10-digit number" value={form.visitorPhone}
                                    onChange={e => field('visitorPhone', e.target.value)} maxLength={10} />
                            </FormField>

                            <FormField label="Purpose">
                                <input style={inputStyle} placeholder="Delivery / Guest / Service…" value={form.purpose}
                                    onChange={e => field('purpose', e.target.value)} />
                            </FormField>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <FormField label="Wing *">
                                    <select style={inputStyle} value={form.wing} onChange={e => field('wing', e.target.value)}>
                                        <option value="">Select</option>
                                        {VALID_WINGS.map(w => <option key={w} value={w}>{w}</option>)}
                                    </select>
                                </FormField>
                                <FormField label="Flat No *">
                                    <input style={inputStyle} placeholder="101" value={form.flatNo}
                                        onChange={e => field('flatNo', e.target.value)} />
                                </FormField>
                            </div>

                            <FormField label="Vehicle Registration">
                                <input style={inputStyle} placeholder="MH14AB1234" value={form.vehicleRegNo}
                                    onChange={e => field('vehicleRegNo', e.target.value.toUpperCase())} />
                            </FormField>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                                <FormField label="Vehicle Type">
                                    <select style={inputStyle} value={form.vehicleType} onChange={e => field('vehicleType', e.target.value as any)}>
                                        <option value="none">None</option>
                                        <option value="2W">2 Wheeler</option>
                                        <option value="4W">4 Wheeler</option>
                                    </select>
                                </FormField>
                                <FormField label="Valid For (hours)">
                                    <select style={inputStyle} value={form.expiryHours} onChange={e => field('expiryHours', e.target.value)}>
                                        <option value="4">4 hours</option>
                                        <option value="8">8 hours</option>
                                        <option value="12">12 hours</option>
                                        <option value="24">24 hours</option>
                                        <option value="48">48 hours</option>
                                        <option value="72">72 hours</option>
                                    </select>
                                </FormField>
                            </div>

                            {/* Photo */}
                            <FormField label="Visitor Photo">
                                {showCamera ? (
                                    <div>
                                        <video ref={videoRef} autoPlay playsInline style={{ width: '100%', borderRadius: '8px' }} />
                                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                                            <button type="button" onClick={capturePhoto} style={greenBtnStyle}>📸 Capture</button>
                                            <button type="button" onClick={stopCamera} style={grayBtnStyle}>Cancel</button>
                                        </div>
                                    </div>
                                ) : photo ? (
                                    <div>
                                        <img src={photo} alt="Visitor" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '8px' }} />
                                        <button type="button" onClick={() => setPhoto(null)} style={{ ...grayBtnStyle, marginTop: '0.4rem', width: '100%' }}>🗑️ Remove</button>
                                    </div>
                                ) : (
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button type="button" onClick={startCamera} style={grayBtnStyle}>📷 Camera</button>
                                        <label style={grayBtnStyle}>
                                            🖼️ Upload
                                            <input type="file" accept="image/*" onChange={handleFilePhoto} style={{ display: 'none' }} />
                                        </label>
                                    </div>
                                )}
                            </FormField>

                            <button type="submit" disabled={submitting} style={{
                                ...greenBtnStyle, width: '100%', fontSize: '1rem', padding: '0.75rem',
                                opacity: submitting ? 0.7 : 1,
                            }}>
                                {submitting ? '⏳ Logging…' : '✅ Log Visitor'}
                            </button>
                        </form>
                    </div>

                    {/* ── Today's Entries ────────────────────────────────────────── */}
                    <div style={cardStyle}>
                        <h2 style={cardTitleStyle}>📋 Today's Entries</h2>
                        {loadingEntries ? (
                            <p style={{ color: '#64748b' }}>Loading…</p>
                        ) : entries.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#64748b', padding: '2rem' }}>
                                <div style={{ fontSize: '2.5rem' }}>🚪</div>
                                <p>No entries today</p>
                            </div>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.7rem', maxHeight: '600px', overflowY: 'auto' }}>
                                {entries.map(v => (
                                    <div key={v._id} style={entryCardStyle}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <div>
                                                <div style={{ fontWeight: 700, color: '#f1f5f9' }}>{v.visitorName}</div>
                                                <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>
                                                    Flat {v.wing}-{v.flatNo} · {v.purpose || 'No purpose'}
                                                </div>
                                                {v.vehicle?.regNo && (
                                                    <div style={{ fontSize: '0.8rem', color: '#7dd3fc', marginTop: '2px' }}>
                                                        🚗 {v.vehicle.regNo}
                                                    </div>
                                                )}
                                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                                                    {new Date(v.entryTime).toLocaleTimeString()} · Expires {new Date(v.expiresAt).toLocaleTimeString()}
                                                </div>
                                            </div>
                                            <span style={{
                                                fontSize: '0.72rem', fontWeight: 700, padding: '3px 8px', borderRadius: '20px',
                                                background: STATUS_COLOR[v.status] + '22',
                                                color: STATUS_COLOR[v.status],
                                                border: `1px solid ${STATUS_COLOR[v.status]}44`,
                                                textTransform: 'uppercase',
                                            }}>
                                                {v.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <button onClick={fetchEntries} style={{ ...grayBtnStyle, width: '100%', marginTop: '0.75rem' }}>🔄 Refresh</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// ── Sub-components ─────────────────────────────────────────────────────────────
const FormField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
    <div>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: '4px' }}>{label}</label>
        {children}
    </div>
);

// ── Styles ─────────────────────────────────────────────────────────────────────
const cardStyle: React.CSSProperties = {
    background: 'rgba(30,37,60,0.95)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '1.5rem',
    backdropFilter: 'blur(12px)',
};
const cardTitleStyle: React.CSSProperties = {
    fontSize: '1rem', fontWeight: 700, color: '#f1f5f9', margin: '0 0 1.25rem',
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.75rem', borderRadius: '8px', boxSizing: 'border-box',
    background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)',
    color: '#f1f5f9', fontSize: '0.9rem', outline: 'none',
};
const greenBtnStyle: React.CSSProperties = {
    padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', cursor: 'pointer',
    background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff',
    font: '600 0.85rem Inter,sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
};
const grayBtnStyle: React.CSSProperties = {
    padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.12)',
    cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1',
    font: '600 0.85rem Inter,sans-serif', display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
};
const entryCardStyle: React.CSSProperties = {
    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', padding: '0.75rem 1rem',
};

export default SecurityPage;
