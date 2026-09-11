'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context';
import { LICENSE_BY_ID, type LicenseId } from '../lib/licensing';
import {
  LayoutDashboard, MonitorPlay, UsersRound, ScanSearch, Clapperboard,
  Wand2, Clapperboard as FilmIcon, Cable, PlugZap, FileBarChart2, Map,
  BellRing, PlaneTakeoff, Anchor, FlaskConical, KeyRound, UserCog,
  ScrollText, SlidersHorizontal, PanelLeftClose, PanelLeftOpen,
  ShieldCheck, Lock, Search, LogOut, CircleDot, ChevronDown,
  Radar, Boxes, Sparkles, LibraryBig, ShieldHalf, Radio,
} from 'lucide-react';

/* ---------------------------------------------------------------------
   Struktur navigasi — dikelompokkan mengikuti lisensi yang menaunginya
   sehingga operator langsung melihat kapabilitas apa yang dibuka oleh
   sertifikat mana.
   --------------------------------------------------------------------- */
interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
}

interface NavGroup {
  /** null = kapabilitas platform, selalu dapat diakses */
  licenseId: LicenseId | null;
  heading: string;
  /** Kunci stabil untuk mengingat kelompok mana yang dibiarkan terbuka. */
  key: string;
  /** Wajah kelompok; tetap terlihat saat sidebar diciutkan. */
  icon: React.ReactNode;
  items: NavItem[];
}

const SZ = 17;

const NAV_GROUPS: NavGroup[] = [
  {
    licenseId: null,
    heading: 'Command Center',
    key: 'command',
    icon: <Radar size={15} />,
    items: [
      { id: 'dashboard', label: 'Mission Dashboard', icon: <LayoutDashboard size={SZ} /> },
      { id: 'media-source', label: 'Surveillance Media', icon: <MonitorPlay size={SZ} /> },
      { id: 'live-stream', label: 'Live Stream', icon: <Radio size={SZ} /> },
    ],
  },
  {
    licenseId: 'CC',
    heading: 'Crowd Counting',
    key: 'crowd',
    icon: <UsersRound size={15} />,
    items: [
      { id: 'crowd', label: 'Crowd Counting', icon: <UsersRound size={SZ} /> },
    ],
  },
  {
    licenseId: 'AODGIS',
    heading: 'Analytic & Object Detection',
    key: 'analytic',
    icon: <Boxes size={15} />,
    items: [
      { id: 'detection-image', label: 'Imaging Analytic', icon: <ScanSearch size={SZ} /> },
      { id: 'detection-video', label: 'Video Analytic', icon: <Clapperboard size={SZ} /> },
    ],
  },
  {
    licenseId: 'DAEP',
    heading: 'Enhancement Processing',
    key: 'enhance',
    icon: <Sparkles size={15} />,
    items: [
      { id: 'enhance-image', label: 'Imaging Enhancement', icon: <Wand2 size={SZ} /> },
      { id: 'enhance-video', label: 'Video Enhancement', icon: <FilmIcon size={SZ} /> },
       { id: 'tether-api', label: 'Tether Cable API', icon: <PlugZap size={SZ} /> },
      { id: 'tether-monitor', label: 'Tether Cable Monitor', icon: <Cable size={SZ} /> },
    ],
  },
  {
    licenseId: 'IRGIS',
    heading: 'Information & Reporting',
    key: 'info',
    icon: <LibraryBig size={15} />,
    items: [
      // { id: 'reporting', label: 'Digital Reporting', icon: <FileBarChart2 size={SZ} /> },
      { id: 'geo-viz', label: 'GeoInt Visualisation', icon: <Map size={SZ} /> },
      { id: 'alerts', label: 'Smart Notification', icon: <BellRing size={SZ} /> },
      { id: 'flight-info', label: 'Flight Information', icon: <PlaneTakeoff size={SZ} /> },
      { id: 'mooring', label: 'Mooring Availability', icon: <Anchor size={SZ} /> },
      { id: 'simulation', label: 'Flight Simulation', icon: <FlaskConical size={SZ} /> },
    ],
  },
  {
    licenseId: null,
    heading: 'Administration',
    key: 'admin',
    icon: <ShieldHalf size={15} />,
    items: [
      { id: 'licenses', label: 'License Manager', icon: <KeyRound size={SZ} /> },
      { id: 'users', label: 'User Management', icon: <UserCog size={SZ} /> },
      { id: 'balloons', label: 'Balloon Management', icon: <Anchor size={SZ} /> },
      { id: 'audit-log', label: 'Audit Trail', icon: <ScrollText size={SZ} /> },
      // { id: 'settings', label: 'System Settings', icon: <SlidersHorizontal size={SZ} /> },
    ],
  },
];

/** Semua id halaman yang dapat dituju dari sidebar — dipakai Header & router. */
export const NAV_INDEX: Record<string, { label: string; group: string }> = NAV_GROUPS.reduce(
  (acc, g) => {
    for (const it of g.items) acc[it.id] = { label: it.label, group: g.heading };
    return acc;
  },
  {} as Record<string, { label: string; group: string }>,
);

/* Kelompok mana yang dibiarkan terbuka disimpan per stasiun, sehingga
   susunan kerja operator tidak hilang saat halaman dimuat ulang. */
const BUKA_KEY = 'skystar.navbuka';

function muatBuka(): Record<string, boolean> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(BUKA_KEY);
    return raw ? (JSON.parse(raw) as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

export default function Sidebar() {
  const { sidebarCollapsed, toggleSidebar, currentPage, setCurrentPage, licenses, account, logout, t } = useApp();
  const [query, setQuery] = useState('');
  const collapsed = sidebarCollapsed;

  /* Semua kelompok terbuka pada render pertama. Nilai tersimpan baru
     dibaca setelah komponen terpasang, karena localStorage tidak ada di
     peladen — dan hasil render server harus sama dengan render klien. */
  const [buka, setBuka] = useState<Record<string, boolean>>({});
  const [dipulihkan, setDipulihkan] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setBuka(muatBuka());
    setDipulihkan(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!dipulihkan) return;
    try { window.localStorage.setItem(BUKA_KEY, JSON.stringify(buka)); } catch { /* noop */ }
  }, [buka, dipulihkan]);

  /* Kelompok yang memuat halaman aktif selalu ikut terbuka — operator
     harus dapat melihat di mana dirinya berada tanpa mencari. */
  const kelompokAktif = useMemo(
    () => NAV_GROUPS.find(g => g.items.some(it => it.id === currentPage))?.key ?? null,
    [currentPage],
  );

  /* Penyaringan cepat — operator dapat melompat ke modul tanpa scrolling. */
  const groups = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Filter groups based on user role
    let visibleGroups = NAV_GROUPS;
    if (account?.roleCode !== 'admin') {
      visibleGroups = visibleGroups.filter(g => g.key !== 'admin');
    }

    if (!q) return visibleGroups;
    return visibleGroups
      .map(g => ({
        ...g,
        items: g.items.filter(
          it => it.label.toLowerCase().includes(q),
        ),
      }))
      .filter(g => g.items.length > 0);
  }, [query, account?.roleCode]);

  const mencari = query.trim().length > 0;

  /* Sebuah kelompok terbuka bila: sedang mencari (semua hasil harus
     terlihat), memuat halaman aktif, atau memang dibuka operator.
     Bawaannya terbuka; yang tersimpan hanyalah kelompok yang sengaja
     ditutup. */
  const terbuka = (k: string) =>
    mencari || kelompokAktif === k || buka[k] !== false;

  const alihkan = (k: string) => {
    if (collapsed) { toggleSidebar(); setBuka(p => ({ ...p, [k]: true })); return; }
    setBuka(p => ({ ...p, [k]: p[k] === false }));
  };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* ===== Brand ===== */}
      <button
        className="sidebar-brand sidebar-brand-btn"
        onClick={() => setCurrentPage('dashboard')}
        title={t('Tethered Balloon GeoInt — Mission Dashboard')}
      >
        <span className="sidebar-brand-icon">
          <BalloonMark />
        </span>
        <span className="sidebar-brand-text">
          <h1>{t('Tethered Balloon GeoInt')}</h1>
          <span>{account?.stationCode ?? 'GCS'} · Monitoring System</span>
        </span>
      </button>

      {/* ===== Quick filter ===== */}
      {!collapsed && (
        <div className="sidebar-search">
          <Search size={13} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder={t('Cari modul…')}
            aria-label="Cari modul"
          />
          {query && (
            <button onClick={() => setQuery('')} aria-label="Bersihkan pencarian">{t('esc')}</button>
          )}
        </div>
      )}

      {/* ===== Navigation ===== */}
      <nav className="sidebar-nav">
        {groups.map((group, gi) => {
          const isAdmin = account?.roleCode === 'admin';
          /* Status asli dari database — dibaca langsung dari `licenses`,
             bukan lewat isLicenseActive() (yang sengaja bypass untuk admin
             supaya LicenseGate tidak memblokir). Dot & label "aktif/terkunci"
             di header harus tetap jujur soal kondisi DB sekalipun admin
             boleh membuka halamannya. */
          const entitled = group.licenseId === null || (licenses[group.licenseId]?.active ?? false);
          /* Menentukan apakah grup ini terlihat & bisa dipakai tanpa
             hambatan — admin selalu bisa, operator mengikuti entitled. */
          const licensed = isAdmin || entitled;
          const def = group.licenseId ? LICENSE_BY_ID[group.licenseId] : null;

          const open = terbuka(group.key);
          const memuatAktif = group.items.some(it => it.id === currentPage);
          const panelId = `nav-panel-${group.key}`;

          return (
            <div
              key={`${group.heading}-${gi}`}
              className={`nav-group ${open ? 'open' : ''} ${memuatAktif ? 'has-active' : ''} ${licensed ? '' : 'is-locked'}`}
            >
              {/* Kepala kelompok — kini tombol sungguhan, bukan label
                  kecil yang hanya bisa dibaca. */}
              <button
                type="button"
                className="nav-head"
                onClick={() => alihkan(group.key)}
                aria-expanded={collapsed ? undefined : open}
                aria-controls={collapsed ? undefined : panelId}
                title={collapsed ? group.heading : def?.title ?? group.heading}
              >
                <span className="nav-head-icon">{group.icon}</span>
                <span className="nav-head-text">
                  <span className="nav-head-title">{group.heading}</span>
                  <span className="nav-head-sub">
                    {group.items.length} {t(group.items.length === 1 ? 'modul' : 'modul')}
                    {def && ` · ${entitled ? t('aktif') : t('terkunci')}`}
                  </span>
                </span>
                {def && (
                  <span className={`nav-lic-dot ${entitled ? 'on' : 'off'}`} aria-hidden>
                    {entitled ? <ShieldCheck size={11} /> : <Lock size={11} />}
                  </span>
                )}
                <span className="nav-head-chev" aria-hidden><ChevronDown size={14} /></span>

                {/* Flyout saat sidebar diciutkan */}
                <span className="nav-tooltip" role="tooltip">
                  {group.heading}
                  {!licensed && <strong>{t('PERLU LISENSI')}</strong>}
                </span>
              </button>

              {/* Wadah yang dapat dianimasikan ke tinggi isinya tanpa
                  pengukuran JavaScript: baris grid ditumbuhkan dari 0fr
                  ke 1fr. */}
              <div className="nav-sub" id={panelId} role="region" aria-label={group.heading}>
                <div className="nav-sub-inner">
                  {group.items.map((item, ii) => {
                    const isActive = currentPage === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => setCurrentPage(item.id)}
                        className={`nav-item ${isActive ? 'active' : ''} ${!licensed ? 'locked' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        tabIndex={open || collapsed ? 0 : -1}
                        style={{ '--i': ii } as React.CSSProperties}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                        {!licensed && (
                          <span className="nav-code" aria-hidden><Lock size={11} /></span>
                        )}
                        {/* Flyout saat sidebar diciutkan */}
                        <span className="nav-tooltip" role="tooltip">
                          {item.label}
                          {!licensed && <strong>{t('PERLU LISENSI')}</strong>}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}

        {groups.length === 0 && (
          <div className="nav-empty">
            Tidak ada modul yang cocok dengan “{query}”.
          </div>
        )}
      </nav>

      {/* ===== Footer ===== */}
      <div className="sidebar-footer">
        {!collapsed ? (
          <div className="sidebar-user">
            <span className="user-avatar sm">{account?.initials ?? '--'}</span>
            <span className="sidebar-user-meta">
              <b>{account?.station ?? 'Not signed in'}</b>
              <i>{account?.role ?? '—'}</i>
            </span>
            <button className="sidebar-icon-btn" onClick={logout} title={t('Keluar sesi')} aria-label="Keluar sesi">
              <LogOut size={14} />
            </button>
          </div>
        ) : (
          <button className="sidebar-icon-btn full" onClick={logout} title={t('Keluar sesi')} aria-label="Keluar sesi">
            <LogOut size={15} />
          </button>
        )}

        <button
          className="sidebar-toggle"
          onClick={toggleSidebar}
          title={collapsed ? 'Perluas sidebar' : 'Ciutkan sidebar'}
        >
          {collapsed ? <PanelLeftOpen size={15} /> : <><PanelLeftClose size={14} /><span>{t('Minimize')}</span></>}
        </button>

        {!collapsed && (
          <div className="sidebar-version">
            <CircleDot size={9} /> Aplikasi v2.0
          </div>
        )}
      </div>
    </aside>
  );
}

/* Lambang balon tertambat — dipakai sebagai marka merek aplikasi. */
function BalloonMark() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2c3.9 0 7 3.2 7 7.2 0 3.6-2.6 6.9-5.3 8.4h-3.4C7.6 16.1 5 12.8 5 9.2 5 5.2 8.1 2 12 2Z"
        stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round"
      />
      <path d="M12 2c-1.9 2.1-2.9 4.5-2.9 7.2s1 5.1 2.9 7.2c1.9-2.1 2.9-4.5 2.9-7.2S13.9 4.1 12 2Z"
        stroke="currentColor" strokeWidth="1.2" opacity=".65" />
      <path d="M10.3 17.6h3.4l-.5 2.2h-2.4l-.5-2.2Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M12 19.8V23" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M8.6 23h6.8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
