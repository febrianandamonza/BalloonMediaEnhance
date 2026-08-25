'use client';
import React, {
  createContext, useContext, useState, useCallback, useEffect, useMemo, useRef, ReactNode,
} from 'react';
import {
  LICENSE_CATALOG, LICENSE_BY_ID, PAGE_TO_LICENSE, FEATURE_TO_LICENSE,
  validateActivationKey, refreshLicenseCatalog, type LicenseId, type ActivationResult,
} from './lib/licensing';
import { type OperatorAccount } from './lib/auth';
import { loadLang, saveLang, translate, type Lang } from './lib/i18n';
import {
  seedNotifications, notificationFromRecord,
  CATEGORY_PAGE, SEVERITY_RANK, MAX_STORED, NOTIFICATIONS_POLL_INTERVAL_MS,
  type AppNotification, type AlertStatus, type LiveEvent,
} from './lib/notifications';
import api, { type FlightMissionRecord } from './services/api';
import {
  fetchCurrentWeather, deriveWeatherLevel, buildWeatherSentence, buildWeatherTitle,
  WEATHER_POLL_INTERVAL_MS,
} from './lib/weather';

import { getJakartaNow } from './lib/date';

/* ===== Types ===== */
type Theme = 'dark' | 'light';
/* Keadaan daya platform. Bukan sekadar penanda tampilan: seluruh modul
   yang bergantung pada umpan langsung ikut berhenti saat 'shutdown'. */
type PlatformState = 'operational' | 'shutdown';
type LoginPhase = 'login' | 'authenticating' | 'success' | 'transitioning' | 'app';

export interface LicenseRecord {
  active: boolean;
  /** Serial yang dipakai saat aktivasi — kosong bila lisensi non-aktif */
  serialNumber: string;
  /** false bila backend belum pernah punya sertifikat untuk lisensi ini —
      dipakai LicensePage untuk menampilkan "BELUM DIAKTIVASI" pada expiry
      date alih-alih tanggal bawaan pabrik yang bukan data sungguhan. */
  hasCertificate: boolean;
}

export type LicenseState = Record<LicenseId, LicenseRecord>;

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface ToastMessage {
  id: number;
  title: string;
  detail?: string;
  tone: 'success' | 'error' | 'info' | 'warning';
  /** Umur pesan dalam milidetik; 0 berarti menetap sampai ditutup */
  duration: number;
  /** Tombol tindakan lanjutan — mis. membuka halaman terkait */
  action?: ToastAction;
  /** Berapa kali pesan yang sama berulang; ditampilkan sebagai lencana */
  count: number;
}

interface AppContextType {
  /* Theme */
  theme: Theme;
  toggleTheme: () => void;
  /* Bahasa */
  lang: Lang;
  setLang: (l: Lang) => void;
  /** Menerjemahkan satu kalimat ke bahasa yang sedang dipilih. */
  t: (text: string) => string;
  /* Daya platform */
  platformState: PlatformState;
  shutdownAt: string | null;
  /** Memutus daya platform — tidak pernah dibatasi lisensi. */
  executeShutdown: () => void;
  /** Prosedur reset teknisi untuk memulihkan daya. */
  restorePlatform: () => void;
  /** true bila platform sedang mati; dipakai halaman modul. */
  offline: boolean;
  /** true bila perangkat benar-benar terkoneksi internet (navigator.onLine). */
  isOnline: boolean;
  /* Navigation */
  currentPage: string;
  setCurrentPage: (page: string) => void;
  /** Dipanggil halaman modul untuk memasang/melepas penjaga navigasi.
      Kirim null untuk melepasnya. Dipakai lewat [[useNavGuard]]. */
  setNavGuard: (message: string | null) => void;
  /** Halaman tujuan yang tertahan menunggu konfirmasi operator — null
      bila tidak ada dialog navigasi yang perlu ditampilkan. Dibaca oleh
      NavGuardModal. */
  pendingNav: { page: string; message: string } | null;
  /** Operator memilih tetap pindah — navigasi dilanjutkan dan dialog ditutup. */
  confirmPendingNav: () => void;
  /** Operator membatalkan — dialog ditutup, halaman tidak berubah. */
  cancelPendingNav: () => void;
  /* Sidebar */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /* Session */
  account: OperatorAccount | null;
  login: (username: string, password: string) => Promise<{ ok: boolean; message?: string }>;
  logout: () => void;
  loginPhase: LoginPhase;
  setLoginPhase: (phase: LoginPhase) => void;
  /* License */
  licenses: LicenseState;
  activeLicenseIds: LicenseId[];
  isLicenseActive: (id: LicenseId) => boolean;
  /** Menerima kode sub-modul ("1.3b") maupun id lisensi ("IRGIS") */
  isLicensed: (code: string) => boolean;
  /** Lisensi yang mengunci sebuah halaman — null bila halaman bebas akses */
  licenseForPage: (page: string) => LicenseId | null;
  activateLicense: (id: LicenseId, key: string, issuedDate: string, expiredDate: string) => Promise<ActivationResult>;
  deactivateLicense: (id: LicenseId) => void;
  /* Toast — pesan sekilas, hilang sendiri */
  toasts: ToastMessage[];
  pushToast: (t: Omit<ToastMessage, 'id' | 'count' | 'duration'> & { duration?: number }) => void;
  dismissToast: (id: number) => void;
  dismissAllToasts: () => void;

  /* Notifikasi — riwayat peringatan yang menetap.
     Berbeda dari toast: toast lewat begitu saja, notifikasi tersimpan
     sampai operator menanganinya. Keduanya sengaja dipisah. */
  notifications: AppNotification[];
  unreadCount: number;
  openAlertCount: number;
  /** Mencatat peringatan baru; yang berat sekaligus dimunculkan sebagai toast. */
  notify: (event: LiveEvent & { page?: string | null; silent?: boolean }) => void;
  markRead: (id: string | number) => void;
  markAllRead: () => void;
  setAlertStatus: (id: string | number, status: AlertStatus) => void;
  removeNotification: (id: string | number) => void;
  clearNotifications: () => void;
  /** Mengembalikan riwayat ke isi bawaan pabrik. */
  resetNotifications: () => void;
  /** Menarik ulang GET /api/v1/notifications secara manual — dipakai
      tombol "Sinkronkan", melengkapi polling otomatis. */
  syncNotifications: () => void;
  notifSyncing: boolean;
  notifOpen: boolean;
  setNotifOpen: (open: boolean) => void;
  /* Emergency */
  showEmergencyModal: boolean;
  setShowEmergencyModal: (show: boolean) => void;
}

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}

/** Memasang penjaga navigasi selagi `active` bernilai true — operator
    yang mencoba pindah halaman atau me-reload/menutup tab akan diminta
    konfirmasi lewat `message`, supaya proses yang sedang berjalan
    (analisis, sesi live, penyimpanan) tidak hilang percuma. Dilepas
    otomatis begitu `active` kembali false atau komponen unmount. */
export function useNavGuard(active: boolean, message: string) {
  const { setNavGuard } = useApp();
  useEffect(() => {
    setNavGuard(active ? message : null);
    return () => setNavGuard(null);
  }, [active, message, setNavGuard]);
}

/* ===== Persistence ===== */
const SESSION_KEY = 'skystar.session';
/** Timestamp absolut (epoch ms) hasil GET /auth/me → expires_in. Disimpan
    terpisah dari SESSION_KEY supaya bisa dicek duluan saat memulihkan
    sesi — kalau sudah lewat, operator langsung dikembalikan ke layar
    login tanpa sempat melihat sesi lama yang sebenarnya sudah invalid. */
const SESSION_EXPIRES_KEY = 'skystar.session.expiresAt';
const THEME_KEY = 'skystar.theme';
const SHUTDOWN_KEY = 'skystar.shutdown';

/** Status lisensi tidak pernah disimpan di localStorage — satu-satunya
    sumber kebenaran adalah database lewat refreshLicenseCatalog(), yang
    dipanggil di effect AppProvider (sekali saat mount, lalu tiap
    LIVE_INTERVAL_MS). Sebelum fetch pertama itu selesai, seluruh lisensi
    dianggap nonaktif — tidak menebak-nebak status dari penyimpanan lokal. */
function emptyLicenseState(): LicenseState {
  return LICENSE_CATALOG.reduce((acc, def) => {
    acc[def.id] = { active: false, serialNumber: '', hasCertificate: false };
    return acc;
  }, {} as LicenseState);
}

/** mission_status kadang berupa string mentah, kadang objek relasi
    {id, name} — dibaca seragam lewat helper ini (sama seperti pola yang
    dipakai di InfoPages.tsx/BalloonManagementPage.tsx). */
function missionStatusName(m: FlightMissionRecord): string {
  const status = m.mission_status;
  return (typeof status === 'string' ? status : status?.name) ?? '';
}

/* ===== Provider ===== */
export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLangState] = useState<Lang>('id');
  const [platformState, setPlatformState] = useState<PlatformState>('operational');
  const [shutdownAt, setShutdownAt] = useState<string | null>(null);
  const [currentPage, setCurrentPageRaw] = useState('dashboard');

  /* Status koneksi internet perangkat sesungguhnya — terpisah dari
     `offline` (yang berarti platform dimatikan secara simulasi). Dibaca
     dari navigator.onLine dan diperbarui lewat event online/offline. */
  const [isOnline, setIsOnline] = useState(true);
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    setIsOnline(navigator.onLine);
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */
  /* Pesan konfirmasi navigasi — dipasang halaman modul selagi ada proses
     berjalan (analisis/penyimpanan) yang akan hilang percuma kalau
     operator berpindah halaman atau me-reload di tengah jalan. Disimpan
     juga di ref supaya setCurrentPage/beforeunload selalu membaca nilai
     terbaru tanpa perlu didefinisikan ulang tiap render. */
  const [navGuardMessage, setNavGuardMessageState] = useState<string | null>(null);
  const navGuardMessageRef = useRef<string | null>(null);
  useEffect(() => { navGuardMessageRef.current = navGuardMessage; }, [navGuardMessage]);
  const currentPageRef = useRef(currentPage);
  useEffect(() => { currentPageRef.current = currentPage; }, [currentPage]);

  const setNavGuard = useCallback((message: string | null) => {
    setNavGuardMessageState(message);
  }, []);

  /* Halaman tujuan yang menunggu konfirmasi operator — NavGuardModal
     membaca ini untuk menampilkan dialognya sendiri (bukan window.confirm
     bawaan peramban, supaya tampilannya konsisten dengan modal lain). */
  const [pendingNav, setPendingNav] = useState<{ page: string; message: string } | null>(null);

  /* Navigasi lewat sidebar, dashboard, notifikasi, dsb. semuanya memanggil
     fungsi ini — jadi cukup dijaga di satu tempat. Reload/tutup tab
     dijaga terpisah lewat listener beforeunload di bawah (peramban tidak
     mengizinkan dialog itu diberi tampilan custom). */
  const setCurrentPage = useCallback((page: string) => {
    if (navGuardMessageRef.current && page !== currentPageRef.current) {
      setPendingNav({ page, message: navGuardMessageRef.current });
      return;
    }
    setCurrentPageRaw(page);
  }, []);

  const confirmPendingNav = useCallback(() => {
    setPendingNav(pending => {
      if (pending) setCurrentPageRaw(pending.page);
      return null;
    });
  }, []);

  const cancelPendingNav = useCallback(() => setPendingNav(null), []);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!navGuardMessage) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [navGuardMessage]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [account, setAccount] = useState<OperatorAccount | null>(null);
  /* epoch ms — kapan access token dari backend kedaluwarsa (hasil
     expires_in pada GET /auth/me). null berarti /auth/me belum sempat
     mengembalikan expires_in — sesi tidak kedaluwarsa otomatis. */
  const [sessionExpiresAt, setSessionExpiresAt] = useState<number | null>(null);
  const [licenses, setLicenses] = useState<LicenseState>(emptyLicenseState);
  const [loginPhase, setLoginPhase] = useState<LoginPhase>('login');
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  /* Bacaan terkini untuk dipakai di luar setState (mis. markRead perlu
     tahu pendingSync sebelum memutuskan memanggil backend), tanpa membuat
     callback yang membacanya ikut berubah identitas setiap notifikasi
     baru masuk. */
  const notifRef = useRef<AppNotification[]>([]);
  useEffect(() => { notifRef.current = notifications; }, [notifications]);

  /* Pulihkan tema & sesi terakhir dari penyimpanan peramban.
     localStorage baru tersedia setelah komponen terpasang, sehingga
     pemulihan memang harus dilakukan di dalam effect dan bukan pada
     nilai awal state — jika tidak, hasil render di server dan di klien
     akan berbeda. Satu putaran render tambahan di sini disengaja dan
     hanya terjadi sekali seumur sesi, sehingga aturan set-state-in-effect
     sengaja dikecualikan untuk blok ini. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const savedTheme = window.localStorage.getItem(THEME_KEY);
      const savedLang = loadLang();
      const savedShutdown = window.localStorage.getItem(SHUTDOWN_KEY);
      const savedSession = window.localStorage.getItem(SESSION_KEY);
      const savedExpiresAt = window.localStorage.getItem(SESSION_EXPIRES_KEY);
      const restored = savedSession
        ? (JSON.parse(savedSession) as OperatorAccount)
        : null;
      const expiresAt = savedExpiresAt ? Number(savedExpiresAt) : null;
      /* Sesi backend (punya batas waktu) yang sudah lewat saat reload
         tidak pernah dipulihkan — operator langsung kembali ke layar
         login alih-alih sempat melihat sesi lama yang sebenarnya sudah
         invalid di backend. Sesi lokal (expiresAt null) tidak terkena ini. */
      const expired = expiresAt !== null && Number.isFinite(expiresAt) && Date.now() >= expiresAt;

      if (savedTheme === 'light' || savedTheme === 'dark') setTheme(savedTheme);
      setLangState(savedLang);
      /* Pemutusan daya tidak sembuh hanya karena halaman dimuat ulang. */
      if (savedShutdown) { setPlatformState('shutdown'); setShutdownAt(savedShutdown); }
      if (restored?.username && !expired) {
        setAccount(restored);
        setLoginPhase('app');
        if (expiresAt !== null) setSessionExpiresAt(expiresAt);
        /* Sesi divalidasi ulang lewat POST /auth/refresh setiap aplikasi
           dibuka — access token yang tersimpan bisa saja sudah dicabut
           di server walau belum lewat expiresAt lokal. */
        api.refreshSession().then((valid) => {
          if (valid) return;
          try {
            window.localStorage.removeItem(SESSION_KEY);
            window.localStorage.removeItem(SESSION_EXPIRES_KEY);
          } catch { /* noop */ }
          setAccount(null);
          setSessionExpiresAt(null);
          setLoginPhase('login');
        });
      } else if (expired) {
        window.localStorage.removeItem(SESSION_KEY);
        window.localStorage.removeItem(SESSION_EXPIRES_KEY);
      }
    } catch {
      /* penyimpanan rusak atau tidak tersedia → mulai dari layar masuk */
    }
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try { window.localStorage.setItem(THEME_KEY, theme); } catch { /* noop */ }
  }, [theme]);

  /* Satu-satunya sumber status lisensi: database lewat refreshLicenseCatalog().
     Dipanggil sekali saat aplikasi terpasang, lalu diulang tiap 5 detik —
     supaya perubahan yang dibuat admin di backend ikut muncul di sesi
     lain (mis. operator) yang sudah terlanjur terbuka, tanpa reload
     manual dan tanpa localStorage di tengah-tengah sama sekali. Setiap
     poll mengganti `licenses` dengan objek baru apa adanya dari DB —
     aktif jadi tidak aktif, maupun sebaliknya begitu backend berubah —
     jadi tidak ada state lokal yang bisa tersangkut basi. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;

    const syncCatalog = () => {
      refreshLicenseCatalog().then((activation) => {
        if (cancelled) return;
        setLicenses(activation);
      });
    };

    syncCatalog();
    const intervalId = window.setInterval(syncCatalog, 5000);
    return () => { cancelled = true; window.clearInterval(intervalId); };
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleTheme = useCallback(() => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const toggleSidebar = useCallback(() => setSidebarCollapsed(prev => !prev), []);

  /* ----- Bahasa ----- */
  const setLang = useCallback((l: Lang) => { setLangState(l); saveLang(l); }, []);
  const t = useCallback((text: string) => translate(text, lang), [lang]);

  /* ----- Toast -----
     Penghitung waktu tidak dipasang di sini. Umur pesan diurus oleh
     ToastHost supaya hitungannya bisa dijeda saat kursor berada di atas
     tumpukan atau saat tab tidak sedang dilihat — perilaku yang tidak
     mungkin dicapai dengan setTimeout sekali jalan. */
  const dismissToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const dismissAllToasts = useCallback(() => setToasts([]), []);

  const pushToast = useCallback((
    t: Omit<ToastMessage, 'id' | 'count' | 'duration'> & { duration?: number },
  ) => {
    setToasts(prev => {
      /* Pesan identik yang datang beruntun tidak menumpuk; cukup
         menaikkan pencacah dan memuda-ulang pesan yang sudah ada. */
      const twin = prev.find(x => x.title === t.title && x.detail === t.detail && x.tone === t.tone);
      if (twin) {
        return prev.map(x => (x.id === twin.id
          ? { ...x, count: x.count + 1, id: Date.now() + Math.random() }
          : x));
      }

      const next: ToastMessage = {
        ...t,
        id: Date.now() + Math.random(),
        count: 1,
        duration: t.duration ?? (t.tone === 'error' ? 8000 : 5200),
      };
      /* Tampilkan paling banyak empat pesan sekaligus. */
      return [...prev.slice(-3), next];
    });
  }, []);

  /* ----- Notifikasi -----
     Riwayat peringatan stasiun. Berumur panjang: sebuah entri bertahan
     sampai operator menandainya dibaca dan menutup penanganannya, bukan
     sampai penghitung waktu habis. */
  const notify = useCallback((event: LiveEvent & { page?: string | null; silent?: boolean }) => {
    const entry: AppNotification = {
      id: Date.now() + Math.random(),
      ts: Date.now(),
      title: event.title,
      detail: event.detail,
      severity: event.severity,
      category: event.category,
      status: 'terbuka',
      source: event.source,
      read: false,
      page: event.page !== undefined ? event.page : CATEGORY_PAGE[event.category],
      reading: event.reading,
      threshold: event.threshold,
      metadata: event.metadata,
      pendingSync: true,
    };
    setNotifications(prev => [entry, ...prev].slice(0, MAX_STORED));

    /* Setiap notifikasi ditulis ke backend juga (best-effort). Entri lokal
       ini punya id sementara (angka acak) sampai penyegaran berkala
       menemukan baris yang sama dari backend — pencocokan judul+sumber
       dalam jendela beberapa menit (lihat effect penyegaran) mencegahnya
       tampil dobel begitu id aslinya datang. */
    api.createNotification({
      title: entry.title,
      description: entry.detail,
      level: entry.severity,
      type: entry.category,
      status: 'unread',
      source: entry.source,
      metadata: entry.metadata ?? {},
    }).catch(() => { });

    /* Hanya peringatan berbobot yang memotong perhatian operator lewat
       toast. Yang bersifat informasi cukup menunggu di lonceng — kalau
       semuanya memaksa muncul, tidak ada lagi yang terasa penting. */
    if (!event.silent && SEVERITY_RANK[entry.severity] >= 1) {
      pushToast({
        tone: entry.severity === 'kritis' ? 'error' : 'warning',
        title: entry.title,
        detail: entry.detail,
        action: entry.page
          ? { label: translate('Tinjau', lang), onClick: () => setCurrentPage(entry.page as string) }
          : undefined,
      });
    }
  }, [pushToast, lang]);

  const markRead = useCallback((id: string | number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
    /* Entri dengan id sementara (belum direkonsiliasi dengan baris
       backend aslinya, lihat notify()/pendingSync) tidak dikenal backend
       — memanggil endpoint untuknya cuma menghasilkan request gagal yang
       tidak berguna, jadi dilewati sampai id aslinya datang. */
    const target = notifRef.current.find(n => n.id === id);
    if (!target?.pendingSync) {
      api.markNotificationRead(id).catch(() => { });
    }
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => (n.read ? n : { ...n, read: true })));
    api.markAllNotificationsRead().catch(() => { });
  }, []);

  /* Menandai status penanganan sekaligus menganggapnya sudah dibaca —
     mustahil menangani sesuatu yang belum sempat dilihat. */
  const setAlertStatus = useCallback((id: string | number, status: AlertStatus) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, status, read: true } : n)));
  }, []);

  const removeNotification = useCallback((id: string | number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const resetNotifications = useCallback(() => setNotifications(seedNotifications()), []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const openAlertCount = useMemo(
    () => notifications.filter(n => n.status === 'terbuka').length,
    [notifications],
  );

  /* Riwayat notifikasi dimuat dari backend, bukan localStorage — GET
     /api/v1/notifications adalah satu-satunya sumber saat operator masuk. */
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!account) { setNotifications([]); return; }
    let cancelled = false;
    api.getNotifications().then(records => {
      if (cancelled) return;
      const mapped = records.map(notificationFromRecord).sort((a, b) => b.ts - a.ts).slice(0, MAX_STORED);
      setNotifications(mapped);
    }).catch(() => { });
    return () => { cancelled = true; };
  }, [account]);
  /* eslint-enable react-hooks/set-state-in-effect */

  /* Tarik ulang GET /api/v1/notifications dan gabungkan ke state — dipakai
     baik oleh polling berkala maupun tombol "Sinkronkan" manual. Entri
     baru ditambahkan; entri yang masih pendingSync (id sementara dari
     notify(), lihat AppNotification) ditukar dengan baris asli begitu
     ditemukan lewat judul+sumber dalam jendela 3 menit — bukan sekadar
     dilewati, supaya id sementaranya tidak nyangkut selamanya (aksi yang
     menyentuh backend, mis. tandai dibaca, butuh id asli). Entri lain
     (bukan pendingSync) tidak pernah ditimpa, supaya status baca/tangani
     yang baru diubah operator secara lokal tidak terlempar balik (backend
     belum punya endpoint untuk menyimpan status itu). */
  const [notifSyncing, setNotifSyncing] = useState(false);

  const syncNotifications = useCallback(async () => {
    if (!account) return;
    setNotifSyncing(true);
    try {
      const records = await api.getNotifications();
      setNotifications(prev => {
        const mapped = records.map(notificationFromRecord);
        const additions: AppNotification[] = [];
        let next = prev;
        let changed = false;

        for (const r of mapped) {
          if (next.some(n => n.id === r.id)) continue;
          const pendingIdx = next.findIndex(n =>
            n.pendingSync && n.title === r.title && n.source === r.source && Math.abs(n.ts - r.ts) < 3 * 60_000,
          );
          if (pendingIdx !== -1) {
            const pending = next[pendingIdx];
            next = next.map((n, i) => (i === pendingIdx ? { ...r, read: pending.read || r.read } : n));
            changed = true;
          } else {
            additions.push(r);
          }
        }

        if (!changed && additions.length === 0) return prev;
        return [...additions, ...next].sort((a, b) => b.ts - a.ts).slice(0, MAX_STORED);
      });
    } catch {
      /* best-effort — polling/tombol berikutnya akan mencoba lagi */
    } finally {
      setNotifSyncing(false);
    }
  }, [account]);

  useEffect(() => {
    if (!account || platformState === 'shutdown') return;
    const id = window.setInterval(syncNotifications, NOTIFICATIONS_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [account, platformState, syncNotifications]);

  /* Pemantauan cuaca berkala pada lokasi tiap misi yang sedang Flight —
     notify() di bawah yang menulis ke backend sekaligus mendorongnya ke
     lonceng/AlertsPage. */
  const weatherCheckRunning = useRef(false);

  useEffect(() => {
    if (!account || platformState === 'shutdown') return;

    const checkFlightWeather = async () => {
      if (weatherCheckRunning.current) return;
      weatherCheckRunning.current = true;
      try {
        const missions = await api.getFlightMissions().catch(() => []);
        const flying = missions.filter(m => missionStatusName(m) === 'Flight');

        await Promise.allSettled(flying.map(async (m) => {
          const lat = Number(m.location?.latitude);
          const lon = Number(m.location?.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;

          const missionName = 'Misi ' + String(m.mission_name ?? m.mission_code ?? '');
          const weather = await fetchCurrentWeather(lat, lon);
          const level = deriveWeatherLevel(weather.current);
          const detail = buildWeatherSentence(weather.current, missionName);
          const title = buildWeatherTitle(new Date());

          notify({ title, detail, severity: level, category: 'Cuaca', source: missionName, metadata: weather });
        }));
      } finally {
        weatherCheckRunning.current = false;
      }
    };

    checkFlightWeather();
    const id = window.setInterval(checkFlightWeather, WEATHER_POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [account, platformState, notify]);

  /* ----- Daya platform -----
     Diletakkan setelah notify agar setiap perubahan daya langsung
     tercatat sebagai peringatan. Pencatatannya memang milik penangan
     peristiwa ini, bukan effect: sebuah effect hanya akan menebak
     perubahan dari selisih nilai, sedangkan di sini niatnya jelas.
     Toast ditekan karena EmergencyButton sudah memunculkan pesannya
     sendiri dengan tombol lanjutan. */
  const executeShutdown = useCallback(() => {
    const at = new Date().toISOString();
    setPlatformState('shutdown');
    setShutdownAt(at);
    try { window.localStorage.setItem(SHUTDOWN_KEY, at); } catch { /* noop */ }
    notify({
      title: 'Daya platform diputus',
      detail: 'Pemutusan darurat dijalankan. Seluruh umpan langsung berhenti sampai reset teknisi.',
      severity: 'kritis', category: 'Sistem', source: 'Emergency Control',
      silent: true,
    });
  }, [notify]);

  const restorePlatform = useCallback(() => {
    setPlatformState('operational');
    setShutdownAt(null);
    try { window.localStorage.removeItem(SHUTDOWN_KEY); } catch { /* noop */ }
    notify({
      title: 'Daya platform dipulihkan',
      detail: 'Reset teknisi selesai. Umpan telemetri dan analitik kembali berjalan.',
      severity: 'informasi', category: 'Sistem', source: 'Emergency Control',
    });
  }, [notify]);

  /* ----- Session ----- */
  const login = useCallback(async (username: string, password: string) => {
    /* Utamakan backend bila layanan pendukung sedang berjalan. */
    // console.log(getJakartaNow());
    try {
      const api = (await import('./services/api')).default;
      const res = await api.login(username, password);
      const remote = res;

      if (res && remote) {
        // Update last_login
        try {
          if (remote.id) {
            await api.updateUser(String(remote.id), { last_login: getJakartaNow() });
          }
        } catch (updateErr) {
          console.error('Gagal memperbarui last_login:', updateErr);
        }

        const profile: OperatorAccount = {
          userId: remote.user_id ?? remote.id,
          username: remote.username,
          station: remote.full_name ?? remote.username,
          stationCode: 'GCS',
          fullName: remote.full_name ?? remote.username,
          role: remote.role_id == 1 ? 'Administrator' : 'Operator',
          roleCode: remote.role_id == 1 ? 'admin' : 'operator',
          initials: (remote.full_name ?? '??').slice(0, 2).toUpperCase(),
          siteName: 'Jakarta',
          siteCoords: { lat: -6.2088, lon: 106.8456 },
        };
        setAccount(profile);
        try { window.localStorage.setItem(SESSION_KEY, JSON.stringify(profile)); } catch { /* noop */ }

        /* expires_in (detik) dari /auth/me dipakai menjadwalkan auto-logout —
           lihat efek "Auto-logout" di bawah. Kalau panggilan ini gagal atau
           backend tidak mengirim expires_in, sesi tetap jalan tanpa batas
           waktu otomatis (sama seperti sebelum fitur ini ada). */
        try {
          const me = await api.getProfile();
          if (typeof me.expires_in === 'number') {
            const expiresAt = Date.now() + me.expires_in * 1000;
            setSessionExpiresAt(expiresAt);
            try { window.localStorage.setItem(SESSION_EXPIRES_KEY, String(expiresAt)); } catch { /* noop */ }
          }
        } catch (meErr) {
          console.error('Gagal mengambil /auth/me:', meErr);
        }

        return { ok: true };
      }
    } catch (err) {
      const status = (err as { status?: number })?.status;
      if (status === 401) {
        return { ok: false, message: 'Kredensial tidak valid. Akses ditolak.' };
      }
      return { ok: false, message: 'Tidak dapat terhubung ke server. Coba lagi.' };
    }

    return { ok: false, message: 'Kredensial tidak valid. Akses ditolak.' };
  }, []);

  const logout = useCallback(() => {
    try {
      window.localStorage.removeItem(SESSION_KEY);
      window.localStorage.removeItem(SESSION_EXPIRES_KEY);
    } catch { /* noop */ }
    setAccount(null);
    setSessionExpiresAt(null);
    /* Lewat setter mentah, bukan setCurrentPage: logout (termasuk yang
       otomatis lewat kedaluwarsa sesi) tidak boleh tertahan dialog
       konfirmasi navigasi — sesi memang sudah harus berakhir. */
    setCurrentPageRaw('dashboard');
    setLoginPhase('login');
  }, []);

  /* Auto-logout: begitu access token backend (expires_in dari /auth/me)
     lewat batas waktunya, operator dikembalikan ke layar login tanpa
     perlu menunggu request berikutnya gagal dengan 401. Sesi lokal
     (sessionExpiresAt null) tidak pernah kedaluwarsa lewat jalur ini. */
  useEffect(() => {
    if (sessionExpiresAt === null) return;
    const msLeft = sessionExpiresAt - Date.now();
    if (msLeft <= 0) {
      logout();
      return;
    }
    const timeoutId = window.setTimeout(() => {
      logout();
      pushToast({
        tone: 'warning',
        title: 'Sesi berakhir',
        detail: 'Waktu sesi Anda telah habis. Silakan login kembali.',
      });
    }, msLeft);
    return () => window.clearTimeout(timeoutId);
  }, [sessionExpiresAt, logout, pushToast]);

  /* ----- License ----- */
  const activeLicenseIds = useMemo(
    () => LICENSE_CATALOG.filter(def => licenses[def.id]?.active).map(def => def.id),
    [licenses],
  );

  /* Admin selalu dianggap berlisensi penuh — konsisten dengan Sidebar yang
     sudah membuka semua grup navigasi untuk role ini. LicenseGate memanggil
     isLicensed() sebagai gerbang sesungguhnya, jadi bypass-nya harus ada di
     sini juga, bukan cuma di tampilan Sidebar. */
  const isAdmin = account?.roleCode === 'admin';

  const isLicenseActive = useCallback(
    (id: LicenseId) => isAdmin || (licenses[id]?.active ?? false),
    [licenses, isAdmin],
  );

  const isLicensed = useCallback((code: string) => {
    if (isAdmin) return true;
    const id = (LICENSE_BY_ID[code as LicenseId] ? code : FEATURE_TO_LICENSE[code]) as
      | LicenseId
      | undefined;
    if (!id) return true; // kode tak dikenal → halaman bebas akses
    return licenses[id]?.active ?? false;
  }, [licenses, isAdmin]);

  const licenseForPage = useCallback(
    (page: string) => PAGE_TO_LICENSE[page] ?? null,
    [],
  );

  /* Pengecekan format/duplikat/expiry di validateActivationKey murni untuk
     umpan balik instan di modal (tanpa menunggu round-trip jaringan untuk
     kesalahan ketik yang jelas: kode belum diisi, formatnya salah, dipakai
     lisensi lain, sudah aktif, atau sudah kedaluwarsa). Begitu lolos,
     database-lah yang benar-benar memutuskan — activateLicense menyimpan
     sertifikat baru lewat POST /licenses lalu menarik ulang status resmi
     dari refreshLicenseCatalog(), bukan menandai aktif secara optimistis
     di state lokal. */
  const activateLicense = useCallback(async (
    id: LicenseId, key: string, issuedDate: string, expiredDate: string,
  ): Promise<ActivationResult> => {
    const result = validateActivationKey(key, id, activeLicenseIds);
    if (!result.ok) return result;

    const def = LICENSE_BY_ID[id];
    try {
      await api.createLicenseCertificate({
        license_code: result.serialNumber,
        license_name: def.title,
        description: def.title,
        issued_date: issuedDate,
        expired_date: expiredDate,
      });
    } catch {
      return {
        ok: false,
        reason: 'UNKNOWN_KEY',
        message: 'Gagal menyimpan sertifikat ke server. Periksa koneksi dan coba lagi.',
      };
    }

    setLicenses(await refreshLicenseCatalog());
    return result;
  }, [activeLicenseIds]);

  const deactivateLicense = useCallback((id: LicenseId) => {
    api.deactivateLicense(id)
      .then(() => refreshLicenseCatalog())
      .then(setLicenses)
      .catch(() => { /* biarkan poll berikutnya yang mengoreksi bila panggilan ini gagal */ });
  }, []);

  return (
    <AppContext.Provider value={{
      theme, toggleTheme,
      lang, setLang, t,
      platformState, shutdownAt, executeShutdown, restorePlatform,
      offline: platformState === 'shutdown',
      isOnline,
      currentPage, setCurrentPage, setNavGuard,
      pendingNav, confirmPendingNav, cancelPendingNav,
      sidebarCollapsed, toggleSidebar,
      account, login, logout, loginPhase, setLoginPhase,
      licenses, activeLicenseIds, isLicenseActive, isLicensed, licenseForPage,
      activateLicense, deactivateLicense,
      toasts, pushToast, dismissToast, dismissAllToasts,
      notifications, unreadCount, openAlertCount, notify,
      markRead, markAllRead, setAlertStatus, removeNotification,
      clearNotifications, resetNotifications, syncNotifications, notifSyncing,
      notifOpen, setNotifOpen,
      showEmergencyModal, setShowEmergencyModal,
    }}>
      {children}
    </AppContext.Provider>
  );
}
