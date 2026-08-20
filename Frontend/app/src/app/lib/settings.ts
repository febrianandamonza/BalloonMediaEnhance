/* =====================================================================
   KONFIGURASI STASIUN
   ---------------------------------------------------------------------
   Seluruh nilai pada halaman System Settings berasal dari objek di bawah
   ini dan disimpan per stasiun pada penyimpanan peramban. Dengan begitu
   pengaturan benar-benar bertahan setelah aplikasi ditutup — bukan
   sekadar kolom isian yang terlihat dapat diubah.
   ===================================================================== */

export interface StationSettings {
  /* Gimbal & sensor */
  gimbalModel: string;
  controlPath: 'ethernet' | 'serial';
  cameraIp: string;
  controlPort: number;
  comPort: string;
  baudrate: number;
  panTiltLimit: number;
  joystickDeadzone: number;
  autoConnect: boolean;
  gyroStab: boolean;

  /* Jaringan */
  stationIp: string;
  subnetMask: string;
  gateway: string;
  mtu: number;
  rtspUrl: string;
  modbusEndpoint: string;

  /* Inferensi */
  computeDevice: string;
  runtime: string;
  detectionModel: string;
  densityModel: string;
  frameQueue: number;
  autoDownscale: boolean;
  preloadVram: boolean;

  /* Tampilan */
  timezone: string;
  coordFormat: string;
  distanceUnit: string;

  /* Data & retensi */
  retainVideo: number;
  retainImage: number;
  retainTelemetry: number;
  retainAudit: number;
  storageDir: string;
  encryptMedia: boolean;
  autoPurge: boolean;
}

export const DEFAULT_SETTINGS: StationSettings = {
  gimbalModel: 'Epsilon 140Z G2',
  controlPath: 'ethernet',
  cameraIp: '192.168.10.100',
  controlPort: 15004,
  comPort: 'COM3',
  baudrate: 115200,
  panTiltLimit: 20,
  joystickDeadzone: 1500,
  autoConnect: true,
  gyroStab: true,

  stationIp: '192.168.10.10',
  subnetMask: '255.255.255.0',
  gateway: '192.168.10.1',
  mtu: 1500,
  rtspUrl: 'rtsp://192.168.10.100:15004/stream1',
  modbusEndpoint: '192.168.10.50:502',

  computeDevice: 'CUDA:0 — NVIDIA RTX 4090 Laptop (16 GB)',
  runtime: 'TensorRT FP16',
  detectionModel: 'YOLOv8x',
  densityModel: 'CSRNet',
  frameQueue: 4,
  autoDownscale: true,
  preloadVram: true,

  timezone: 'UTC+07:00 — Waktu Indonesia Barat',
  coordFormat: 'Desimal (−6.208800°)',
  distanceUnit: 'Metrik (m / km)',

  retainVideo: 90,
  retainImage: 180,
  retainTelemetry: 365,
  retainAudit: 1095,
  storageDir: 'D:\\SkyStar\\storage',
  encryptMedia: true,
  autoPurge: true,
};

const key = (station: string) => `skystar.settings.${station}`;

export function loadSettings(station: string): StationSettings {
  if (typeof window === 'undefined') return { ...DEFAULT_SETTINGS };
  try {
    const raw = window.localStorage.getItem(key(station));
    if (!raw) return { ...DEFAULT_SETTINGS };
    /* Nilai tersimpan ditimpakan di atas bawaan, sehingga penambahan
       kolom baru pada versi berikutnya tidak merusak konfigurasi lama. */
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<StationSettings>) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(station: string, s: StationSettings): boolean {
  try {
    window.localStorage.setItem(key(station), JSON.stringify(s));
    return true;
  } catch {
    return false;
  }
}

/* Validasi ringan sebelum konfigurasi disimpan. */
const IPV4 = /^(\d{1,3}\.){3}\d{1,3}$/;

export function validateSettings(s: StationSettings): string[] {
  const errs: string[] = [];

  const ip = (v: string, label: string) => {
    if (!IPV4.test(v) || v.split('.').some(n => Number(n) > 255)) {
      errs.push(`${label} bukan alamat IPv4 yang sah.`);
    }
  };

  ip(s.cameraIp, 'Alamat IP kamera');
  ip(s.stationIp, 'Alamat IP stasiun');
  ip(s.subnetMask, 'Subnet mask');
  ip(s.gateway, 'Gateway');

  if (s.controlPort < 1 || s.controlPort > 65535) errs.push('Port kendali harus 1–65535.');
  if (s.mtu < 576 || s.mtu > 9000) errs.push('MTU harus 576–9000.');
  if (s.panTiltLimit < 1 || s.panTiltLimit > 60) errs.push('Batas kecepatan pan/tilt harus 1–60 °/s.');
  if (s.frameQueue < 1 || s.frameQueue > 16) errs.push('Batas antrean frame harus 1–16.');
  if (!s.rtspUrl.startsWith('rtsp://')) errs.push('URL stream harus diawali rtsp://.');

  for (const [v, label] of [
    [s.retainVideo, 'Retensi video'],
    [s.retainImage, 'Retensi citra'],
    [s.retainTelemetry, 'Retensi telemetri'],
    [s.retainAudit, 'Retensi audit trail'],
  ] as [number, string][]) {
    if (v < 1 || v > 3650) errs.push(`${label} harus 1–3650 hari.`);
  }

  return errs;
}
