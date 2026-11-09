'use client';
import React, { useId, useMemo, useState } from 'react';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import { Switch } from '../components/fx';
import {
  DEFAULT_SETTINGS, loadSettings, saveSettings, validateSettings,
  type StationSettings,
} from '../lib/settings';
import { LANGUAGES } from '../lib/i18n';
import {
  SlidersHorizontal, Cctv, Network, Cpu, Palette, HardDriveDownload,
  Save, RotateCcw, Moon, Sun, Gauge, ShieldCheck, Info, AlertTriangle, Languages, Bell, CloudSun,
} from 'lucide-react';

type Tab = 'gimbal' | 'network' | 'ai' | 'appearance' | 'data' | 'notifikasi';

const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
  // { id: 'gimbal', label: 'Gimbal & Sensor', icon: <Cctv size={14} /> },
  // { id: 'network', label: 'Jaringan', icon: <Network size={14} /> },
  // { id: 'ai', label: 'AI Inference', icon: <Cpu size={14} /> },
  { id: 'appearance', label: 'Tampilan', icon: <Palette size={14} /> },
  { id: 'notifikasi', label: 'Notifikasi', icon: <Bell size={14} /> },
  // { id: 'data', label: 'Data & Retensi', icon: <HardDriveDownload size={14} /> },
];

export default function SettingsPage() {
  const { theme, toggleTheme, account, pushToast, notify, t } = useApp();
  const station = account?.stationCode ?? 'GCS';

  const [tab, setTab] = useState<Tab>('appearance');
  /* Nilai tersimpan dibaca sekali saat halaman dibuka. */
  const [saved, setSaved] = useState<StationSettings>(() => loadSettings(station));
  const [draft, setDraft] = useState<StationSettings>(saved);
  const [errors, setErrors] = useState<string[]>([]);

  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved),
    [draft, saved],
  );

  /* Satu penyetel untuk seluruh kolom — menjaga halaman tetap ringkas
     sekaligus memastikan setiap kolom benar-benar terkendali. */
  const set = <K extends keyof StationSettings>(field: K) =>
    (value: StationSettings[K]) => setDraft(d => ({ ...d, [field]: value }));

  const commit = () => {
    const errs = validateSettings(draft);
    setErrors(errs);
    if (errs.length > 0) {
      pushToast({ tone: 'error', title: `${errs.length} nilai belum sah`, detail: errs[0] });
      notify({
        title: `${errs.length} nilai belum sah`,
        detail: errs[0],
        severity: 'peringatan',
        category: 'Sistem',
        source: 'System Settings',
        page: 'settings',
        silent: true,
      });
      return;
    }
    if (!saveSettings(station, draft)) {
      pushToast({ tone: 'error', title: 'Gagal menyimpan', detail: 'Penyimpanan peramban menolak penulisan.' });
      notify({
        title: 'Gagal menyimpan',
        detail: 'Penyimpanan peramban menolak penulisan.',
        severity: 'peringatan',
        category: 'Sistem',
        source: 'System Settings',
        page: 'settings',
        silent: true,
      });
      return;
    }
    setSaved(draft);
    pushToast({
      tone: 'success',
      title: 'Konfigurasi tersimpan',
      detail: `Pengaturan stasiun ${station} diperbarui dan tetap berlaku pada sesi berikutnya.`,
    });
    notify({
      title: 'Konfigurasi tersimpan',
      detail: `Pengaturan stasiun ${station} diperbarui dan tetap berlaku pada sesi berikutnya.`,
      severity: 'informasi',
      category: 'Sistem',
      source: 'System Settings',
      page: 'settings',
      silent: true,
    });
  };

  const revert = () => {
    setDraft(saved);
    setErrors([]);
    pushToast({ tone: 'info', title: 'Perubahan dibatalkan', detail: 'Kolom dikembalikan ke nilai tersimpan.' });
    notify({
      title: 'Perubahan dibatalkan',
      detail: 'Kolom dikembalikan ke nilai tersimpan.',
      severity: 'informasi',
      category: 'Sistem',
      source: 'System Settings',
      page: 'settings',
      silent: true,
    });
  };

  const restoreDefaults = () => {
    setDraft({ ...DEFAULT_SETTINGS });
    setErrors([]);
    pushToast({
      tone: 'warning',
      title: 'Nilai bawaan dimuat',
      detail: 'Tekan Simpan untuk menerapkan, atau Batalkan untuk mengurungkan.',
    });
    notify({
      title: 'Nilai bawaan dimuat',
      detail: 'Tekan Simpan untuk menerapkan, atau Batalkan untuk mengurungkan.',
      severity: 'peringatan',
      category: 'Sistem',
      source: 'System Settings',
      page: 'settings',
      silent: true,
    });
  };

  return (
    <div className="page-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><SlidersHorizontal size={22} /> {t('System Settings')}</h1>
          <p className="page-description">
            Konfigurasi perangkat, jaringan, mesin inferensi, dan kebijakan data untuk
            stasiun {station}.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={restoreDefaults}>
            <RotateCcw size={15} /> Nilai Bawaan
          </button>
          <button className="btn btn-secondary" onClick={revert} disabled={!dirty}>
            {t('Batalkan')}
          </button>
          <button className="btn btn-primary sheen" onClick={commit} disabled={!dirty}>
            <Save size={15} /> Simpan Konfigurasi
          </button>
        </div>
      </div>

      {dirty && (
        <div className="settings-dirty">
          <AlertTriangle size={14} /> Ada perubahan yang belum disimpan.
        </div>
      )}

      {errors.length > 0 && (
        <div className="settings-errors" role="alert">
          <b><AlertTriangle size={14} /> Perbaiki {errors.length} nilai berikut:</b>
          <ul>{errors.map(e => <li key={e}>{e}</li>)}</ul>
        </div>
      )}

      <div className="seg" style={{ marginBottom: 18, flexWrap: 'wrap' }}>
        {TABS.map(tab_ => (
          <button key={tab_.id} className={tab === tab_.id ? 'on' : ''} onClick={() => setTab(tab_.id)}>
            {tab_.icon} {t(tab_.label)}
          </button>
        ))}
      </div>

      {tab === 'gimbal' && <GimbalTab s={draft} set={set} />}
      {tab === 'network' && <NetworkTab s={draft} set={set} />}
      {tab === 'ai' && <AiTab s={draft} set={set} />}
      {tab === 'appearance' && (
        <AppearanceTab s={draft} set={set} theme={theme} toggleTheme={toggleTheme} />
      )}
      {tab === 'notifikasi' && <NotificationsTab s={draft} set={set} />}
      {tab === 'data' && <DataTab s={draft} set={set} />}
    </div>
  );
}

/* ===================================================================
   Pembantu kolom — menjaga setiap tab ringkas dan seluruh isian
   benar-benar terkendali oleh state.
   =================================================================== */
type Setter = <K extends keyof StationSettings>(f: K) => (v: StationSettings[K]) => void;

/* htmlFor diteruskan dari pembungkus di bawah: label yang hanya
   bersebelahan tidak terhubung ke kendalinya, sehingga pembaca layar
   mengumumkan kolom tanpa nama. */
function Field({ label, htmlFor, children }: { label: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={htmlFor}>{label}</label>
      {children}
    </div>
  );
}

function TextField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        className="form-input font-mono"
        value={value}
        onChange={e => onChange(e.target.value)}
        spellCheck={false}
      />
    </Field>
  );
}

function NumField({
  label, value, onChange, min, max,
}: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <input
        id={id}
        className="form-input font-mono"
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={e => onChange(Number(e.target.value))}
      />
    </Field>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select id={id} className="form-select" value={value} onChange={e => onChange(e.target.value)}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </Field>
  );
}

/* Nilai (severity) dan label tampilan sengaja berbeda — 'informasi'
   dsb. dipakai luas sebagai nilai domain di seluruh aplikasi, sedangkan
   labelnya mengikuti istilah yang sudah dipakai di AlertsPage. */
function SeveritySelect({
  label, value, onChange,
}: { label: string; value: StationSettings['weatherMinSeverity']; onChange: (v: StationSettings['weatherMinSeverity']) => void }) {
  const { t } = useApp();
  const id = useId();
  return (
    <Field label={label} htmlFor={id}>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={e => onChange(e.target.value as StationSettings['weatherMinSeverity'])}
      >
        <option value="informasi">{t('Info')}</option>
        <option value="peringatan">{t('Peringatan')}</option>
        <option value="kritis">{t('Kritis')}</option>
      </select>
    </Field>
  );
}

function RefTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="kv-table" style={{ marginTop: 10 }}>
      <tbody>
        {rows.map(([k, v]) => (
          <tr key={k}>
            <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{k}</td>
            <td className="font-mono" style={{ textAlign: 'right', fontSize: 12 }}>{v}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* =================================================================== */
function GimbalTab({ s, set }: { s: StationSettings; set: Setter }) {
  const { t } = useApp();
  return (
    <div className="grid-2">
      <GlassCard tilt={false}>
        <div className="section-head"><Cctv size={15} /> {t('Payload Gimbal')}</div>

        <SelectField
          label={t('Model Gimbal')}
          value={s.gimbalModel}
          onChange={set('gimbalModel')}
          options={['Epsilon 140Z G2', 'Epsilon 140Z', 'Epsilon 140', 'Epsilon 140LC']}
        />

        <Field label={t('Jalur Kendali')}>
          <div className="seg" style={{ width: '100%' }}>
            <button
              className={s.controlPath === 'ethernet' ? 'on' : ''}
              onClick={() => set('controlPath')('ethernet')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {t('Ethernet / IP')}
            </button>
            <button
              className={s.controlPath === 'serial' ? 'on' : ''}
              onClick={() => set('controlPath')('serial')}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {t('Serial RS-422')}
            </button>
          </div>
        </Field>

        {s.controlPath === 'ethernet' ? (
          <div className="grid-2">
            <TextField label={t('Alamat IP Kamera')} value={s.cameraIp} onChange={set('cameraIp')} />
            <NumField label={t('Port Kendali')} value={s.controlPort} onChange={set('controlPort')} min={1} max={65535} />
          </div>
        ) : (
          <div className="grid-2">
            <SelectField
              label={t('COM Port')} value={s.comPort} onChange={set('comPort')}
              options={['COM3', 'COM4', '/dev/ttyUSB0']}
            />
            <SelectField
              label={t('Baudrate')} value={String(s.baudrate)}
              onChange={v => set('baudrate')(Number(v))}
              options={['9600', '19200', '38400', '57600', '115200']}
            />
          </div>
        )}

        <div className="grid-2">
          <NumField label={t('Batas Kecepatan Pan/Tilt (°/s)')} value={s.panTiltLimit} onChange={set('panTiltLimit')} min={1} max={60} />
          <NumField label={t('Dead-Zone Joystick')} value={s.joystickDeadzone} onChange={set('joystickDeadzone')} min={0} max={4000} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
          <Switch
            checked={s.autoConnect} onChange={set('autoConnect')}
            label={t('Sambung otomatis saat aplikasi dijalankan')}
          />
          <Switch
            checked={s.gyroStab} onChange={set('gyroStab')}
            label={t('Stabilisasi giroskop saat lepas landas')}
            hint={t('Mode STAB diaktifkan begitu balon meninggalkan tambatan')}
          />
        </div>
      </GlassCard>

      <GlassCard tilt={false}>
        <div className="section-head"><Gauge size={15} /> {t('Batas Operasi & Keselamatan')}</div>
        <p className="note-inline" style={{ marginTop: 0 }}>
          {t('Nilai berikut mengikuti batas rancangan platform dan tidak dapat diubah dari antarmuka operator.')}
        </p>
        <RefTable rows={[
          ['Ketinggian Maksimum', '600 m AGL'],
          ['Kecepatan Angin Maksimum', '35 km/h'],
          ['Tarikan Kabel Maksimum', '4.500 N'],
          ['Suhu Operasi', '−10 °C s.d. +50 °C'],
          ['Durasi Terbang Berkelanjutan', '72 jam'],
        ]} />
      </GlassCard>
    </div>
  );
}

/* =================================================================== */
function NetworkTab({ s, set }: { s: StationSettings; set: Setter }) {
  const { t } = useApp();
  return (
    <div className="grid-2">
      <GlassCard tilt={false}>
        <div className="section-head"><Network size={15} /> {t('Antarmuka Jaringan Lokal')}</div>
        <div className="grid-2">
          <TextField label={t('Alamat IP Stasiun')} value={s.stationIp} onChange={set('stationIp')} />
          <TextField label={t('Subnet Mask')} value={s.subnetMask} onChange={set('subnetMask')} />
          <TextField label={t('Gateway')} value={s.gateway} onChange={set('gateway')} />
          <NumField label={t('MTU')} value={s.mtu} onChange={set('mtu')} min={576} max={9000} />
        </div>
        <TextField label={t('URL Stream RTSP')} value={s.rtspUrl} onChange={set('rtspUrl')} />
        <TextField label={t('Endpoint Modbus TCP (Ground Winch)')} value={s.modbusEndpoint} onChange={set('modbusEndpoint')} />
      </GlassCard>

      <GlassCard tilt={false}>
        <div className="section-head"><Info size={15} /> {t('Kebijakan Isolasi Jaringan')}</div>
        <p className="note-inline" style={{ marginTop: 0 }}>
          {t('Stasiun beroperasi pada jaringan tertutup. Lalu lintas dibatasi pada segmen lokal dan tidak ada rute keluar yang dikonfigurasi.')}
        </p>
        <RefTable rows={[
          ['Mode Operasi', 'Air-gapped'],
          ['Rute Keluar', 'Tidak ada'],
          ['DNS Eksternal', 'Dinonaktifkan'],
          ['Sinkronisasi Waktu', 'GPS lokal'],
          ['Enkripsi Tautan', 'TLS 1.3 segmen internal'],
        ]} />
      </GlassCard>
    </div>
  );
}

/* =================================================================== */
function AiTab({ s, set }: { s: StationSettings; set: Setter }) {
  const { t } = useApp();
  return (
    <div className="grid-2">
      <GlassCard tilt={false}>
        <div className="section-head"><Cpu size={15} /> {t('Mesin Inferensi Lokal')}</div>

        <SelectField
          label={t('Perangkat Komputasi')} value={s.computeDevice} onChange={set('computeDevice')}
          options={['CUDA:0 — NVIDIA RTX 4090 Laptop (16 GB)', 'CPU (fallback)']}
        />
        <SelectField
          label={t('Runtime')} value={s.runtime} onChange={set('runtime')}
          options={['TensorRT FP16', 'ONNX Runtime', 'PyTorch Eager']}
        />

        <div className="grid-2">
          <SelectField
            label={t('Model Deteksi')} value={s.detectionModel} onChange={set('detectionModel')}
            options={['YOLOv8x', 'YOLOv8l', 'YOLOv8m']}
          />
          <SelectField
            label={t('Model Kepadatan')} value={s.densityModel} onChange={set('densityModel')}
            options={['CSRNet', 'DM-Count', 'MCNN']}
          />
        </div>

        <NumField label={t('Batas Antrean Frame')} value={s.frameQueue} onChange={set('frameQueue')} min={1} max={16} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
          <Switch
            checked={s.autoDownscale} onChange={set('autoDownscale')}
            label={t('Turunkan resolusi otomatis')}
            hint={t('Berlaku bila waktu inferensi melewati 40 ms per bingkai')}
          />
          <Switch
            checked={s.preloadVram} onChange={set('preloadVram')}
            label={t('Muat model ke VRAM saat aplikasi dijalankan')}
          />
        </div>
      </GlassCard>

      <GlassCard tilt={false}>
        <div className="section-head"><Gauge size={15} /> {t('Target Performa')}</div>
        <p className="note-inline" style={{ marginTop: 0 }}>
          {t('Angka acuan pada perangkat keras yang terpasang di stasiun. Bila target tidak tercapai, resolusi inferensi diturunkan lebih dulu sebelum laju bingkai.')}
        </p>
        <RefTable rows={[
          ['Deteksi Objek 1080p', '≤ 35 ms/bingkai'],
          ['Estimasi Kepadatan', '≤ 45 ms/bingkai'],
          ['Peningkatan Citra', '≤ 20 ms/bingkai'],
          ['Laju Bingkai Keluaran', '≥ 25 fps'],
          ['Utilisasi VRAM Puncak', '≤ 12 GB'],
        ]} />
      </GlassCard>
    </div>
  );
}

/* =================================================================== */
function AppearanceTab({
  s, set, theme, toggleTheme,
}: { s: StationSettings; set: Setter; theme: string; toggleTheme: () => void }) {
  const { account, lang, setLang, t } = useApp();

  return (
    <div className="grid-2">
      {/* <GlassCard tilt={false}>
        <div className="section-head"><Languages size={15} /> {t('Bahasa Antarmuka')}</div>
        <div className="seg" style={{ width: '100%', marginBottom: 12 }}>
          {LANGUAGES.map(l => (
            <button
              key={l.id}
              className={lang === l.id ? 'on' : ''}
              onClick={() => setLang(l.id)}
              style={{ flex: 1, justifyContent: 'center' }}
            >
              {l.native}
            </button>
          ))}
        </div>
        <p className="note-inline" style={{ marginTop: 0 }}>
          {t('Seluruh teks antarmuka mengikuti pilihan ini. Terjemahan tersimpan di dalam aplikasi, jadi tetap tersedia tanpa jaringan.')}
        </p>
      </GlassCard> */}

      <GlassCard tilt={false}>
        <div className="section-head"><Palette size={15} /> {t('Tema Antarmuka')}</div>
        <p className="note-inline" style={{ marginTop: 0, marginBottom: 12 }}>
          {t('Tema gelap dirancang untuk ruang kendali redup; tema terang menaikkan kontras di bawah cahaya matahari langsung. Pilihan tema berlaku seketika dan tersimpan terpisah dari konfigurasi stasiun.')}
        </p>
        <div className="seg" style={{ width: '100%', marginBottom: 14 }}>
          <button
            className={theme === 'dark' ? 'on' : ''}
            onClick={() => { if (theme !== 'dark') toggleTheme(); }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Moon size={13} /> Tactical Dark
          </button>
          <button
            className={theme === 'light' ? 'on' : ''}
            onClick={() => { if (theme !== 'light') toggleTheme(); }}
            style={{ flex: 1, justifyContent: 'center' }}
          >
            <Sun size={13} /> Daylight High-Contrast
          </button>
        </div>

        <SelectField
          label={t('Zona Waktu Tampilan')} value={s.timezone} onChange={set('timezone')}
          options={[
            'UTC+07:00 — Waktu Indonesia Barat',
            'UTC+08:00 — WITA',
            'UTC+09:00 — WIT',
            'UTC±00:00 — Zulu',
          ]}
        />
        {/* <SelectField
          label={t('Format Koordinat')} value={s.coordFormat} onChange={set('coordFormat')}
          options={['Desimal (−6.208800°)', 'DMS (6°12′31.7″S)', 'MGRS']}
        /> */}
        {/* <SelectField
          label={t('Satuan Jarak')} value={s.distanceUnit} onChange={set('distanceUnit')}
          options={['Metrik (m / km)', 'Nautical (NM)']}
        /> */}
      </GlassCard>

      <GlassCard tilt={false}>
        <div className="section-head"><ShieldCheck size={15} /> {t('Profil Operator')}</div>
        <RefTable rows={[
          ['Nama', account?.fullName ?? '—'],
          ['Peran', account?.role ?? '—'],
          ['Stasiun', account?.station ?? '—'],
          ['Lokasi Penempatan', account?.siteName ?? '—'],
        ]} />
        <p className="note-inline">
          {t('Perubahan data operator dilakukan pada halaman User Management oleh pemegang peran Administrator.')}
        </p>
      </GlassCard>
    </div>
  );
}

/* =================================================================== */
function NotificationsTab({ s, set }: { s: StationSettings; set: Setter }) {
  const { t } = useApp();
  return (
    <div className="grid-2">
      <GlassCard tilt={false}>
        <div className="section-head"><CloudSun size={15} /> {t('Pemantauan Cuaca Misi')}</div>
        <p className="note-inline" style={{ marginTop: 0 }}>
          {t('Setiap misi berstatus Flight dicek cuacanya secara berkala; hasilnya masuk ke Pusat Notifikasi dan, bila cukup penting, muncul sebagai toast.')}
        </p>

        <Switch
          checked={s.weatherAlertsEnabled} onChange={set('weatherAlertsEnabled')}
          label={t('Aktifkan pemantauan cuaca misi')}
        />

        <div className="grid-2" style={{ marginTop: 10 }}>
          <NumField
            label={t('Frekuensi Cek Cuaca (menit)')}
            value={s.weatherCheckIntervalMin}
            onChange={set('weatherCheckIntervalMin')}
            min={1} max={180}
          />
          <SeveritySelect
            label={t('Tingkat Minimum Notifikasi Cuaca')}
            value={s.weatherMinSeverity}
            onChange={set('weatherMinSeverity')}
          />
        </div>
      </GlassCard>

      <GlassCard tilt={false}>
        <div className="section-head"><Bell size={15} /> {t('Pusat Notifikasi')}</div>
        <p className="note-inline" style={{ marginTop: 0 }}>
          {t('Selang waktu aplikasi menyinkronkan lonceng notifikasi dengan server.')}
        </p>
        <NumField
          label={t('Frekuensi Sinkronisasi (detik)')}
          value={s.notifSyncIntervalSec}
          onChange={set('notifSyncIntervalSec')}
          min={10} max={600}
        />
      </GlassCard>
    </div>
  );
}

/* =================================================================== */
function DataTab({ s, set }: { s: StationSettings; set: Setter }) {
  const { pushToast, notify, t } = useApp();

  const maintenance = (title: string, detail: string) => {
    pushToast({ tone: 'success', title, detail });
    notify({
      title,
      detail,
      severity: 'informasi',
      category: 'Sistem',
      source: 'System Settings',
      page: 'settings',
      silent: true,
    });
  };

  return (
    <div className="grid-2">
      {/* Kebijakan Retensi Media — belum digunakan, dinonaktifkan sementara.
      <GlassCard tilt={false}>
        <div className="section-head"><HardDriveDownload size={15} /> {t('Kebijakan Retensi')}</div>
        <div className="grid-2">
          <NumField label={t('Rekaman Video (hari)')} value={s.retainVideo} onChange={set('retainVideo')} min={1} max={3650} />
          <NumField label={t('Snapshot Citra (hari)')} value={s.retainImage} onChange={set('retainImage')} min={1} max={3650} />
          <NumField label={t('Log Telemetri (hari)')} value={s.retainTelemetry} onChange={set('retainTelemetry')} min={1} max={3650} />
          <NumField label={t('Audit Trail (hari)')} value={s.retainAudit} onChange={set('retainAudit')} min={1} max={3650} />
        </div>

        <TextField label={t('Direktori Penyimpanan')} value={s.storageDir} onChange={set('storageDir')} />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 6 }}>
          <Switch
            checked={s.encryptMedia} onChange={set('encryptMedia')}
            label={t('Enkripsi AES-256 pada seluruh berkas media')}
          />
          <Switch
            checked={s.autoPurge} onChange={set('autoPurge')}
            label={t('Hapus otomatis saat kapasitas tersisa di bawah 10%')}
            hint={t('Berkas terlama dihapus lebih dulu, kecuali yang ditandai sebagai bukti')}
          />
        </div>
      </GlassCard>
      */}

      <GlassCard tilt={false}>
        <div className="section-head"><RotateCcw size={15} /> {t('Pemeliharaan Sistem')}</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <button
            className="btn btn-secondary btn-sm w-full"
            onClick={() => maintenance('Indeks media disusun ulang', 'Katalog dipindai dan entri yatim dibersihkan.')}
          >
            {t('Susun Ulang Indeks Media')}
          </button>
          <button
            className="btn btn-secondary btn-sm w-full"
            onClick={() => maintenance('Berkas sementara dibersihkan', 'Ruang penyimpanan dikembalikan ke kumpulan bebas.')}
          >
            {t('Bersihkan Berkas Sementara')}
          </button>
          <button
            className="btn btn-secondary btn-sm w-full"
            onClick={() => maintenance('Cadangan konfigurasi dibuat', `Salinan pengaturan disimpan ke ${s.storageDir}\\config.`)}
          >
            {t('Buat Cadangan Konfigurasi')}
          </button>
        </div>

        <p className="note-inline">
          {t('Seluruh tindakan pemeliharaan tercatat pada Audit Trail beserta identitas operator yang menjalankannya.')}
        </p>
      </GlassCard>
    </div>
  );
}
