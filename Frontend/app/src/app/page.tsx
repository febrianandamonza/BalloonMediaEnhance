'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { AppProvider, useApp } from './context';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EmergencyButton from './components/EmergencyButton';
import AnimatedBackground from './components/AnimatedBackground';
import ToastContainer from './components/ToastNotification';
import DashboardPage from './pages/DashboardPage';
import GCSPage from './pages/GCSPage';
import LicensePage from './pages/LicensePage';
import {
  CrowdCountingPage,
  ImageDetectionPage, VideoDetectionPage,
  ImageEnhancementPage, VideoEnhancementPage,
  TetherAPIPage, TetherMonitorPage,
  ReportingPage, GeoVisualizationPage,
  AlertsPage, FlightInfoPage,
  MooringMonitorPage, SimulationPage,
} from './pages/ModulePages';
import {
  Radar, Loader2, ShieldCheck, Check, X,
  Settings as SettingsIcon, UserCog, ScrollText, Download, Filter, Edit, Trash2,
  Link as LinkIcon, MonitorCog, User, Mail, Save, Plus, Search, Eye, EyeOff, Wifi,
} from 'lucide-react';

/* Lazy load 3D globe scene — only for login, not in main app */
const LoginScene3D = React.lazy(() => import('./components/LoginScene3D'));

/* ================================================================
   LOGIN PAGE — 3D Globe + Glassmorphic card
   ================================================================ */
function LoginPage() {
  const { loginPhase, setLoginPhase, theme } = useApp();
  const [loginError, setLoginError] = useState('');
  const [formData, setFormData] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const isLight = theme === 'light';

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');

    // Try real backend API first
    try {
      const api = (await import('./services/api')).default;
      await api.login(formData.username, formData.password);
      setLoginPhase('authenticating');
      setTimeout(() => setLoginPhase('success'), 1800);
      setTimeout(() => setLoginPhase('transitioning'), 3200);
      setTimeout(() => setLoginPhase('app'), 4200);
      return;
    } catch (apiError: any) {
      if (apiError?.status === 401) {
        setLoginError('Invalid credentials. Access denied.');
        return;
      }
      console.info('[Auth] Backend unavailable, using mock login');
    }

    // Mock fallback
    if (formData.username === 'admin' && formData.password === 'admin') {
      setLoginPhase('authenticating');
      setTimeout(() => setLoginPhase('success'), 1800);
      setTimeout(() => setLoginPhase('transitioning'), 3200);
      setTimeout(() => setLoginPhase('app'), 4200);
    } else {
      setLoginError('Invalid credentials. Access denied.');
    }
  }, [formData, setLoginPhase]);

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: '#020617',
      transition: 'opacity 0.8s ease',
      opacity: loginPhase === 'transitioning' ? 0 : 1,
    }}>
      {/* 3D Globe Background */}
      <Suspense fallback={
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, #020617 0%, #0a1628 50%, #0f172a 100%)' }} />
      }>
        <LoginScene3D phase={loginPhase} />
      </Suspense>

      {/* Login Form / Phases — Overlay on 3D scene */}
      <div style={{
        position: 'relative', zIndex: 20,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        height: '100vh', padding: 24,
      }}>
        {/* ===== PHASE: LOGIN FORM ===== */}
        {loginPhase === 'login' && (
          <div style={{
            width: '100%', maxWidth: 400,
            background: 'rgba(10, 14, 23, 0.7)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 20, padding: 40,
            boxShadow: '0 24px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
            animation: 'loginCardEnter 0.7s cubic-bezier(0.16, 1, 0.3, 1)',
          }}>
            {/* Logo */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
              <div style={{
                width: 60, height: 60, borderRadius: 16,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: 16, color: '#fff',
                boxShadow: '0 8px 24px rgba(59,130,246,0.3)',
              }}>
                <Radar size={30} />
              </div>
              <h2 style={{
                fontSize: 24, fontWeight: 700, letterSpacing: '-0.5px',
                color: '#f1f5f9',
                fontFamily: 'var(--font-heading)',
              }}>SkyStar GeoInt</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Tethered Balloon Surveillance System</p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit}>
              {loginError && (
                <div style={{
                  padding: '10px 14px', borderRadius: 10, marginBottom: 16,
                  background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)',
                  color: '#f87171', fontSize: 13, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <ShieldCheck size={16} /> {loginError}
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Username</label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="username" placeholder="Enter username" autoComplete="username"
                    value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 14px 12px 40px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f1f5f9', fontSize: 14, outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <User size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                </div>
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 12, fontWeight: 500, color: '#94a3b8', marginBottom: 6 }}>Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    name="password" type={showPassword ? 'text' : 'password'} placeholder="Enter password" autoComplete="current-password"
                    value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))}
                    style={{
                      width: '100%', padding: '12px 40px 12px 40px', borderRadius: 12,
                      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                      color: '#f1f5f9', fontSize: 14, outline: 'none',
                      transition: 'border-color 0.2s, box-shadow 0.2s',
                    }}
                    onFocus={e => { e.target.style.borderColor = 'rgba(59,130,246,0.5)'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.1)'; }}
                    onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.08)'; e.target.style.boxShadow = 'none'; }}
                  />
                  <ShieldCheck size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#64748b' }} />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} style={{
                    position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer', color: '#64748b', padding: 4,
                  }}>
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <button type="submit" style={{
                width: '100%', padding: '13px 20px', borderRadius: 12,
                background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
                color: '#fff', fontSize: 15, fontWeight: 600,
                border: 'none', cursor: 'pointer',
                transition: 'transform 0.15s, box-shadow 0.15s',
                boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-1px)'; e.currentTarget.style.boxShadow = '0 8px 24px rgba(59,130,246,0.4)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 16px rgba(59,130,246,0.3)'; }}
              >
                Sign In
              </button>
              <p style={{ textAlign: 'center', fontSize: 11, color: '#475569', marginTop: 16 }}>Demo: admin / admin</p>
            </form>
          </div>
        )}

        {/* ===== PHASE: AUTHENTICATING ===== */}
        {loginPhase === 'authenticating' && (
          <div style={{
            textAlign: 'center', animation: 'loginCardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            background: 'rgba(10, 14, 23, 0.6)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 20, padding: '40px 48px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%', margin: '0 auto 20px',
              border: '2px solid rgba(59,130,246,0.15)',
              borderTopColor: '#3b82f6',
              animation: 'spin 1s linear infinite',
            }} />
            <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 6, color: '#f1f5f9' }}>Establishing Connection</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Connecting to satellite network</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'flex-start' }}>
              {[
                { text: 'Validating credentials', delay: 0.2 },
                { text: 'Establishing satellite link', delay: 0.7 },
                { text: 'Loading surveillance modules', delay: 1.2 },
              ].map((step, i) => (
                <div key={step.text} style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  opacity: 0, animation: `fadeIn 0.3s ease ${step.delay}s forwards`,
                  fontSize: 13, color: '#94a3b8',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#3b82f6',
                    animation: `pulse 1.5s ease ${step.delay + 0.2}s infinite`,
                  }} />
                  {step.text}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== PHASE: SUCCESS ===== */}
        {loginPhase === 'success' && (
          <div style={{
            textAlign: 'center', animation: 'loginCardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
            background: 'rgba(10, 14, 23, 0.6)',
            backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
            borderRadius: 20, padding: '40px 48px',
            border: '1px solid rgba(16,185,129,0.15)',
          }}>
            <div style={{
              width: 72, height: 72, borderRadius: '50%', margin: '0 auto 20px',
              background: 'rgba(16,185,129,0.1)',
              border: '2px solid rgba(16,185,129,0.25)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: 'success-pop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}>
              <Check size={32} style={{ color: '#10b981' }} />
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, color: '#f1f5f9' }}>System Online</h3>
            <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>All systems operational, Commander</p>
            <div style={{
              display: 'inline-flex', flexDirection: 'column', gap: 8,
              background: 'rgba(255,255,255,0.03)',
              padding: '16px 28px', borderRadius: 14,
              border: '1px solid rgba(255,255,255,0.06)',
              animation: 'fadeIn 0.4s ease 0.2s both',
            }}>
              {[
                { l: 'Status', v: 'OPERATIONAL', c: '#10b981' },
                { l: 'Active Sites', v: '3 online', c: '#94a3b8' },
                { l: 'Surveillance', v: 'ACTIVE', c: '#3b82f6' },
              ].map(item => (
                <div key={item.l} style={{ display: 'flex', justifyContent: 'space-between', gap: 40, fontSize: 12 }}>
                  <span style={{ color: '#64748b' }}>{item.l}</span>
                  <span style={{ fontWeight: 600, fontFamily: 'var(--font-code)', color: item.c }}>{item.v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: '#475569', marginTop: 16 }}>Initializing Mission Control...</p>
          </div>
        )}
      </div>

      {/* CSS animations */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes success-pop { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.1); } 100% { transform: scale(1); opacity: 1; } }
        @keyframes loginCardEnter { from { opacity: 0; transform: translateY(20px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}

/* ================================================================
   MAIN APP SHELL
   ================================================================ */
function AppContent() {
  const { currentPage, sidebarCollapsed, loginPhase, toasts, dismissToast } = useApp();

  /* Show login flow until phase === 'app' */
  if (loginPhase !== 'app') {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard': return <DashboardPage />;
      case 'gcs': return <GCSPage />;
      case 'video': return <GCSPage />;
      case 'crowd': return <CrowdCountingPage />;
      case 'detection-image': return <ImageDetectionPage />;
      case 'detection-video': return <VideoDetectionPage />;
      case 'enhance-image': return <ImageEnhancementPage />;
      case 'enhance-video': return <VideoEnhancementPage />;
      case 'tether-api': return <TetherAPIPage />;
      case 'tether-monitor': return <TetherMonitorPage />;
      case 'reporting': return <ReportingPage />;
      case 'geo-viz': return <GeoVisualizationPage />;
      case 'alerts': return <AlertsPage />;
      case 'flight-info': return <FlightInfoPage />;
      case 'mooring': return <MooringMonitorPage />;
      case 'simulation': return <SimulationPage />;
      case 'licenses': return <LicensePage />;
      case 'settings': return <SettingsPage />;
      case 'users': return <UserManagementPage />;
      case 'audit-log': return <AuditLogPage />;
      default: return <DashboardPage />;
    }
  };

  return (
    <div className="app-layout" style={{ animation: 'fadeIn 0.6s ease' }}>
      <AnimatedBackground />
      <Sidebar />
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header />
        <main className="page-content">
          {renderPage()}
        </main>
      </div>
      <EmergencyButton />
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

/* ================================================================
   SETTINGS PAGE
   ================================================================ */
function SettingsPage() {
  const { theme, toggleTheme, addToast } = useApp();
  const [connSettings, setConnSettings] = useState({ type: 'Ethernet', ip: '192.168.10.100', port: '15004', model: 'Epsilon 140Z G2' });
  const [profileSettings, setProfileSettings] = useState({ name: 'Admin User', email: 'admin@skystar-geoint.id' });
  const [saving, setSaving] = useState<string | null>(null);

  const handleSaveConn = () => {
    setSaving('conn');
    setTimeout(() => {
      setSaving(null);
      addToast({ type: 'success', title: 'Connection Saved', message: `Epsilon connected via ${connSettings.type} at ${connSettings.ip}:${connSettings.port}` });
    }, 800);
  };

  const handleSaveProfile = () => {
    setSaving('profile');
    setTimeout(() => {
      setSaving(null);
      addToast({ type: 'success', title: 'Profile Updated', message: 'Your profile changes have been saved successfully.' });
    }, 800);
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon size={22} /> Settings
          </h1>
          <p className="page-description">System configuration and preferences</p>
        </div>
      </div>
      <div className="grid-2">
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={16} /> Epsilon Connection
          </div>
          <div className="form-group"><label className="form-label">Connection Type</label><select className="form-select" value={connSettings.type} onChange={e => setConnSettings(p => ({ ...p, type: e.target.value }))}><option>Ethernet</option><option>RS232 Serial (57600 baud)</option></select></div>
          <div className="form-group"><label className="form-label">IP Address</label><input className="form-input font-mono" value={connSettings.ip} onChange={e => setConnSettings(p => ({ ...p, ip: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Port</label><input className="form-input font-mono" value={connSettings.port} onChange={e => setConnSettings(p => ({ ...p, port: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Gimbal Model</label><select className="form-select" value={connSettings.model} onChange={e => setConnSettings(p => ({ ...p, model: e.target.value }))}><option>Epsilon 140Z G2</option><option>Epsilon 140Z</option><option>Epsilon 140</option><option>Epsilon 140LC</option></select></div>
          <button className="btn btn-primary" onClick={handleSaveConn} disabled={saving === 'conn'} style={{ gap: 6 }}>
            {saving === 'conn' ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={14} /> Save Connection</>}
          </button>
        </div>
        <div className="card">
          <div className="card-title" style={{ marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            <UserCog size={16} /> Preferences
          </div>
          <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={profileSettings.name} onChange={e => setProfileSettings(p => ({ ...p, name: e.target.value }))} /></div>
          <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={profileSettings.email} onChange={e => setProfileSettings(p => ({ ...p, email: e.target.value }))} /></div>
          <div className="form-group">
            <label className="form-label">Theme</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => theme !== 'dark' && toggleTheme()}>Dark</button>
              <button className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => theme !== 'light' && toggleTheme()}>Light</button>
            </div>
          </div>
          <button className="btn btn-primary" onClick={handleSaveProfile} disabled={saving === 'profile'} style={{ gap: 6 }}>
            {saving === 'profile' ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={14} /> Update Profile</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   USER MANAGEMENT PAGE — Full CRUD
   ================================================================ */
function UserManagementPage() {
  const { addToast } = useApp();
  const [users, setUsers] = useState([
    { id: 1, name: 'Admin User', username: 'admin', email: 'admin@skystar-geoint.id', role: 'Administrator', status: 'active', lastLogin: '2026-07-09 15:30' },
    { id: 2, name: 'Operator Budi', username: 'budi.op', email: 'budi@skystar-geoint.id', role: 'Operator', status: 'active', lastLogin: '2026-07-09 14:22' },
    { id: 3, name: 'Supervisor Ani', username: 'ani.spv', email: 'ani@skystar-geoint.id', role: 'Supervisor', status: 'active', lastLogin: '2026-07-08 18:00' },
    { id: 4, name: 'Tech Rudi', username: 'rudi.tech', email: 'rudi@skystar-geoint.id', role: 'Technician', status: 'inactive', lastLogin: '2026-07-01 09:15' },
    { id: 5, name: 'Commander Hadi', username: 'hadi.cmd', email: 'hadi@skystar-geoint.id', role: 'Commander', status: 'active', lastLogin: '2026-07-09 13:00' },
  ]);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<typeof users[0] | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', username: '', email: '', role: 'Operator', password: '' });

  const openAddModal = () => {
    setEditingUser(null);
    setFormData({ name: '', username: '', email: '', role: 'Operator', password: '' });
    setShowModal(true);
  };

  const openEditModal = (user: typeof users[0]) => {
    setEditingUser(user);
    setFormData({ name: user.name, username: user.username, email: user.email, role: user.role, password: '' });
    setShowModal(true);
  };

  const handleSaveUser = () => {
    if (!formData.name || !formData.username || !formData.email) return;
    if (editingUser) {
      setUsers(prev => prev.map(u => u.id === editingUser.id ? { ...u, name: formData.name, username: formData.username, email: formData.email, role: formData.role } : u));
      addToast({ type: 'success', title: 'User Updated', message: `${formData.name} has been updated successfully.` });
    } else {
      const newUser = { id: Date.now(), name: formData.name, username: formData.username, email: formData.email, role: formData.role, status: 'active', lastLogin: 'Never' };
      setUsers(prev => [...prev, newUser]);
      addToast({ type: 'success', title: 'User Created', message: `${formData.name} has been added as ${formData.role}.` });
    }
    setShowModal(false);
  };

  const handleDeleteUser = (id: number) => {
    const user = users.find(u => u.id === id);
    setUsers(prev => prev.filter(u => u.id !== id));
    setDeleteConfirm(null);
    addToast({ type: 'warning', title: 'User Deleted', message: `${user?.name} has been removed from the system.` });
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <UserCog size={22} /> User Management
          </h1>
          <p className="page-description">RBAC — 5 roles: Admin, Operator, Supervisor, Technician, Commander</p>
        </div>
        <button className="btn btn-primary" onClick={openAddModal} style={{ gap: 6 }}><Plus size={15} /> Add User</button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16, position: 'relative', maxWidth: 360 }}>
        <input className="form-input" placeholder="Search users..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ paddingLeft: 36 }} />
        <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </div>

      <div className="card">
        <div className="table-container">
          <table><thead><tr><th>User</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead>
          <tbody>
            {filteredUsers.map((u) => (
              <tr key={u.id}>
                <td style={{ fontWeight: 600 }}>{u.name}</td>
                <td className="font-mono">{u.username}</td>
                <td>{u.email}</td>
                <td><span className={`badge ${u.role === 'Administrator' ? 'badge-danger' : u.role === 'Commander' ? 'badge-warning' : u.role === 'Supervisor' ? 'badge-info' : 'badge-neutral'}`}>{u.role}</span></td>
                <td><span className={`badge badge-${u.status === 'active' ? 'success' : 'danger'}`}>{u.status === 'active' ? '● Active' : '○ Inactive'}</span></td>
                <td className="font-mono text-xs">{u.lastLogin}</td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => openEditModal(u)}><Edit size={14} /></button>
                    {deleteConfirm === u.id ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u.id)} style={{ fontSize: 11 }}>Confirm</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(null)} style={{ fontSize: 11 }}>Cancel</button>
                      </div>
                    ) : (
                      <button className="btn btn-ghost btn-sm" onClick={() => setDeleteConfirm(u.id)}><Trash2 size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>

      {/* RBAC Permission Matrix */}
      <div className="card mt-24">
        <div className="card-header"><div className="card-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}><ShieldCheck size={16} /> RBAC Permission Matrix</div></div>
        <div className="table-container">
          <table><thead><tr><th>Permission</th><th>Admin</th><th>Commander</th><th>Supervisor</th><th>Operator</th><th>Technician</th></tr></thead>
          <tbody>
            {[
              { perm: 'Gimbal Control', admin: true, cmd: false, spv: false, op: true, tech: false },
              { perm: 'Crowd Counting', admin: true, cmd: true, spv: true, op: true, tech: false },
              { perm: 'Report Generation', admin: true, cmd: true, spv: true, op: false, tech: false },
              { perm: 'Alert Configuration', admin: true, cmd: true, spv: true, op: false, tech: false },
              { perm: 'Flight Management', admin: true, cmd: true, spv: true, op: true, tech: false },
              { perm: 'Mooring View', admin: true, cmd: true, spv: true, op: true, tech: true },
              { perm: 'Maintenance', admin: true, cmd: false, spv: false, op: false, tech: true },
              { perm: 'License Mgmt', admin: true, cmd: false, spv: false, op: false, tech: false },
              { perm: 'User Mgmt', admin: true, cmd: false, spv: false, op: false, tech: false },
              { perm: 'Emergency Shutdown', admin: true, cmd: true, spv: true, op: true, tech: true },
            ].map((row) => (
              <tr key={row.perm}>
                <td style={{ fontWeight: 600 }}>{row.perm}</td>
                <td>{row.admin ? <Check size={16} style={{ color: 'var(--success-400)' }} /> : '—'}</td>
                <td>{row.cmd ? <Check size={16} style={{ color: 'var(--success-400)' }} /> : '—'}</td>
                <td>{row.spv ? <Check size={16} style={{ color: 'var(--success-400)' }} /> : '—'}</td>
                <td>{row.op ? <Check size={16} style={{ color: 'var(--success-400)' }} /> : '—'}</td>
                <td>{row.tech ? <Check size={16} style={{ color: 'var(--success-400)' }} /> : '—'}</td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>

      {/* Add/Edit User Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <UserCog size={18} /> {editingUser ? 'Edit User' : 'Add New User'}
                </h3>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: 4 }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Enter full name" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Username</label><input className="form-input font-mono" placeholder="Enter username" value={formData.username} onChange={e => setFormData(p => ({ ...p, username: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" placeholder="Enter email" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} /></div>
              <div className="form-group"><label className="form-label">Role</label><select className="form-select" value={formData.role} onChange={e => setFormData(p => ({ ...p, role: e.target.value }))}><option>Administrator</option><option>Commander</option><option>Supervisor</option><option>Operator</option><option>Technician</option></select></div>
              {!editingUser && <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" placeholder="Set password" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} /></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveUser} disabled={!formData.name || !formData.username || !formData.email}>
                {editingUser ? 'Save Changes' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ================================================================
   AUDIT LOG PAGE
   ================================================================ */
function AuditLogPage() {
  const { addToast } = useApp();
  const [filterUser, setFilterUser] = useState('all');
  const [filterAction, setFilterAction] = useState('all');
  const [showFilters, setShowFilters] = useState(false);

  const allLogs = [
    { time: '15:32:14', user: 'admin', action: 'license:activate', resource: 'Module 1.3c', ip: '10.0.1.5', status: 200 },
    { time: '15:30:01', user: 'budi.op', action: 'gimbal:control', resource: 'Pan to 127.3°', ip: '10.0.1.12', status: 200 },
    { time: '15:28:45', user: 'admin', action: 'crowd:start', resource: 'Session #42', ip: '10.0.1.5', status: 200 },
    { time: '14:52:10', user: 'ani.spv', action: 'alert:acknowledge', resource: 'Alert #89', ip: '10.0.1.8', status: 200 },
    { time: '14:30:00', user: 'admin', action: 'report:generate', resource: 'Daily Ops Report', ip: '10.0.1.5', status: 200 },
    { time: '14:22:33', user: 'budi.op', action: 'video:record_start', resource: 'Recording #156', ip: '10.0.1.12', status: 200 },
    { time: '13:45:00', user: 'system', action: 'alert:trigger', resource: 'Wind gust alert', ip: 'system', status: 200 },
    { time: '12:00:00', user: 'hadi.cmd', action: 'flight:start', resource: 'Mission #23', ip: '10.0.1.3', status: 200 },
    { time: '11:30:00', user: 'rudi.tech', action: 'maintenance:create', resource: 'Lens cleaning', ip: '10.0.1.15', status: 200 },
    { time: '08:00:00', user: 'admin', action: 'auth:login', resource: 'Session started', ip: '10.0.1.5', status: 200 },
  ];

  const logs = allLogs.filter(l => {
    if (filterUser !== 'all' && l.user !== filterUser) return false;
    if (filterAction !== 'all' && !l.action.startsWith(filterAction)) return false;
    return true;
  });

  const handleExport = () => {
    const csvContent = 'Timestamp,User,Action,Resource,IP,Status\n' +
      logs.map(l => `${l.time},${l.user},${l.action},${l.resource},${l.ip},${l.status}`).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({ type: 'success', title: 'Export Complete', message: `${logs.length} audit entries exported as CSV.` });
  };

  const uniqueUsers = [...new Set(allLogs.map(l => l.user))];
  const actionCategories = [...new Set(allLogs.map(l => l.action.split(':')[0]))];

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ScrollText size={22} /> Audit Log
          </h1>
          <p className="page-description">Complete trail of all system actions — immutable record</p>
        </div>
        <div className="flex gap-8">
          <button className="btn btn-secondary" onClick={handleExport} style={{ gap: 6 }}><Download size={14} /> Export CSV</button>
          <button className={`btn ${showFilters ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setShowFilters(!showFilters)} style={{ gap: 6 }}><Filter size={14} /> Filter</button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card" style={{ marginBottom: 16, padding: 16, display: 'flex', gap: 16, alignItems: 'flex-end', animation: 'slideUp 0.2s ease' }}>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">User</label>
            <select className="form-select" value={filterUser} onChange={e => setFilterUser(e.target.value)}>
              <option value="all">All Users</option>
              {uniqueUsers.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <div className="form-group" style={{ marginBottom: 0, flex: 1 }}>
            <label className="form-label">Action Category</label>
            <select className="form-select" value={filterAction} onChange={e => setFilterAction(e.target.value)}>
              <option value="all">All Actions</option>
              {actionCategories.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => { setFilterUser('all'); setFilterAction('all'); }} style={{ marginBottom: 1 }}>Clear</button>
        </div>
      )}

      <div className="card">
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
          Showing {logs.length} of {allLogs.length} entries
        </div>
        <div className="table-container">
          <table><thead><tr><th>Timestamp</th><th>User</th><th>Action</th><th>Resource</th><th>IP</th><th>Status</th></tr></thead>
          <tbody>
            {logs.map((log, i) => (
              <tr key={i}>
                <td className="font-mono text-xs">{log.time}</td>
                <td style={{ fontWeight: 600 }}>{log.user}</td>
                <td><span className="badge badge-info">{log.action}</span></td>
                <td>{log.resource}</td>
                <td className="font-mono text-xs">{log.ip}</td>
                <td><span className="badge badge-success">{log.status}</span></td>
              </tr>
            ))}
          </tbody></table>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   ROOT
   ================================================================ */
export default function Home() {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
}
