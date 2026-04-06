import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import AdminLayout from './components/AdminLayout';
import MemberLayout from './components/MemberLayout';
import PublicFormPage from './pages/PublicFormPage';
import LoginPage from './pages/LoginPage';
import MemberLoginPage from './pages/MemberLoginPage';
import DashboardPage from './pages/DashboardPage';
import MembersPage from './pages/MembersPage';
import EditMemberPage from './pages/EditMemberPage';
import VehicleSearchPage from './pages/VehicleSearchPage';
import SecurityPage from './pages/SecurityPage';
import VisitorNotificationsPage from './pages/VisitorNotificationsPage';
import VisitorHistoryPage from './pages/VisitorHistoryPage';
import MemberProfilePage from './pages/MemberProfilePage';
import MemberVisitorsPage from './pages/MemberVisitorsPage';
import MemberVisitorHistoryPage from './pages/MemberVisitorHistoryPage';

/** Smart root redirect based on role */
const RootRedirect: React.FC = () => {
    const { isAuthenticated, isMember } = useAuth();
    if (isAuthenticated) {
        return <Navigate to={isMember ? '/member/profile' : '/admin/dashboard'} replace />;
    }
    return <Navigate to="/login" replace />;
};

const App: React.FC = () => {
    return (
        <AuthProvider>
            <BrowserRouter>
                <Toaster
                    position="top-right"
                    toastOptions={{
                        duration: 4000,
                        style: {
                            background: '#1e293b',
                            color: '#f1f5f9',
                            borderRadius: '12px',
                            padding: '12px 16px',
                            fontSize: '0.9rem',
                            fontFamily: "'Inter', sans-serif",
                        },
                        success: { iconTheme: { primary: '#10b981', secondary: '#fff' } },
                        error:   { iconTheme: { primary: '#f43f5e', secondary: '#fff' } },
                    }}
                />

                <Routes>
                    {/* ── Public form (member self-registration) ── */}
                    <Route path="/public/:wing/:type" element={<PublicFormPage />} />

                    {/* ── Auth Routes ─────────────────────────── */}
                    {/* Admin / Chairman / Security login */}
                    <Route path="/login"        element={<LoginPage />} />
                    {/* Resident / Member login */}
                    <Route path="/member-login" element={<MemberLoginPage />} />

                    {/* ── Member Portal ────────────────────────── */}
                    <Route
                        path="/member"
                        element={
                            <ProtectedRoute requiredRole="member">
                                <MemberLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="profile"           element={<MemberProfilePage />} />
                        <Route path="visitors"           element={<MemberVisitorsPage />} />
                        <Route path="visitors/history"  element={<MemberVisitorHistoryPage />} />
                    </Route>

                    {/* ── Protected Admin Routes ───────────────── */}
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute requiredRole="admin">
                                <AdminLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route index element={<Navigate to="/admin/dashboard" replace />} />
                        <Route path="dashboard"              element={<DashboardPage />} />
                        <Route path="members"                element={<MembersPage />} />
                        <Route path="members/:id/edit"       element={<EditMemberPage />} />
                        <Route path="search"                 element={<VehicleSearchPage />} />
                        <Route path="security"               element={<SecurityPage />} />
                        <Route path="visitors/notifications" element={<VisitorNotificationsPage />} />
                        <Route path="visitors/history"       element={<VisitorHistoryPage />} />
                    </Route>

                    {/* ── Fallback ──────────────────────────────── */}
                    <Route path="/" element={<RootRedirect />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </BrowserRouter>
        </AuthProvider>
    );
};

export default App;
