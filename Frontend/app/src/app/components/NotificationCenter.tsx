'use client';
/* =====================================================================
   PUSAT NOTIFIKASI

   Panel yang terbuka dari lonceng di bilah atas. Bukan sekadar daftar:
   dari sini operator bisa membaca, menandai, menangani, membuka modul
   asal peringatan, dan membersihkan riwayat — semuanya bekerja pada
   gudang data yang sama dengan modul Smart Notification Alert.
   ===================================================================== */
import React, {
  useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';
import { useApp } from '../context';
import { NAV_INDEX } from './Sidebar';
import {
  relativeTime, clockTime, bucketOf, BUCKET_LABEL,
  type AppNotification, type Severity, type Category, type BucketId,
} from '../lib/notifications';
import {
  X, Check, CheckCheck, Trash2, ArrowUpRight, Inbox, BellOff,
  ShieldAlert, AlertTriangle, Info, Settings2, Undo2,
  Wind, Radar, Cable, Gauge, Anchor, SignalHigh, ScanEye, Cpu,
} from 'lucide-react';

/* Ikon per kategori — memberi baris identitas visual yang bisa dikenali
   sekilas tanpa harus membaca labelnya. */
const CATEGORY_ICON: Record<Category, React.ReactNode> = {
  'Cuaca': <Wind size={14} />,
  'Geofence': <Radar size={14} />,
  'Tether': <Cable size={14} />,
  'Ambang Batas': <Gauge size={14} />,
  'Mooring': <Anchor size={14} />,
  'Konektivitas': <SignalHigh size={14} />,
  'Keamanan': <ShieldAlert size={14} />,
  'Deteksi Objek': <ScanEye size={14} />,
  'Sistem': <Cpu size={14} />,
};

const SEVERITY_ICON: Record<Severity, React.ReactNode> = {
  kritis: <ShieldAlert size={13} />,
  peringatan: <AlertTriangle size={13} />,
  informasi: <Info size={13} />,
};

type FilterId = 'semua' | 'belum' | 'kritis' | 'tindakan';

/* ===== Jam bersama =====
   Waktu adalah sumber di luar React, jadi ia dibaca lewat
   useSyncExternalStore dan bukan lewat setState di dalam effect. Cuplikan
   hanya berubah saat pewaktu berdetak, sehingga render tetap murni dan
   "3 menit lalu" tetap ikut menua selama panel terbuka. */
let jamSekarang = 0;
let pewaktu = 0;
const pendengar = new Set<() => void>();

function langgananJam(cb: () => void) {
  pendengar.add(cb);
  if (pendengar.size === 1) {
    jamSekarang = Date.now();
    pewaktu = window.setInterval(() => {
      jamSekarang = Date.now();
      pendengar.forEach(l => l());
    }, 30_000);
  }
  return () => {
    pendengar.delete(cb);
    if (pendengar.size === 0) window.clearInterval(pewaktu);
  };
}

const bacaJam = () => jamSekarang;
/* Di peladen waktu tidak relevan — panel hanya hidup di peramban. */
const bacaJamPeladen = () => 0;

export default function NotificationCenter() {
  const {
    notifications, unreadCount, openAlertCount, notifOpen, setNotifOpen,
    markRead, markAllRead, setAlertStatus, removeNotification, clearNotifications,
    setCurrentPage, offline, lang, t, pushToast,
  } = useApp();

  const [filter, setFilter] = useState<FilterId>('semua');
  const panelRef = useRef<HTMLDivElement>(null);

  /* Berdetak tiap 30 detik selama panel terpasang. */
  const now = useSyncExternalStore(langgananJam, bacaJam, bacaJamPeladen);

  /* Tutup dengan Esc, dan kembalikan fokus ke lonceng supaya alur papan
     tik tidak terputus. */
  useEffect(() => {
    if (!notifOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      setNotifOpen(false);
      document.getElementById('notif-bell')?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [notifOpen, setNotifOpen]);

  /* Klik di luar panel menutupnya — kecuali klik pada lonceng itu
     sendiri, yang sudah menangani buka/tutup sendiri. */
  useEffect(() => {
    if (!notifOpen) return;
    const onDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (document.getElementById('notif-bell')?.contains(target)) return;
      /* Toast adalah kelanjutan dari tindakan di dalam panel — menekan
         "Urungkan" di sana tidak boleh menutup panel yang sedang
         dipakai. */
      if ((target as Element).closest?.('.toast-stack')) return;
      setNotifOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [notifOpen, setNotifOpen]);

  /* Fokus berpindah ke panel saat dibuka agar pembaca layar langsung
     mengumumkan isinya. */
  useEffect(() => {
    if (notifOpen) panelRef.current?.focus();
  }, [notifOpen]);

  const counts = useMemo(() => ({
    semua: notifications.length,
    belum: notifications.filter(n => !n.read).length,
    kritis: notifications.filter(n => n.severity === 'kritis').length,
    tindakan: notifications.filter(n => n.status === 'terbuka').length,
  }), [notifications]);

  const visible = useMemo(() => {
    const list = notifications.filter(n => {
      if (filter === 'belum') return !n.read;
      if (filter === 'kritis') return n.severity === 'kritis';
      if (filter === 'tindakan') return n.status === 'terbuka';
      return true;
    });
    return [...list].sort((a, b) => b.ts - a.ts);
  }, [notifications, filter]);

  /* Dikelompokkan per hari; kelompok kosong tidak ikut dirender. */
  const groups = useMemo(() => {
    const map = new Map<BucketId, AppNotification[]>();
    for (const n of visible) {
      const b = bucketOf(n.ts, now);
      const arr = map.get(b);
      if (arr) arr.push(n);
      else map.set(b, [n]);
    }
    return (['today', 'yesterday', 'earlier'] as BucketId[])
      .filter(b => map.has(b))
      .map(b => ({ bucket: b, items: map.get(b) as AppNotification[] }));
  }, [visible, now]);

  const openSource = useCallback((n: AppNotification) => {
    markRead(n.id);
    if (!n.page) return;
    setCurrentPage(n.page);
    setNotifOpen(false);
  }, [markRead, setCurrentPage, setNotifOpen]);

  const handle = useCallback((n: AppNotification) => {
    setAlertStatus(n.id, n.status === 'terbuka' ? 'ditangani' : 'selesai');
    pushToast({
      tone: 'success',
      title: n.status === 'terbuka' ? t('Peringatan ditangani') : t('Peringatan ditutup'),
      detail: t(n.title),
      action: { label: t('Urungkan'), onClick: () => setAlertStatus(n.id, n.status) },
    });
  }, [setAlertStatus, pushToast, t]);

  const dismiss = useCallback((n: AppNotification) => {
    removeNotification(n.id);
    pushToast({
      tone: 'info',
      title: t('Notifikasi dihapus'),
      detail: t(n.title),
    });
  }, [removeNotification, pushToast, t]);

  const purge = useCallback(() => {
    const jumlah = notifications.length;
    clearNotifications();
    pushToast({
      tone: 'info',
      title: t('Riwayat notifikasi dibersihkan'),
      detail: `${jumlah} ${t('entri dihapus dari stasiun ini.')}`,
    });
  }, [notifications.length, clearNotifications, pushToast, t]);

  if (!notifOpen) return null;

  /* Panel dilekatkan langsung ke body, bukan ke dalam header.
     Header sendiri memakai backdrop-filter, dan lapisan blur yang
     bersarang hanya menyampel latar induknya — akibatnya isi halaman di
     belakang panel masih terbaca menembus kaca. Dari body, blur menyampel
     seluruh halaman sebagaimana mestinya. */
  const akar = typeof document !== 'undefined' ? document.body : null;
  if (!akar) return null;

  const FILTERS: { id: FilterId; label: string; n: number }[] = [
    { id: 'semua', label: t('Semua'), n: counts.semua },
    { id: 'belum', label: t('Belum Dibaca'), n: counts.belum },
    { id: 'kritis', label: t('Kritis'), n: counts.kritis },
    { id: 'tindakan', label: t('Perlu Tindakan'), n: counts.tindakan },
  ];

  return createPortal(
    <>
      {/* Lapisan penangkap sentuhan di layar kecil; di layar lebar ia
          tidak terlihat namun tetap menutup panel saat disentuh. */}
      <div className="nc-scrim" aria-hidden="true" />

      <div
        ref={panelRef}
        className="nc-panel"
        role="dialog"
        aria-modal="false"
        aria-label={t('Pusat Notifikasi')}
        tabIndex={-1}
      >
        <header className="nc-head">
          <div className="nc-head-text">
            <h3>{t('Pusat Notifikasi')}</h3>
            <p>
              {unreadCount > 0
                ? `${unreadCount} ${t('belum dibaca')}`
                : t('Semua sudah dibaca')}
              <span className="nc-sep">·</span>
              {openAlertCount > 0
                ? `${openAlertCount} ${t('menunggu tindakan')}`
                : t('tidak ada yang tertunda')}
            </p>
          </div>
          <div className="nc-head-tools">
            <button
              className="nc-tool"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              title={t('Tandai semua dibaca')}
              aria-label={t('Tandai semua dibaca')}
            >
              <CheckCheck size={15} />
            </button>
            <button
              className="nc-tool"
              onClick={() => { setCurrentPage('alerts'); setNotifOpen(false); }}
              title={t('Atur aturan peringatan')}
              aria-label={t('Atur aturan peringatan')}
            >
              <Settings2 size={15} />
            </button>
            <button
              className="nc-tool"
              onClick={() => setNotifOpen(false)}
              title={t('Tutup')}
              aria-label={t('Tutup')}
            >
              <X size={15} />
            </button>
          </div>
        </header>

        <div className="nc-filters" role="tablist" aria-label={t('Saring notifikasi')}>
          {FILTERS.map(f => (
            <button
              key={f.id}
              role="tab"
              aria-selected={filter === f.id}
              className={`nc-filter ${filter === f.id ? 'active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
              {f.n > 0 && <span className="nc-filter-n">{f.n}</span>}
            </button>
          ))}
        </div>

        {offline && (
          <div className="nc-offline" role="status">
            <BellOff size={14} />
            <span>{t('Platform padam — umpan peringatan langsung dihentikan.')}</span>
          </div>
        )}

        <div className="nc-list">
          {groups.length === 0 ? (
            <div className="nc-empty">
              <span className="nc-empty-icon"><Inbox size={22} /></span>
              <p className="nc-empty-title">
                {filter === 'belum' ? t('Semua notifikasi sudah dibaca')
                  : filter === 'kritis' ? t('Tidak ada peringatan kritis')
                  : filter === 'tindakan' ? t('Tidak ada yang menunggu tindakan')
                  : t('Belum ada notifikasi')}
              </p>
              <p className="nc-empty-sub">
                {filter === 'semua'
                  ? t('Peringatan dari sensor, geofence, dan analitik akan muncul di sini.')
                  : t('Ubah saringan untuk melihat entri lain.')}
              </p>
            </div>
          ) : groups.map(g => (
            <section key={g.bucket} className="nc-group">
              <h4 className="nc-group-head">
                {t(BUCKET_LABEL[g.bucket])}
                <span className="nc-group-n">{g.items.length}</span>
              </h4>
              {g.items.map(n => (
                <Row
                  key={n.id}
                  n={n}
                  lang={lang}
                  now={now}
                  t={t}
                  onOpen={openSource}
                  onHandle={handle}
                  onRead={markRead}
                  onDismiss={dismiss}
                />
              ))}
            </section>
          ))}
        </div>

        <footer className="nc-foot">
          <button
            className="nc-foot-link"
            onClick={() => { setCurrentPage('alerts'); setNotifOpen(false); }}
          >
            {t('Buka Smart Notification Alert')} <ArrowUpRight size={13} />
          </button>
          <button
            className="nc-foot-danger"
            onClick={purge}
            disabled={notifications.length === 0}
          >
            <Trash2 size={13} /> {t('Bersihkan')}
          </button>
        </footer>
      </div>
    </>,
    akar,
  );
}

/* ===== Satu baris notifikasi ===== */
function Row({
  n, lang, now, t, onOpen, onHandle, onRead, onDismiss,
}: {
  n: AppNotification;
  lang: 'id' | 'en';
  now: number;
  t: (s: string) => string;
  onOpen: (n: AppNotification) => void;
  onHandle: (n: AppNotification) => void;
  onRead: (id: number) => void;
  onDismiss: (n: AppNotification) => void;
}) {
  const tujuan = n.page ? NAV_INDEX[n.page]?.label : null;
  const bisaDibuka = Boolean(n.page);

  return (
    <article
      className={`nc-item sev-${n.severity} ${n.read ? '' : 'unread'} status-${n.status}`}
      data-status={n.status}
    >
      {/* Badan baris dapat diklik seluruhnya bila ada modul tujuan. */}
      <button
        className="nc-item-body"
        onClick={() => (bisaDibuka ? onOpen(n) : onRead(n.id))}
        aria-label={
          bisaDibuka
            ? `${t(n.title)} — ${t('buka')} ${tujuan}`
            : `${t(n.title)} — ${t('tandai dibaca')}`
        }
      >
        <span className="nc-chip" aria-hidden="true">
          {CATEGORY_ICON[n.category]}
        </span>

        <span className="nc-item-main">
          <span className="nc-item-top">
            <span className="nc-item-title">{t(n.title)}</span>
            <time className="nc-item-time" dateTime={new Date(n.ts).toISOString()}>
              {relativeTime(n.ts, lang, now)}
            </time>
          </span>

          <span className="nc-item-detail">{t(n.detail)}</span>

          <span className="nc-item-meta">
            <span className={`nc-sev sev-${n.severity}`}>
              {SEVERITY_ICON[n.severity]} {t(n.severity)}
            </span>
            <span className="nc-src">{t(n.source)}</span>
            {n.reading && (
              <span className="nc-reading" title={t('Nilai terukur terhadap ambang')}>
                {t(n.reading)}
                {n.threshold && <em> / {t(n.threshold)}</em>}
              </span>
            )}
            <span className="nc-clock">{clockTime(n.ts, lang)}</span>
            {n.status !== 'terbuka' && (
              <span className={`nc-state ${n.status}`}>{t(n.status)}</span>
            )}
          </span>
        </span>

        {!n.read && <span className="nc-unread-dot" aria-hidden="true" />}
      </button>

      {/* Tindakan cepat — muncul saat baris disorot atau difokuskan. */}
      <div className="nc-item-actions">
        {n.status !== 'selesai' && (
          <button
            className="nc-act"
            onClick={() => onHandle(n)}
            title={n.status === 'terbuka' ? t('Tandai ditangani') : t('Tutup peringatan')}
            aria-label={n.status === 'terbuka' ? t('Tandai ditangani') : t('Tutup peringatan')}
          >
            {n.status === 'terbuka' ? <Check size={13} /> : <CheckCheck size={13} />}
          </button>
        )}
        {!n.read && (
          <button
            className="nc-act"
            onClick={() => onRead(n.id)}
            title={t('Tandai dibaca')}
            aria-label={t('Tandai dibaca')}
          >
            <Undo2 size={13} />
          </button>
        )}
        <button
          className="nc-act danger"
          onClick={() => onDismiss(n)}
          title={t('Hapus notifikasi')}
          aria-label={t('Hapus notifikasi')}
        >
          <Trash2 size={13} />
        </button>
      </div>
    </article>
  );
}
