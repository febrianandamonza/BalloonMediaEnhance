'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context';
import {
  Bell, Sun, Moon, MapPin, User, Settings, LogOut, ChevronDown,
  Shield, AlertTriangle, Info, CheckCircle2, Clock,
} from 'lucide-react';

function useClickOutside(ref: React.RefObject<HTMLDivElement | null>, handler: () => void) {
  useEffect(() => {
    const listener = (e: MouseEvent) => {
      if (!ref.current || ref.current.contains(e.target as Node)) return;
      handler();
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

const NOTIFICATIONS = [
  { id: 1, title: 'Wind gust exceeded 25 km/h', time: '2 min ago', type: 'warning' as const, read: false },
  { id: 2, title: 'Crowd count > 500 at Zone A', time: '15 min ago', type: 'info' as const, read: false },
  { id: 3, title: 'Geofence breach — sector NW', time: '1h ago', type: 'critical' as const, read: true },
  { id: 4, title: 'Daily backup completed', time: '3h ago', type: 'success' as const, read: true },
];

const NOTIF_ICONS = {
  warning: <AlertTriangle size={14} />,
  info: <Info size={14} />,
  critical: <Shield size={14} />,
  success: <CheckCircle2 size={14} />,
};
const NOTIF_COLORS = {
  warning: 'var(--warning-400)',
  info: 'var(--info-400)',
  critical: 'var(--danger-400)',
  success: 'var(--success-400)',
};

export default function Header() {
  const { currentPage, sidebarCollapsed, theme, toggleTheme, userSession, logout, setCurrentPage } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [notifications, setNotifications] = useState(NOTIFICATIONS);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useClickOutside(notifRef, () => setShowNotifications(false));
  useClickOutside(userRef, () => setShowUserMenu(false));

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const pageNames: Record<string, string> = {
    'dashboard': 'Mission Control',
    'gcs': 'Ground Control Station',
    'video': 'Video Feed',
    'crowd': 'Crowd Counting',
    'detection-image': 'Image Object Detection',
    'detection-video': 'Video Object Detection',
    'enhance-image': 'Image Enhancement',
    'enhance-video': 'Video Enhancement',
    'tether-api': 'Tether Cable API',
    'tether-monitor': 'Tether Cable Monitor',
    'reporting': 'Digital Reporting',
    'geo-viz': 'GEO Visualization',
    'alerts': 'Smart Alerts & Notifications',
    'flight-info': 'Flight Information',
    'mooring': 'Mooring Monitoring',
    'simulation': 'Flight Simulation',
    'licenses': 'License Manager',
    'users': 'User Management',
    'audit-log': 'Audit Log',
    'settings': 'Settings',
  };

  const dropdownStyle: React.CSSProperties = {
    position: 'absolute', top: '100%', right: 0, marginTop: 8,
    background: 'var(--glass-bg-strong)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    border: '1px solid var(--border-default)',
    borderRadius: 12, overflow: 'hidden',
    boxShadow: 'var(--shadow-xl)',
    animation: 'slideUp 0.2s var(--ease-out)',
    zIndex: 200,
  };

  return (
    <header className="header" style={{ left: sidebarCollapsed ? 72 : 260 }}>
      <div className="header-left">
        <h2 className="header-title">{pageNames[currentPage] || 'Dashboard'}</h2>
      </div>
      <div className="header-right">
        {/* Site selector */}
        <button className="site-selector">
          <MapPin size={14} style={{ opacity: 0.6 }} />
          <span className="site-status-dot online" />
          <span style={{ fontSize: 13 }}>Jakarta HQ</span>
        </button>

        {/* Notification bell */}
        <div ref={notifRef} style={{ position: 'relative' }}>
          <button
            className="header-btn"
            aria-label="Notifications"
            onClick={() => { setShowNotifications(!showNotifications); setShowUserMenu(false); }}
          >
            <Bell size={16} />
            {unreadCount > 0 && <span className="badge-dot" />}
          </button>

          {showNotifications && (
            <div style={{ ...dropdownStyle, width: 360 }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', borderBottom: '1px solid var(--border-subtle)',
              }}>
                <span style={{ fontSize: 14, fontWeight: 700 }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    style={{
                      background: 'none', border: 'none', cursor: 'pointer',
                      fontSize: 12, color: 'var(--neon-cyan)', fontFamily: 'var(--font-sans)', fontWeight: 600,
                    }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                {notifications.map(n => (
                  <div
                    key={n.id}
                    style={{
                      display: 'flex', gap: 12, padding: '12px 16px',
                      borderBottom: '1px solid var(--border-subtle)',
                      opacity: n.read ? 0.6 : 1,
                      cursor: 'pointer', transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => { setCurrentPage('alerts'); setShowNotifications(false); }}
                  >
                    <div style={{ color: NOTIF_COLORS[n.type], marginTop: 2, flexShrink: 0 }}>
                      {NOTIF_ICONS[n.type]}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Clock size={10} /> {n.time}
                      </div>
                    </div>
                    {!n.read && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%', flexShrink: 0, marginTop: 6,
                        background: 'var(--neon-cyan)', boxShadow: '0 0 4px rgba(88,166,255,0.3)',
                      }} />
                    )}
                  </div>
                ))}
              </div>
              <div style={{ padding: '10px 16px', borderTop: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                <button
                  onClick={() => { setCurrentPage('alerts'); setShowNotifications(false); }}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: 12, color: 'var(--neon-cyan)', fontFamily: 'var(--font-sans)', fontWeight: 600,
                  }}
                >
                  View All Alerts →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle — animated sun/moon */}
        <button
          className="header-btn"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            transform: theme === 'dark' ? 'rotate(0deg) scale(1)' : 'rotate(180deg) scale(0)',
            opacity: theme === 'dark' ? 1 : 0, position: 'absolute',
          }}>
            <Moon size={16} />
          </div>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
            transform: theme === 'light' ? 'rotate(0deg) scale(1)' : 'rotate(-180deg) scale(0)',
            opacity: theme === 'light' ? 1 : 0, position: 'absolute',
          }}>
            <Sun size={16} />
          </div>
        </button>

        {/* User avatar with dropdown */}
        <div ref={userRef} style={{ position: 'relative' }}>
          <button
            onClick={() => { setShowUserMenu(!showUserMenu); setShowNotifications(false); }}
            style={{
              display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
              background: 'none', border: 'none', fontFamily: 'var(--font-sans)',
            }}
          >
            <div className="user-avatar">
              {userSession.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <ChevronDown size={12} style={{
              color: 'var(--text-muted)', transition: 'transform 0.2s',
              transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0)',
            }} />
          </button>

          {showUserMenu && (
            <div style={{ ...dropdownStyle, width: 240 }}>
              <div style={{ padding: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>{userSession.fullName}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>{userSession.email}</div>
                <span className="badge badge-info" style={{ marginTop: 8, display: 'inline-flex' }}>{userSession.role}</span>
              </div>
              {[
                { icon: <User size={15} />, label: 'My Profile', action: () => { setCurrentPage('settings'); setShowUserMenu(false); } },
                { icon: <Settings size={15} />, label: 'Settings', action: () => { setCurrentPage('settings'); setShowUserMenu(false); } },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--text-secondary)',
                    fontSize: 13, fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-card-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {item.icon} {item.label}
                </button>
              ))}
              <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
                <button
                  onClick={() => { logout(); setShowUserMenu(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10, width: '100%',
                    padding: '10px 16px', background: 'none', border: 'none',
                    cursor: 'pointer', color: 'var(--danger-400)',
                    fontSize: 13, fontFamily: 'var(--font-sans)', transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--danger-bg)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <LogOut size={15} /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
