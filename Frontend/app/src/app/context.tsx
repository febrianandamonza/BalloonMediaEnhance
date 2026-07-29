'use client';
import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import type { Toast } from './components/ToastNotification';

/* ===== Types ===== */
type Theme = 'dark' | 'light';
type LoginPhase = 'login' | 'authenticating' | 'success' | 'transitioning' | 'app';

interface LicenseState {
  active: boolean;
  serialNumber: string;
  expiry: string;
  maxSeats: number;
  modules: Record<string, { active: boolean; name: string }>;
}

interface UserSession {
  username: string;
  fullName: string;
  role: string;
  email: string;
}

interface AppContextType {
  /* Theme */
  theme: Theme;
  toggleTheme: () => void;
  /* Navigation */
  currentPage: string;
  setCurrentPage: (page: string) => void;
  /* Sidebar */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /* License */
  license: LicenseState;
  isLicensed: (code: string) => boolean;
  activateLicense: (code: string) => void;
  /* Login flow */
  loginPhase: LoginPhase;
  setLoginPhase: (phase: LoginPhase) => void;
  /* Emergency */
  showEmergencyModal: boolean;
  setShowEmergencyModal: (show: boolean) => void;
  /* Toast */
  toasts: Toast[];
  addToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: string) => void;
  /* User session */
  userSession: UserSession;
  logout: () => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/* ===== Default License State ===== */
const defaultLicense: LicenseState = {
  active: true,
  serialNumber: 'SKS-2026-0001-GEOINT',
  expiry: '2027-07-09',
  maxSeats: 2,
  modules: {
    '1.1a': { active: true, name: 'Digital Imaging Analytic & Object Detection' },
    '1.1b': { active: false, name: 'Digital Video Analytic & Object Detection' },
    '1.2a': { active: true, name: 'Digital Imaging Enhancement' },
    '1.2b': { active: true, name: 'Digital Video Enhancement' },
    '1.2c': { active: false, name: 'Tether Cable API' },
    '1.2d': { active: false, name: 'Tether Cable Monitor' },
    '1.3a': { active: true, name: 'Digital Reporting' },
    '1.3b': { active: true, name: 'GEO Visualization' },
    '1.3c': { active: true, name: 'Smart Notification Alert' },
    '1.3d': { active: true, name: 'Flight Info App' },
    '1.3e': { active: false, name: 'Mooring Monitor' },
    '1.3f': { active: false, name: 'Flight Simulation' },
  },
};

const defaultUser: UserSession = {
  username: 'admin',
  fullName: 'Admin User',
  role: 'Administrator',
  email: 'admin@skystar-geoint.id',
};

/* ===== Provider ===== */
export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [license, setLicense] = useState<LicenseState>(defaultLicense);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>('login');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [userSession, setUserSession] = useState<UserSession>(defaultUser);

  /* Apply theme to document */
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  }, []);

  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => !prev);
  }, []);

  const isLicensed = useCallback((code: string) => {
    if (code === 'BASE') return license.active;
    return license.modules[code]?.active ?? false;
  }, [license]);

  const activateLicense = useCallback((code: string) => {
    setLicense(prev => ({
      ...prev,
      modules: {
        ...prev.modules,
        [code]: { ...prev.modules[code], active: true },
      },
    }));
  }, []);

  /* Toast system */
  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts(prev => [...prev.slice(-4), { ...toast, id }]); // Max 5 toasts
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  /* Logout */
  const logout = useCallback(() => {
    setLoginPhase('login');
    setCurrentPage('dashboard');
    setUserSession(defaultUser);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }, []);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      currentPage, setCurrentPage,
      sidebarCollapsed, toggleSidebar,
      license, isLicensed, activateLicense,
      loginPhase, setLoginPhase,
      showEmergencyModal, setShowEmergencyModal,
      toasts, addToast, dismissToast,
      userSession, logout,
    }}>
      {children}
    </AppContext.Provider>
  );
}
