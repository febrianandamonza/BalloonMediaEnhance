/* =====================================================================
   LICENSING CORE — Tethered Balloon Geospatial Intelligence System
   ---------------------------------------------------------------------
   Licensee : Badan Intelijen Negara
   Licensor : TAB Integrated Systems Pte Ltd
   Effective: 20 July 2026   Expiry: 31 December 2027

   Struktur resmi sesuai sertifikat yang diterbitkan:
     1 (satu)  Software License             — Crowd Counting
     3 (tiga)  Module License               — AODGIS, DAEP, IRGIS

   Setiap lisensi diterbitkan dalam 2 (dua) unit serial untuk 2 stasiun
   GCS. Kedua serial berlaku pada kedua stasiun (non-transferable ke
   pihak di luar Licensee).
   ===================================================================== */
import api from "../services/api";
import type { LicenseCertificateRecord } from "../services/api";

export type LicenseId = 'CC' | 'AODGIS' | 'DAEP' | 'IRGIS';

export type LicenseKind = 'license' | 'module';

export interface FeatureDef {
  /** Kode sub-lisensi sesuai PRD / SOW (mis. "1.1a") */
  code: string;
  /** Nama resmi sub-modul */
  name: string;
  /** Ringkasan kapabilitas */
  description: string;
  /** Halaman aplikasi yang dibuka oleh sub-modul ini */
  page: string;
}

export interface LicenseDef {
  id: LicenseId;
  /** "CERTIFICATE — LICENSE" vs "CERTIFICATE — MODULE LICENSE" */
  kind: LicenseKind;
  /** Judul persis seperti tercetak pada sertifikat */
  title: string;
  /** Judul ringkas untuk navigasi & badge */
  shortTitle: string;
  /** Kode dokumen kontrak */
  contractRef: string;
  /** Nomor seri yang sah (2 unit — satu per stasiun GCS) */
  serialNumbers: string[];
  effectiveDate: string;
  expiryDate: string;
  /** Sub-modul yang dibuka oleh lisensi ini */
  features: FeatureDef[];
}

/* ---------------------------------------------------------------------
   Katalog lisensi resmi
   --------------------------------------------------------------------- */

function formatDate(date: string | Date): string {
  const d = new Date(date);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const moduleLicense01: LicenseDef = {
  id: 'CC',
  kind: 'license',
  title: 'Crowd Counting',
  shortTitle: 'Crowd Counting',
  contractRef: 'TAB-CC-2026',
  serialNumbers: ['TAB-CC-2026-001-A8F4K2'],
  effectiveDate: '20 July 2026',
  expiryDate: '31 December 2027',
  features: [
    {
      code: 'CC-01',
      name: 'Crowd Density Estimation',
      description:
        'Estimasi kepadatan massa berbasis CSRNet (density map) dengan akselerasi CUDA, overlay gradasi densitas real-time pada video feed.',
      page: 'crowd',
    },
  ]
}
const moduleLicense02: LicenseDef = {
  id: 'AODGIS',
  kind: 'module',
  title: 'Analytic and Object Detection Tethered Balloon Geospatial Intelligence System',
  shortTitle: 'Analytic & Object Detection',
  contractRef: 'TAB-AODGIS-2026',
  serialNumbers: ['TAB-AODGIS-2026-003-C3L8P6', 'TAB-AODGIS-2026-004-D5Q7W1'],
  effectiveDate: '20 July 2026',
  expiryDate: '31 December 2027',
  features: [
    {
      code: '1.1a',
      name: 'Digital Imaging Analytic & Object Detection',
      description:
        'Deteksi objek pada citra statis (JPG/PNG/TIFF) menggunakan YOLOv8x lokal dengan bounding box, label kelas, dan confidence score.',
      page: 'detection-image',
    },
    {
      code: '1.1b',
      name: 'Digital Video Analytic & Object Detection',
      description:
        'Deteksi objek real-time pada stream RTSP dengan tracking ByteTrack/DeepSORT, dukungan MTI dan ROI geofence poligon.',
      page: 'detection-video',
    },
  ]
}
const moduleLicense03: LicenseDef = {
  id: 'DAEP',
  kind: 'module',
  title: 'Digital Analytic Enhancement Processing System Module',
  shortTitle: 'Digital Analytic Enhancement Processing',
  contractRef: 'TAB-DAEP-2026',
  serialNumbers: ['TAB-DAEP-2026-005-E9R4T8', 'TAB-DAEP-2026-006-F2N6Y7'],
  effectiveDate: '20 July 2026',
  expiryDate: '31 December 2027',
  features: [
    {
      code: '1.2a',
      name: 'Digital Imaging Enhancement',
      description:
        'Peningkatan kualitas citra statis: CLAHE, filter Laplacian, unsharp masking, dan bilateral denoising.',
      page: 'enhance-image',
    },
    {
      code: '1.2b',
      name: 'Digital Video Enhancement',
      description:
        'Peningkatan stream video real-time dengan 22+ palet false color termal sesuai Epsilon Manual §5.7.3.',
      page: 'enhance-video',
    },
    {
      code: '1.2c',
      name: 'Interface Integrasi (API) Main Tether Cable',
      description:
        'Endpoint REST & WebSocket lokal untuk pertukaran data daya dan data link kabel penambat (Modbus TCP/RTU).',
      page: 'tether-api',
    },
    {
      code: '1.2d',
      name: 'Monitoring Checking Capability Tether Cable',
      description:
        'Dashboard kesehatan kabel penambat: tegangan, arus, resistansi isolasi, kontinuitas, dan SNR serat optik.',
      page: 'tether-monitor',
    },
  ]
}
const moduleLicense04: LicenseDef = {
  id: 'IRGIS',
  kind: 'module',
  title: 'Information and Reporting Tethered Balloon Geospatial Intelligence System Module',
  shortTitle: 'Information & Reporting',
  contractRef: 'TAB-IRGIS-2026',
  serialNumbers: ['TAB-IRGIS-2026-007-G5V8K3', 'TAB-IRGIS-2026-008-H7M2Z9'],
  effectiveDate: '20 July 2026',
  expiryDate: '31 December 2027',
  features: [
    // {
    //   code: '1.3a',
    //   name: 'Digital Reporting Tethered Balloon',
    //   description:
    //     'Pembuatan laporan misi otomatis format PDF/XLSX dengan watermark klasifikasi instansi.',
    //   page: 'reporting',
    // },
    {
      code: '1.3b',
      name: 'Digital Visualisation Information GeoInt',
      description:
        'Peta taktis offline (Leaflet/MBTiles), proyeksi FOV cone, dan Target Bank dengan ekspor KML/GPX.',
      page: 'geo-viz',
    },
    {
      code: '1.3c',
      name: 'Digital Smart Notification Alert',
      description:
        'Mesin aturan alert berbasis geofence, ambang batas sensor, dan deteksi intrusi dengan eskalasi bertingkat.',
      page: 'alerts',
    },
    {
      code: '1.3d',
      name: 'Information Flight Balloon Intelligent App',
      description:
        'Logbook penerbangan otomatis, checklist pra-terbang digital, dan manajemen roster tim operator.',
      page: 'flight-info',
    },
    // {
    //   code: '1.3e',
    //   name: 'Monitoring Availability Mooring App System',
    //   description:
    //     'Telemetri stasiun penambat: anemometer, load cell winch, tekanan helium, inverter, dan proteksi petir.',
    //   page: 'mooring',
    // },
    {
      code: '1.3f',
      name: 'Simulation Plan Skenario Flight Balloon',
      description:
        'Kalkulator kelayakan terbang GO / MARGINAL / NO-GO berbasis cuaca, helium, angin, dan bobot payload.',
      page: 'simulation',
    },
  ]
}
/**
 * Katalog resmi. Struktur sub-modul (features, halaman) selalu mengikuti
 * definisi lokal di atas — backend hanya mengelola data sertifikat
 * (tanggal, referensi kontrak, nomor seri), bukan peta halaman aplikasi.
 * {@link refreshLicenseCatalog} menimpa medan tersebut di tempat begitu
 * data terbaru tiba dari `GET /api/v1/licenses`, sehingga referensi array
 * ini serta LICENSE_BY_ID dkk. yang sudah diimpor modul lain tetap valid.
 */
export const LICENSE_CATALOG: LicenseDef[] = [
  moduleLicense01,
  moduleLicense02,
  moduleLicense03,
  moduleLicense04,
];

/* ---------------------------------------------------------------------
   Indeks turunan
   --------------------------------------------------------------------- */

export const LICENSE_BY_ID: Record<LicenseId, LicenseDef> = LICENSE_CATALOG.reduce(
  (acc, l) => {
    acc[l.id] = l;
    return acc;
  },
  {} as Record<LicenseId, LicenseDef>,
);

/** Peta kode sub-modul (mis. "1.3b") → lisensi induk yang menaunginya. */
export const FEATURE_TO_LICENSE: Record<string, LicenseId> = LICENSE_CATALOG.reduce(
  (acc, l) => {
    for (const f of l.features) acc[f.code] = l.id;
    return acc;
  },
  {} as Record<string, LicenseId>,
);

/** Peta halaman aplikasi → lisensi yang mengunci halaman tersebut. */
export const PAGE_TO_LICENSE: Record<string, LicenseId> = LICENSE_CATALOG.reduce(
  (acc, l) => {
    for (const f of l.features) acc[f.page] = l.id;
    return acc;
  },
  {} as Record<string, LicenseId>,
);

function buildSerialIndex(): Record<string, LicenseId> {
  return LICENSE_CATALOG.reduce(
    (acc, l) => {
      for (const sn of l.serialNumbers) acc[sn] = l.id;
      return acc;
    },
    {} as Record<string, LicenseId>,
  );
}

/** Peta serial number → lisensi. Dipakai saat validasi kunci aktivasi.
    Dibangun ulang oleh {@link refreshLicenseCatalog} setiap kali nomor
    seri sebuah definisi berubah. */
let SERIAL_INDEX: Record<string, LicenseId> = buildSerialIndex();

/* ---------------------------------------------------------------------
   Sinkronisasi dengan backend
   --------------------------------------------------------------------- */

/** Menimpa medan turunan-kontrak satu definisi lisensi statis dengan
    sertifikat terbaru dari backend, tanpa mengganti identitas objeknya —
    LICENSE_BY_ID dkk. menunjuk ke objek yang sama sehingga ikut ter-update.
    Mengembalikan record yang dipakai (paling baru expired_date-nya) supaya
    pemanggil bisa membaca `status`-nya tanpa mengurutkan ulang. */
function applyRecordsToDef(def: LicenseDef, records: LicenseCertificateRecord[]): LicenseCertificateRecord {
  const sorted = [...records].sort(
    (a, b) => new Date(b.expired_date).getTime() - new Date(a.expired_date).getTime(),
  );
  const latest = sorted[0];
  def.expiryDate = formatDate(latest.expired_date);
  def.effectiveDate = formatDate(latest.issued_date);
  def.contractRef = latest.license_code.split('-').slice(0, 3).join('-');
  def.serialNumbers = sorted.map((r) => r.license_code);
  return latest;
}

/** Status aktivasi satu lisensi — dibaca langsung dari database lewat
    {@link refreshLicenseCatalog}, tidak pernah disimpan di localStorage. */
export interface LicenseActivation {
  active: boolean;
  serialNumber: string;
  /** false bila backend sama sekali belum pernah punya record untuk
      lisensi ini — dalam keadaan itu def.expiryDate/effectiveDate masih
      nilai bawaan pabrik (bukan data sungguhan), jadi UI (LicensePage)
      sebaiknya menampilkan "BELUM DIAKTIVASI" alih-alih tanggal palsu
      tersebut. */
  hasCertificate: boolean;
}

export type LicenseActivationMap = Record<LicenseId, LicenseActivation>;

/** Anggap tidak aktif bila field `status` eksplisit menyatakan begitu.
    Backend lama yang belum mengirim `status` sama sekali dianggap aktif
    selama belum expired (dicek terpisah oleh pemanggil). */
function isRecordActive(record: LicenseCertificateRecord): boolean {
  if (typeof record.status !== 'string') return true;
  const s = record.status.trim().toLowerCase();
  return s === 'active' || s === 'aktif';
}

const KNOWN_LICENSE_IDS: readonly LicenseId[] = ['CC', 'AODGIS', 'DAEP', 'IRGIS'];

function isLicenseId(value: unknown): value is LicenseId {
  return typeof value === 'string' && (KNOWN_LICENSE_IDS as readonly string[]).includes(value);
}

/**
 * Menentukan def mana yang dituju satu record sertifikat. `license_name`
 * (judul panjang) rawan meleset satu spasi/kapitalisasi pun dengan `title`
 * yang di-hardcode di sini — begitu itu terjadi, record itu diam-diam
 * tidak pernah cocok, dan lisensi yang bersangkutan kelihatan "tidak ada
 * sertifikat" terus meski datanya sudah diperbarui di backend. Karena itu
 * `license_code` (mis. "TAB-CC-2026-001-A8F4K2") diprioritaskan — segmen
 * keduanya persis LicenseId, jauh lebih stabil daripada mencocokkan teks
 * judul. `license_name` tetap dipakai sebagai fallback terakhir.
 */
function resolveLicenseId(
  record: LicenseCertificateRecord,
  byTitle: Map<string, LicenseId>,
): LicenseId | null {
  if (isLicenseId(record.license_id)) return record.license_id;

  const codeSegment = record.license_code?.split('-')[1];
  if (isLicenseId(codeSegment)) return codeSegment;

  return byTitle.get(record.license_name) ?? null;
}

function emptyActivationMap(): LicenseActivationMap {
  return LICENSE_CATALOG.reduce((acc, def) => {
    acc[def.id] = { active: false, serialNumber: '', hasCertificate: false };
    return acc;
  }, {} as LicenseActivationMap);
}

/**
 * Satu-satunya sumber kebenaran status lisensi: mengambil sertifikat
 * terbaru dari `GET /api/v1/licenses` (api.getLicenses()), menimpa
 * LICENSE_CATALOG di tempat dengan tanggal/referensi kontrak/nomor seri
 * yang sesungguhnya diterbitkan backend, lalu mengembalikan status
 * aktif/nonaktif tiap lisensi apa adanya dari database — tidak pernah
 * disimpan atau dibaca dari localStorage. Pemanggil (AppProvider) tinggal
 * menaruh hasilnya langsung sebagai state `licenses`.
 *
 * Aman dipanggil berkali-kali. Bila backend tidak terjangkau, seluruh
 * lisensi dikembalikan nonaktif — tanpa DB yang bisa dihubungi, aplikasi
 * tidak berhak mengklaim status apa pun sebagai aktif.
 */
export async function refreshLicenseCatalog(): Promise<LicenseActivationMap> {
  const activation = emptyActivationMap();
  try {
    const records = await api.getLicenses();

    const byTitle = new Map<string, LicenseId>();
    for (const def of LICENSE_CATALOG) byTitle.set(def.title, def.id);

    const byId = new Map<LicenseId, LicenseCertificateRecord[]>();
    for (const record of records) {
      const id = resolveLicenseId(record, byTitle);
      if (!id) {
        // console.log(`[licensing] record ${String(record.id)} (license_code=${record.license_code}) tidak cocok dengan lisensi mana pun, diabaikan`);
        continue;
      }
      const bucket = byId.get(id);
      if (bucket) bucket.push(record);
      else byId.set(id, [record]);
    }

    for (const def of LICENSE_CATALOG) {
      const matched = byId.get(def.id);
      if (!matched) {
        // console.log(`[licensing] ${def.id} (${def.shortTitle}): tidak ada sertifikat dari backend`);
        continue;
      }
      const latest = applyRecordsToDef(def, matched);
      const expired = isExpired(def);
      const active = isRecordActive(latest) && !expired;
      activation[def.id] = { active, serialNumber: active ? latest.license_code : '', hasCertificate: true };
      // console.log(`[licensing] ${def.id} (${def.shortTitle}): ${active ? 'AKTIF' : expired ? 'KEDALUWARSA' : 'NONAKTIF'} — expiry ${def.expiryDate}`);
    }
    SERIAL_INDEX = buildSerialIndex();
  } catch {
    /* backend tidak terjangkau — kembalikan semua nonaktif, jangan menebak */
  }
  return activation;
}

/* ---------------------------------------------------------------------
   Validasi & aktivasi
   --------------------------------------------------------------------- */

export type ActivationFailure =
  | 'EMPTY'
  | 'MALFORMED'
  | 'UNKNOWN_KEY'
  | 'WRONG_LICENSE'
  | 'ALREADY_ACTIVE'
  | 'EXPIRED';

export type ActivationResult =
  | { ok: true; licenseId: LicenseId; serialNumber: string }
  | { ok: false; reason: ActivationFailure; message: string };

/** Bentuk kunci resmi: TAB-<PRODUK>-<TAHUN>-<URUT 3 digit>-<CHECK 6 karakter> */
const KEY_PATTERN = /^TAB-[A-Z]{2,8}-\d{4}-\d{3}-[A-Z0-9]{6}$/;

/** Normalisasi input operator: rapikan spasi, samakan kapital, seragamkan tanda hubung. */
export function normalizeKey(raw: string): string {
  return raw
    .trim()
    .toUpperCase()
    .replace(/[‐-―−]/g, '-') // en/em dash → hyphen
    .replace(/\s+/g, '');
}

const FAILURE_MESSAGES: Record<ActivationFailure, string> = {
  EMPTY: 'License key belum diisi.',
  MALFORMED:
    'Format license key tidak valid. Format resmi: TAB-XXXX-YYYY-NNN-XXXXXX (contoh: TAB-CC-2026-001-A8F4K2).',
  UNKNOWN_KEY:
    'License key tidak dikenali. Periksa kembali nomor seri pada sertifikat yang diterbitkan TAB Integrated Systems Pte Ltd.',
  WRONG_LICENSE:
    'License key valid, namun diterbitkan untuk lisensi lain. Aktivasikan pada kartu lisensi yang sesuai.',
  ALREADY_ACTIVE: 'Lisensi ini sudah dalam status ACTIVE.',
  EXPIRED: 'Masa berlaku lisensi telah berakhir. Hubungi Licensor untuk perpanjangan.',
};

/**
 * Memvalidasi kunci aktivasi terhadap katalog lisensi resmi.
 *
 * @param rawKey      kunci yang diketik operator
 * @param expectedId  lisensi yang sedang diaktivasi dari kartunya
 * @param activeIds   himpunan lisensi yang sudah aktif saat ini
 */
export function validateActivationKey(
  rawKey: string,
  expectedId: LicenseId,
  activeIds: readonly LicenseId[] = [],
): ActivationResult {
  const key = normalizeKey(rawKey);

  const fail = (reason: ActivationFailure): ActivationResult => ({
    ok: false,
    reason,
    message: FAILURE_MESSAGES[reason],
  });

  if (!key) return fail('EMPTY');
  if (!KEY_PATTERN.test(key)) return fail('MALFORMED');

  const matchedId = SERIAL_INDEX[key];
  if (!matchedId) return fail('UNKNOWN_KEY');
  if (matchedId !== expectedId) return fail('WRONG_LICENSE');
  if (activeIds.includes(expectedId)) return fail('ALREADY_ACTIVE');

  const def = LICENSE_BY_ID[matchedId];
  if (isExpired(def)) return fail('EXPIRED');

  return { ok: true, licenseId: matchedId, serialNumber: key };
}

/** Lisensi dianggap kedaluwarsa bila tanggal hari ini melewati expiryDate. */
export function isExpired(def: LicenseDef, now: Date = new Date()): boolean {
  return now.getTime() > Date.parse(def.expiryDate + ' 23:59:59 GMT+0700');
}

/** Sisa hari sebelum lisensi kedaluwarsa (negatif bila sudah lewat). */
export function daysUntilExpiry(def: LicenseDef, now: Date = new Date()): number {
  const ms = Date.parse(def.expiryDate + ' 23:59:59 GMT+0700') - now.getTime();
  return Math.ceil(ms / 86_400_000);
}

/**
 * Masker serial untuk tampilan ringkas: 6 karakter terakhir disamarkan.
 * Dipakai pada kartu ringkasan, bukan pada halaman License Manager.
 */
export function maskSerial(sn: string): string {
  const i = sn.lastIndexOf('-');
  return i < 0 ? sn : `${sn.slice(0, i + 1)}••••••`;
}
