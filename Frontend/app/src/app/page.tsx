'use client';

import React, { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import EmergencyButton from './components/EmergencyButton';
import NavGuardModal from './components/NavGuardModal';
import AnimatedBackground from './components/AnimatedBackground';
import ToastHost from './components/ToastHost';
import MotionLayer from './components/MotionLayer';
import LoginPage from './components/LoginPage';
import { LiquidGlassFilter, useReducedMotion } from './components/fx';
import DashboardPage from './pages/DashboardPage';
import MediaSourcePage from './pages/GCSPage';
import LicensePage from './pages/LicensePage';
import SettingsPage from './pages/SettingsPage';
import UserManagementPage from './pages/UserManagementPage';
import AuditLogPage from './pages/AuditLogPage';
import {
  CrowdCountingPage,
  ImageDetectionPage, VideoDetectionPage,
  ImageEnhancementPage, VideoEnhancementPage,
  TetherAPIPage, TetherMonitorPage,
  ReportingPage, GeoVisualizationPage,
  AlertsPage, FlightInfoPage,
  MooringMonitorPage, SimulationPage,
} from './pages/ModulePages';

const PAGES: Record<string, React.ComponentType> = {
  'dashboard': DashboardPage,
  'media-source': MediaSourcePage,
  'crowd': CrowdCountingPage,
  'detection-image': ImageDetectionPage,
  'detection-video': VideoDetectionPage,
  'enhance-image': ImageEnhancementPage,
  'enhance-video': VideoEnhancementPage,
  'tether-api': TetherAPIPage,
  'tether-monitor': TetherMonitorPage,
  'reporting': ReportingPage,
  'geo-viz': GeoVisualizationPage,
  'alerts': AlertsPage,
  'flight-info': FlightInfoPage,
  'mooring': MooringMonitorPage,
  'simulation': SimulationPage,
  'licenses': LicensePage,
  'settings': SettingsPage,
  'users': UserManagementPage,
  'audit-log': AuditLogPage,
};

function AppContent() {
  const { currentPage, sidebarCollapsed, loginPhase, offline, lang } = useApp();

  /* Tirai peralihan hanya hidup sebentar lalu benar-benar dilepas dari
     pohon. Sebelumnya elemen ini dibiarkan terpasang selamanya dan
     mengandalkan animasi untuk memudar — akibatnya, pada perangkat yang
     meminta "kurangi gerakan" (animasi dimatikan) tirai tidak pernah
     hilang dan menutupi seluruh isi ruang kendali. */
  const reduced = useReducedMotion();
  const [curtain, setCurtain] = useState(false);
  const [prevPhase, setPrevPhase] = useState(loginPhase);

  /* Menyesuaikan state terhadap perubahan prop saat render adalah pola
     yang dianjurkan React — lebih tepat daripada effect, karena tirai
     harus sudah ada pada bingkai pertama ruang kendali. */
  if (prevPhase !== loginPhase) {
    setPrevPhase(loginPhase);
    if (loginPhase === 'app' && !reduced) setCurtain(true);
  }

  useEffect(() => {
    if (!curtain) return;
    const t = window.setTimeout(() => setCurtain(false), 1200);
    return () => window.clearTimeout(t);
  }, [curtain]);

  if (loginPhase !== 'app') return <LoginPage />;

  const Page = PAGES[currentPage] ?? DashboardPage;

  return (
    /* lang dipasang sebagai key agar seluruh pohon dirakit ulang saat
       bahasa berganti — memastikan tidak ada teks lama yang tertinggal
       pada komponen yang menyimpan string di dalam state-nya. */
    <div className={`app-layout ${offline ? 'is-offline' : ''}`} key={lang}>
      <AnimatedBackground />
      <Sidebar />
      <div className={`main-content ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Header />
        <main className="page-content">
          {/* key memaksa remount sehingga animasi masuk halaman selalu berjalan */}
          <Page key={currentPage} />
        </main>
      </div>
      <EmergencyButton />
      <NavGuardModal />
      <ToastHost />
      {/* Mengukur posisi pil dan rel; tidak merender apa pun sendiri. */}
      <MotionLayer />
      {curtain && <div className="curtain" aria-hidden />}
    </div>
  );
}

export default function Home() {
  return (
    <AppProvider>
      {/* Filter pembiasan dipasang sekali; dirujuk oleh seluruh panel kaca. */}
      <LiquidGlassFilter />
      <AppContent />
    </AppProvider>
  );
}
