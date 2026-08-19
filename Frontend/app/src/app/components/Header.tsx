'use client';
import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context';
import { NAV_INDEX } from './Sidebar';
import NotificationCenter from './NotificationCenter';
import { Bell, Sun, Moon, MapPin, Wifi, WifiOff, Clock } from 'lucide-react';

export default function Header() {
  const {
    currentPage, sidebarCollapsed, theme, toggleTheme, account, offline, t,
    notifications, unreadCount, notifOpen, setNotifOpen,
  } = useApp();
  const [clock, setClock] = useState('');

  /* Lonceng bergoyang sekali setiap notifikasi baru masuk. Isyarat ini
     sengaja singkat: gerakan yang berputar terus akan diabaikan mata
     dalam hitungan menit. */
  const [ringing, setRinging] = useState(false);
  const [popped, setPopped] = useState(false);
  const prevUnread = useRef(unreadCount);

  useEffect(() => {
    const naik = unreadCount > prevUnread.current;
    prevUnread.current = unreadCount;
    if (!naik) return;

    setRinging(true);
    setPopped(true);
    const a = window.setTimeout(() => setRinging(false), 950);
    const b = window.setTimeout(() => setPopped(false), 550);
    return () => { window.clearTimeout(a); window.clearTimeout(b); };
  }, [unreadCount]);

  /* Lencana memerah hanya bila ada yang benar-benar kritis dan belum
     dibaca; selebihnya biru, agar warna merah tetap punya arti. */
  const hasCritical = notifications.some(n => !n.read && n.severity === 'kritis');

  /* Jam misi UTC+7 — dirender di klien agar tidak memicu mismatch hidrasi. */
  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('id-ID', {
        hour: '2-digit', minute: '2-digit', second: '2-digit',
        hour12: false, timeZone: 'Asia/Jakarta',
      }));
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);

  const entry = NAV_INDEX[currentPage];

  return (
    <header className="header" style={{ left: sidebarCollapsed ? 72 : 260 }}>
      <div className="header-left" style={{ minWidth: 0 }}>
        <h2 className="header-title" style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {entry?.label ?? 'Mission Dashboard'}
          {entry?.group && (
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: 1.2, textTransform: 'uppercase',
              color: 'var(--text-muted)',
            }}>
              {entry.group}
            </span>
          )}
        </h2>
      </div>

      <div className="header-right">
        {/* Jam misi */}
        <span
          className="site-selector"
          style={{ fontFamily: 'var(--font-code)', fontSize: 12.5, cursor: 'default' }}
          title={t('Waktu Indonesia Barat (UTC+07:00)')}
        >
          <Clock size={13} style={{ opacity: 0.6 }} />
          {clock || '--:--:--'}
          <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{t('WIB')}</span>
        </span>

        {/* Stasiun aktif — penanda, bukan pemilih: satu sesi terikat pada
            satu stasiun, jadi tidak ada yang bisa dipilih di sini. */}
        <span className="site-selector" title={account?.siteName ?? 'Stasiun tidak diketahui'}>
          <MapPin size={13} style={{ opacity: 0.6 }} />
          <span className={`site-status-dot ${offline ? 'offline' : 'online'}`} />
          <span style={{ fontSize: 12.5 }}>{account?.stationCode ?? 'GCS'}</span>
        </span>

        {/* Status tautan data */}
        <span
          className="header-btn"
          style={{ cursor: 'default', color: offline ? 'var(--danger-400)' : 'var(--success-400)' }}
          title={offline ? t('PLATFORM OFFLINE') : 'Tautan data balon aktif — 85 Mbps'}
        >
          {offline ? <WifiOff size={16} /> : <Wifi size={16} />}
        </span>

        {/* Lonceng — membuka Pusat Notifikasi. Lencananya menampilkan
            jumlah sebenarnya yang belum dibaca, bukan titik hiasan. */}
        <button
          id="notif-bell"
          className={`header-btn notif-bell ${ringing ? 'ringing' : ''}`}
          aria-label={
            unreadCount > 0
              ? `${t('Notifikasi')} — ${unreadCount} ${t('belum dibaca')}`
              : t('Notifikasi')
          }
          aria-haspopup="dialog"
          aria-expanded={notifOpen}
          onClick={() => setNotifOpen(!notifOpen)}
        >
          <Bell size={16} />
          {unreadCount > 0 && (
            <span className={`nc-badge ${popped ? 'pop' : ''} ${hasCritical ? '' : 'calm'}`}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Tema */}
        <button
          className="header-btn"
          onClick={toggleTheme}
          aria-label={`Beralih ke mode ${theme === 'dark' ? 'terang' : 'gelap'}`}
          style={{ position: 'relative', overflow: 'hidden' }}
        >
          <span style={{ ...iconSlot, transform: theme === 'dark' ? 'rotate(0) scale(1)' : 'rotate(180deg) scale(0)', opacity: theme === 'dark' ? 1 : 0 }}>
            <Moon size={16} />
          </span>
          <span style={{ ...iconSlot, transform: theme === 'light' ? 'rotate(0) scale(1)' : 'rotate(-180deg) scale(0)', opacity: theme === 'light' ? 1 : 0 }}>
            <Sun size={16} />
          </span>
        </button>

        {/* Operator */}
        <span className="user-avatar" title={`${account?.station ?? ''} — ${account?.role ?? ''}`}>
          {account?.initials ?? '--'}
        </span>
      </div>

      <NotificationCenter />
    </header>
  );
}

const iconSlot: React.CSSProperties = {
  position: 'absolute',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.3s ease',
};
