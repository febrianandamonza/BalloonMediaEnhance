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
  loadNotifications, saveNotifications, seedNotifications, pickLiveEvent,
  CATEGORY_PAGE, SEVERITY_RANK, LIVE_INTERVAL_MS,
  type AppNotification, type AlertStatus, type LiveEvent,
} from './lib/notifications';
import api from './services/api';

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
  /* Navigation */
  currentPage: string;
  setCurrentPage: (page: string) => void;
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
  notify: (event: LiveEvent & { page?: string | null }) => void;
  markRead: (id: number) => void;
  markAllRead: () => void;
  setAlertStatus: (id: number, status: AlertStatus) => void;
  removeNotification: (id: number) => void;
  clearNotifications: () => void;
  /** Mengembalikan riwayat ke isi bawaan pabrik. */
  resetNotifications: () => void;
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

/* ===== Provider ===== */
export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark');
  const [lang, setLangState] = useState<Lang>('id');
  const [platformState, setPlatformState] = useState<PlatformState>('operational');
  const [shutdownAt, setShutdownAt] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
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
     Dipanggil sekali saat aplikasi terpasang, lalu diulang tiap
     LIVE_INTERVAL_MS (pola sama dengan polling notifikasi di bawah) —
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
    };
    setNotifications(prev => [entry, ...prev].slice(0, 200));

    /* Hanya peringatan berbobot yang memotong perhatian operator lewat
       toast. Yang bersifat informasi cukup menunggu di lonceng — kalau
       semuanya memaksa muncul, tidak ada lagi yang terasa penting. */
    if (!event.silent && SEVERITY_RANK[entry.severity] >= 2) {
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

  const markRead = useCallback((id: number) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => (n.read ? n : { ...n, read: true })));
  }, []);

  /* Menandai status penanganan sekaligus menganggapnya sudah dibaca —
     mustahil menangani sesuatu yang belum sempat dilihat. */
  const setAlertStatus = useCallback((id: number, status: AlertStatus) => {
    setNotifications(prev => prev.map(n => (n.id === id ? { ...n, status, read: true } : n)));
  }, []);

  const removeNotification = useCallback((id: number) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const clearNotifications = useCallback(() => setNotifications([]), []);

  const resetNotifications = useCallback(() => setNotifications(seedNotifications()), []);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const openAlertCount = useMemo(
    () => notifications.filter(n => n.status === 'terbuka').length,
    [notifications],
  );

  /* Riwayat dimuat saat operator masuk dan dikosongkan saat keluar.
     localStorage baru ada setelah komponen terpasang, jadi pemuatan
     memang harus terjadi di dalam effect. */
  /* Penanda ini melewatkan satu kali penulisan tepat setelah pemuatan.
     Tanpa itu, effect penyimpanan yang berjalan pada commit yang sama
     masih memegang daftar kosong dan akan menimpa riwayat yang baru saja
     dibaca dari penyimpanan. */
  const lewatiSimpan = useRef(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!account) { setNotifications([]); return; }
    lewatiSimpan.current = true;
    setNotifications(loadNotifications(account.username));
  }, [account]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!account) return;
    if (lewatiSimpan.current) { lewatiSimpan.current = false; return; }
    /* Daftar kosong pun disimpan — itu keputusan operator, bukan
       ketiadaan data. */
    saveNotifications(account.username, notifications);
  }, [notifications, account]);

  /* Umpan peristiwa langsung. Berhenti total begitu daya diputus: itulah
     yang membuat keadaan luring benar-benar terasa mati, bukan sekadar
     berganti warna. */
  const notifRef = useRef<AppNotification[]>([]);
  useEffect(() => { notifRef.current = notifications; }, [notifications]);

  useEffect(() => {
    if (!account || platformState === 'shutdown') return;
    const id = window.setInterval(() => {
      const recent = notifRef.current.slice(0, 4).map(n => n.title);
      notify(pickLiveEvent(recent));
    }, LIVE_INTERVAL_MS);
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
    setCurrentPage('dashboard');
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
      currentPage, setCurrentPage,
      sidebarCollapsed, toggleSidebar,
      account, login, logout, loginPhase, setLoginPhase,
      licenses, activeLicenseIds, isLicenseActive, isLicensed, licenseForPage,
      activateLicense, deactivateLicense,
      toasts, pushToast, dismissToast, dismissAllToasts,
      notifications, unreadCount, openAlertCount, notify,
      markRead, markAllRead, setAlertStatus, removeNotification,
      clearNotifications, resetNotifications, notifOpen, setNotifOpen,
      showEmergencyModal, setShowEmergencyModal,
    }}>
      {children}
    </AppContext.Provider>
  );
}
