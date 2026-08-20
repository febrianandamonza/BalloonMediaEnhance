/* =====================================================================
   PUSAT NOTIFIKASI — MODEL DATA

   Satu-satunya sumber kebenaran untuk peringatan stasiun. Dipakai
   bersama oleh lonceng di bilah atas dan modul Smart Notification
   Alert, sehingga tindakan di salah satu tempat langsung terlihat di
   tempat lain.

   Berkas ini sengaja bebas React: hanya tipe, data, dan fungsi murni.
   Dengan begitu ia aman diimpor dari mana pun, termasuk dari kode yang
   dijalankan di sisi peladen saat pembangunan halaman.
   ===================================================================== */

export type Severity = 'kritis' | 'peringatan' | 'informasi';
export type AlertStatus = 'terbuka' | 'ditangani' | 'selesai';

export interface AppNotification {
  id: number;
  /** Waktu kejadian dalam milidetik sejak epoch. */
  ts: number;
  title: string;
  /** Kalimat penjelas — satu baris, tanpa jargon yang tidak perlu. */
  detail: string;
  severity: Severity;
  /** Kategori operasional; menentukan ikon dan penyaringan. */
  category: Category;
  status: AlertStatus;
  /** Subsistem yang memunculkan peringatan. */
  source: string;
  read: boolean;
  /** Halaman yang dibuka saat baris diklik; null bila tidak ada tujuan. */
  page: string | null;
  /** Nilai terukur yang memicu ambang, mis. "31 km/h". */
  reading?: string;
  /** Ambang yang dilampaui, mis. "30 km/h". */
  threshold?: string;
}

export type Category =
  | 'Cuaca'
  | 'Geofence'
  | 'Tether'
  | 'Ambang Batas'
  | 'Mooring'
  | 'Konektivitas'
  | 'Keamanan'
  | 'Deteksi Objek'
  | 'Sistem';

/** Modul yang paling relevan untuk menindaklanjuti tiap kategori. */
export const CATEGORY_PAGE: Record<Category, string | null> = {
  'Cuaca': 'flight-info',
  'Geofence': 'geo-viz',
  'Tether': 'tether-monitor',
  'Ambang Batas': 'crowd',
  'Mooring': 'mooring',
  'Konektivitas': 'tether-api',
  'Keamanan': 'audit-log',
  'Deteksi Objek': 'detection-video',
  'Sistem': 'settings',
};

export const CATEGORIES = Object.keys(CATEGORY_PAGE) as Category[];

/* ===== Urutan kepentingan =====
   Dipakai untuk mengurutkan dan untuk memutuskan mana yang naik
   menjadi toast. */
export const SEVERITY_RANK: Record<Severity, number> = {
  kritis: 3,
  peringatan: 2,
  informasi: 1,
};

/* =====================================================================
   BENIH DATA

   Waktu ditulis sebagai selisih menit dari saat modul dimuat, bukan
   tanggal tetap. Tanggal tetap akan tampak basi begitu aplikasi dibuka
   di hari lain — dan pengelompokan "Hari Ini / Kemarin" jadi tidak
   berarti.
   ===================================================================== */
interface Seed {
  /** Berapa menit yang lalu kejadian ini berlangsung. */
  ago: number;
  title: string;
  detail: string;
  severity: Severity;
  category: Category;
  status: AlertStatus;
  source: string;
  read: boolean;
  reading?: string;
  threshold?: string;
}

const SEEDS: Seed[] = [
  {
    ago: 4,
    title: 'Hembusan angin mendekati batas aman',
    detail: 'Anemometer mencatat hembusan 31 km/h pada ketinggian tambat. Pantau tren sepuluh menit ke depan.',
    severity: 'peringatan', category: 'Cuaca', status: 'terbuka',
    source: 'Anemometer GCS-02', read: false, reading: '31 km/h', threshold: '30 km/h',
  },
  {
    ago: 12,
    title: 'Objek tidak dikenal memasuki geofence barat laut',
    detail: 'Satu objek bergerak melintasi batas perimeter dan bertahan lebih dari 20 detik di dalam zona.',
    severity: 'kritis', category: 'Geofence', status: 'terbuka',
    source: 'Video Analytic', read: false, reading: '1 objek', threshold: '0 objek',
  },
  {
    ago: 38,
    title: 'Kepadatan Zona A melewati ambang',
    detail: 'Perhitungan kerumunan menembus 500 jiwa pada petak pengamatan utama.',
    severity: 'peringatan', category: 'Ambang Batas', status: 'terbuka',
    source: 'Crowd Counting', read: false, reading: '531 jiwa', threshold: '500 jiwa',
  },
  {
    ago: 72,
    title: 'Resistansi isolasi kabel menurun',
    detail: 'Pengukuran isolasi turun ke 112 MΩ. Masih di atas ambang henti, namun tren perlu diawasi.',
    severity: 'peringatan', category: 'Tether', status: 'ditangani',
    source: 'Tether Monitor', read: true, reading: '112 MΩ', threshold: '100 MΩ',
  },
  {
    ago: 145,
    title: 'Tekanan helium turun di bawah rentang nominal',
    detail: 'Tekanan envelope tercatat 155 bar setelah penyesuaian ketinggian pagi.',
    severity: 'informasi', category: 'Mooring', status: 'selesai',
    source: 'Mooring Monitor', read: true, reading: '155 bar', threshold: '150 bar',
  },
  {
    ago: 210,
    title: 'Kendaraan berat terdeteksi di jalur terlarang',
    detail: 'Klasifikasi truk dengan kepercayaan 0,82 pada jalur akses timur.',
    severity: 'informasi', category: 'Deteksi Objek', status: 'selesai',
    source: 'Video Analytic', read: true,
  },
  {
    ago: 60 * 15,
    title: 'Tautan data balon terputus sesaat',
    detail: 'Sambungan turun selama 4 detik lalu pulih otomatis. Tidak ada bingkai video yang hilang.',
    severity: 'peringatan', category: 'Konektivitas', status: 'selesai',
    source: 'Tether API', read: true, reading: '4 detik', threshold: '2 detik',
  },
  {
    ago: 60 * 19,
    title: 'Percobaan masuk gagal tiga kali berturut-turut',
    detail: 'Tiga kegagalan otentikasi dari terminal yang sama. Akun dikunci sementara selama 15 menit.',
    severity: 'kritis', category: 'Keamanan', status: 'selesai',
    source: 'Audit Trail', read: true, reading: '3 percobaan', threshold: '3 percobaan',
  },
  {
    ago: 60 * 31,
    title: 'Kalibrasi gimbal Epsilon selesai',
    detail: 'Prosedur kalibrasi rutin tuntas tanpa galat. Penyimpangan sumbu di bawah 0,02°.',
    severity: 'informasi', category: 'Sistem', status: 'selesai',
    source: 'Payload Controller', read: true,
  },
];

export function seedNotifications(): AppNotification[] {
  const now = Date.now();
  return SEEDS.map((s, i) => ({
    id: now - i,
    ts: now - s.ago * 60_000,
    title: s.title,
    detail: s.detail,
    severity: s.severity,
    category: s.category,
    status: s.status,
    source: s.source,
    read: s.read,
    page: CATEGORY_PAGE[s.category],
    reading: s.reading,
    threshold: s.threshold,
  }));
}

/* =====================================================================
   PENYIMPANAN LOKAL

   Disimpan per stasiun: setiap operator memegang riwayat peringatannya
   sendiri, sejalan dengan pemisahan lisensi dan pengaturan.
   ===================================================================== */
const key = (username: string) => `skystar.notifications.${username}`;

/** Riwayat dibatasi agar penyimpanan peramban tidak tumbuh tanpa henti. */
const MAX_STORED = 200;

export function loadNotifications(username: string): AppNotification[] {
  if (typeof window === 'undefined') return seedNotifications();
  try {
    const raw = window.localStorage.getItem(key(username));
    /* Hanya ketiadaan kunci yang berarti "belum pernah dipakai". Riwayat
       yang sengaja dikosongkan operator adalah keadaan sah dan harus
       tetap kosong setelah halaman dimuat ulang. */
    if (raw === null) return seedNotifications();
    const parsed = JSON.parse(raw) as AppNotification[];
    if (!Array.isArray(parsed)) return seedNotifications();
    /* Saring entri cacat agar satu baris rusak tidak merobohkan panel. */
    return parsed
      .filter(n => n && typeof n.id === 'number' && typeof n.ts === 'number' && typeof n.title === 'string')
      .slice(0, MAX_STORED);
  } catch {
    return seedNotifications();
  }
}

export function saveNotifications(username: string, list: AppNotification[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key(username), JSON.stringify(list.slice(0, MAX_STORED)));
  } catch {
    /* kuota penuh atau penyimpanan ditolak → riwayat tetap hidup di memori */
  }
}

/* =====================================================================
   WAKTU RELATIF

   Dua bahasa ditangani terpisah karena aturannya memang berbeda:
   Indonesia tidak mengenal bentuk jamak pada satuan waktu ("3 menit",
   bukan "3 menits"), sedangkan Inggris memerlukannya.
   ===================================================================== */
export function relativeTime(ts: number, lang: 'id' | 'en', now = Date.now()): string {
  const detik = Math.max(0, Math.round((now - ts) / 1000));

  if (lang === 'en') {
    if (detik < 45) return 'just now';
    const menit = Math.round(detik / 60);
    if (menit < 60) return `${menit} min ago`;
    const jam = Math.round(menit / 60);
    if (jam < 24) return jam === 1 ? '1 hour ago' : `${jam} hours ago`;
    const hari = Math.round(jam / 24);
    if (hari < 7) return hari === 1 ? 'yesterday' : `${hari} days ago`;
    const pekan = Math.round(hari / 7);
    return pekan === 1 ? '1 week ago' : `${pekan} weeks ago`;
  }

  if (detik < 45) return 'baru saja';
  const menit = Math.round(detik / 60);
  if (menit < 60) return `${menit} menit lalu`;
  const jam = Math.round(menit / 60);
  if (jam < 24) return `${jam} jam lalu`;
  const hari = Math.round(jam / 24);
  if (hari < 7) return hari === 1 ? 'kemarin' : `${hari} hari lalu`;
  const pekan = Math.round(hari / 7);
  return `${pekan} pekan lalu`;
}

/** Jam dinding stasiun (UTC+7) untuk baris rincian. */
export function clockTime(ts: number, lang: 'id' | 'en'): string {
  return new Date(ts).toLocaleTimeString(lang === 'en' ? 'en-GB' : 'id-ID', {
    hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Jakarta',
  });
}

/** Tanggal dan jam lengkap untuk tabel riwayat pada modul. */
export function fullTimestamp(ts: number, lang: 'id' | 'en'): string {
  const d = new Date(ts);
  const tanggal = d.toLocaleDateString(lang === 'en' ? 'en-GB' : 'id-ID', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta',
  });
  return `${tanggal} · ${clockTime(ts, lang)}`;
}

/* ===== Pengelompokan menurut hari ===== */
export type BucketId = 'today' | 'yesterday' | 'earlier';

export function bucketOf(ts: number, now = Date.now()): BucketId {
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);
  if (ts >= startOfToday.getTime()) return 'today';
  if (ts >= startOfToday.getTime() - 86_400_000) return 'yesterday';
  return 'earlier';
}

export const BUCKET_LABEL: Record<BucketId, string> = {
  today: 'Hari Ini',
  yesterday: 'Kemarin',
  earlier: 'Sebelumnya',
};

/* =====================================================================
   UMPAN PERISTIWA LANGSUNG

   Selama platform menyala, stasiun sungguhan terus memunculkan
   peringatan. Daftar di bawah adalah kejadian yang wajar muncul dari
   subsistem yang ada di aplikasi ini; satu diambil secara acak pada
   selang waktu tertentu. Umpan berhenti total saat daya diputus —
   itulah yang membuat keadaan luring terasa benar.
   ===================================================================== */
export type LiveEvent = Omit<AppNotification, 'id' | 'ts' | 'read' | 'page' | 'status'>;

const LIVE_POOL: LiveEvent[] = [
  {
    title: 'Arah angin berubah 40° dalam lima menit',
    detail: 'Perubahan mendadak pada ketinggian 120 m. Sudut tambat disesuaikan otomatis.',
    severity: 'peringatan', category: 'Cuaca', source: 'Anemometer GCS-02',
    reading: '40°', threshold: '30°',
  },
  {
    title: 'Kepadatan petak barat naik cepat',
    detail: 'Kenaikan 18% dalam dua menit terakhir pada petak pengamatan barat.',
    severity: 'peringatan', category: 'Ambang Batas', source: 'Crowd Counting',
    reading: '+18%', threshold: '+15%',
  },
  {
    title: 'Bidikan gimbal dikunci pada target baru',
    detail: 'Payload Epsilon mengunci koordinat yang dikirim dari Target Bank.',
    severity: 'informasi', category: 'Deteksi Objek', source: 'Payload Controller',
  },
  {
    title: 'Tegangan baterai cadangan turun',
    detail: 'Bank baterai kedua berada di 24,3 V setelah 40 menit tanpa pengisian.',
    severity: 'informasi', category: 'Sistem', source: 'Power Monitor',
    reading: '24,3 V', threshold: '24,0 V',
  },
  {
    title: 'Gerakan terdeteksi di sektor tambat selatan',
    detail: 'Dua objek berjalan melintas 8 m dari titik jangkar selatan.',
    severity: 'peringatan', category: 'Geofence', source: 'Video Analytic',
    reading: '2 objek', threshold: '0 objek',
  },
  {
    title: 'Latensi tautan optik naik',
    detail: 'Waktu tempuh pulang-pergi menyentuh 42 ms pada segmen EOP.',
    severity: 'informasi', category: 'Konektivitas', source: 'Tether API',
    reading: '42 ms', threshold: '35 ms',
  },
  {
    title: 'Suhu penggerak derek melampaui nominal',
    detail: 'Motor derek tambat mencapai 68 °C setelah siklus penurunan terakhir.',
    severity: 'peringatan', category: 'Mooring', source: 'Mooring Monitor',
    reading: '68 °C', threshold: '65 °C',
  },
  {
    title: 'Sesi operator baru dibuka',
    detail: 'Terminal supervisor masuk dari jaringan stasiun yang sama.',
    severity: 'informasi', category: 'Keamanan', source: 'Audit Trail',
  },
];

/** Mengambil satu peristiwa yang belum lama muncul, agar tidak berulang. */
export function pickLiveEvent(recentTitles: string[]): LiveEvent {
  const segar = LIVE_POOL.filter(e => !recentTitles.includes(e.title));
  const kolam = segar.length > 0 ? segar : LIVE_POOL;
  return kolam[Math.floor(Math.random() * kolam.length)];
}

/** Selang antar peristiwa langsung — cukup jarang agar tidak mengganggu. */
export const LIVE_INTERVAL_MS = 45_000;

/* =====================================================================
   ATURAN PERINGATAN

   Menentukan kapan sebuah pengukuran layak menjadi peringatan. Dapat
   ditambah, diubah, dinonaktifkan, dan dihapus oleh operator; seluruh
   perubahan bertahan di penyimpanan stasiun.
   ===================================================================== */
export interface AlertRule {
  id: number;
  name: string;
  category: Category;
  severity: Severity;
  /** Besaran yang diawasi, mis. "Kecepatan angin". */
  metric: string;
  /** Pembanding yang dipakai terhadap ambang. */
  operator: '>' | '<' | '=';
  threshold: string;
  enabled: boolean;
}

export const DEFAULT_RULES: AlertRule[] = [
  { id: 1, name: 'Kepadatan massa melewati batas', category: 'Ambang Batas', severity: 'peringatan', metric: 'Kepadatan zona', operator: '>', threshold: '500 jiwa', enabled: true },
  { id: 2, name: 'Angin mendekati batas operasi', category: 'Cuaca', severity: 'peringatan', metric: 'Kecepatan angin', operator: '>', threshold: '30 km/h', enabled: true },
  { id: 3, name: 'Angin melampaui batas henti', category: 'Cuaca', severity: 'kritis', metric: 'Kecepatan angin', operator: '>', threshold: '35 km/h', enabled: true },
  { id: 4, name: 'Intrusi geofence perimeter', category: 'Geofence', severity: 'kritis', metric: 'Objek dalam zona', operator: '>', threshold: '0 objek', enabled: true },
  { id: 5, name: 'Isolasi kabel di bawah aman', category: 'Tether', severity: 'kritis', metric: 'Resistansi isolasi', operator: '<', threshold: '100 MΩ', enabled: true },
  { id: 6, name: 'Tekanan helium menurun', category: 'Mooring', severity: 'peringatan', metric: 'Tekanan envelope', operator: '<', threshold: '150 bar', enabled: true },
];

const rulesKey = (username: string) => `skystar.alertrules.${username}`;

export function loadRules(username: string): AlertRule[] {
  if (typeof window === 'undefined') return DEFAULT_RULES;
  try {
    const raw = window.localStorage.getItem(rulesKey(username));
    /* Sama seperti riwayat: daftar aturan yang dikosongkan dengan sengaja
       tidak boleh terisi ulang sendiri saat halaman dibuka lagi. */
    if (raw === null) return DEFAULT_RULES;
    const parsed = JSON.parse(raw) as AlertRule[];
    if (!Array.isArray(parsed)) return DEFAULT_RULES;
    return parsed.filter(r => r && typeof r.id === 'number' && typeof r.name === 'string');
  } catch {
    return DEFAULT_RULES;
  }
}

export function saveRules(username: string, rules: AlertRule[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(rulesKey(username), JSON.stringify(rules));
  } catch {
    /* penyimpanan ditolak → aturan tetap berlaku selama sesi ini */
  }
}
