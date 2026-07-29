'use client';
import React, { useState } from 'react';
import { useApp } from '../context';
import {
  LayoutDashboard, Radar, Video, Users, ScanSearch, Clapperboard,
  Sparkles, Film, Cable, Activity, FileText, Globe, BellRing, Plane,
  Anchor, FlaskConical, KeyRound, UserCog, ScrollText, Settings,
  ChevronLeft, ChevronRight, Crosshair,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  dashboard: <LayoutDashboard size={18} />,
  gcs: <Crosshair size={18} />,
  video: <Video size={18} />,
  crowd: <Users size={18} />,
  'detection-image': <ScanSearch size={18} />,
  'detection-video': <Clapperboard size={18} />,
  'enhance-image': <Sparkles size={18} />,
  'enhance-video': <Film size={18} />,
  // 'tether-api': <Cable size={18} />,
  'tether-monitor': <Activity size={18} />,
  reporting: <FileText size={18} />,
  'geo-viz': <Globe size={18} />,
  alerts: <BellRing size={18} />,
  'flight-info': <Plane size={18} />,
  mooring: <Anchor size={18} />,
  simulation: <FlaskConical size={18} />,
  licenses: <KeyRound size={18} />,
  users: <UserCog size={18} />,
  'audit-log': <ScrollText size={18} />,
  settings: <Settings size={18} />,
};

const NAV_ITEMS = [
  {
    section: 'GCS Control', items: [
      { id: 'dashboard', label: 'Dashboard', license: 'BASE' },
      { id: 'gcs', label: 'GCS Control', license: 'BASE' },
    ]
  },
  {
    section: 'Crowd Counting', items: [
      { id: 'video', label: 'Video Feed', license: 'BASE' },
      { id: 'crowd', label: 'Crowd Counting', license: 'BASE' },
    ]
  },
  {
    section: 'Analytics Object Detection', items: [
      { id: 'detection-image', label: 'Image Detection', license: '1.1a' },
      { id: 'detection-video', label: 'Video Detection', license: '1.1b' },
    ]
  },
  {
    section: 'Digital Enhancement', items: [
      { id: 'enhance-image', label: 'Image Enhance', license: '1.2a' },
      { id: 'enhance-video', label: 'Video Enhance', license: '1.2b' },
      // { id: 'tether-api', label: 'Tether API', license: '1.2c' },
      { id: 'tether-monitor', label: 'Tether Monitor', license: '1.2d' },
    ]
  },
  {
    section: 'Information & Reporting', items: [
      { id: 'reporting', label: 'Reporting', license: '1.3a' },
      { id: 'geo-viz', label: 'GEO Map', license: '1.3b' },
      { id: 'alerts', label: 'Alerts', license: '1.3c' },
      { id: 'flight-info', label: 'Flight Info', license: '1.3d' },
      { id: 'mooring', label: 'Mooring', license: '1.3e' },
      { id: 'simulation', label: 'Simulation', license: '1.3f' },
    ]
  },
  {
    section: 'System', items: [
      { id: 'licenses', label: 'Licenses', license: 'BASE' },
      { id: 'users', label: 'Users', license: 'BASE' },
      { id: 'audit-log', label: 'Audit Log', license: 'BASE' },
      { id: 'settings', label: 'Settings', license: 'BASE' },
    ]
  },
];

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, currentPage, setCurrentPage, isLicensed } = useApp();
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const collapsed = sidebarCollapsed;

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Brand */}
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">
          <Radar size={18} style={{ color: '#fff' }} />
        </div>
        {!collapsed && (
          <div className="sidebar-brand-text">
            <h1>SkyStar GeoInt</h1>
            <span>MONITORING SYS</span>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => (
          <div key={section.section} style={{ marginBottom: 4 }}>
            {!collapsed && (
              <div className="nav-section-title">{section.section}</div>
            )}
            {collapsed && <div style={{ height: 12 }} />}
            {section.items.map((item) => {
              const licensed = isLicensed(item.license);
              const isActive = currentPage === item.id;
              const isHovered = hoveredItem === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentPage(item.id)}
                  onMouseEnter={() => setHoveredItem(item.id)}
                  onMouseLeave={() => setHoveredItem(null)}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  style={{
                    justifyContent: collapsed ? 'center' : 'flex-start',
                    opacity: !licensed && item.license !== 'BASE' ? 0.35 : 1,
                    background: isActive
                      ? 'rgba(88,166,255,0.08)'
                      : isHovered ? 'var(--bg-card-hover)' : 'transparent',
                    borderColor: isActive
                      ? 'rgba(88,166,255,0.15)'
                      : 'transparent',
                    color: isActive
                      ? 'var(--neon-cyan)'
                      : isHovered ? 'var(--text-primary)' : 'var(--text-secondary)',
                  }}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div style={{
                      position: 'absolute', left: 0, top: 8, bottom: 8, width: 3,
                      background: 'var(--neon-cyan)',
                      borderRadius: '0 3px 3px 0',
                    }} />
                  )}
                  <span style={{ width: 20, height: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {ICON_MAP[item.id]}
                  </span>
                  {!collapsed && (
                    <span className="nav-label">{item.label}</span>
                  )}
                  {!collapsed && item.license !== 'BASE' && (
                    <span style={{
                      fontSize: 9, fontWeight: 600, marginLeft: 'auto',
                      width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      borderRadius: '50%',
                      background: licensed ? 'rgba(63,185,80,0.1)' : 'rgba(248,81,73,0.1)',
                      color: licensed ? 'var(--success-400)' : 'var(--danger-400)',
                    }}>
                      {licensed ? '✓' : '⊘'}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div style={{ padding: collapsed ? '10px 6px' : '10px', borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
        {!collapsed && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 8, marginBottom: 8,
            background: 'var(--bg-card-hover)',
            border: '1px solid var(--border-subtle)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--neon-cyan), var(--neon-blue))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, color: '#fff',
            }}>AD</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>Admin</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>Administrator</div>
            </div>
            <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--success-400)' }} />
          </div>
        )}
        <button
          onClick={toggleSidebar}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            padding: '8px 0', border: '1px solid var(--border-subtle)',
            background: 'transparent', borderRadius: 8, cursor: 'pointer',
            color: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-sans)', fontWeight: 500,
            transition: 'all 0.15s ease',
          }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={14} /><span>Collapse</span></>}
        </button>
      </div>
    </aside>
  );
}
