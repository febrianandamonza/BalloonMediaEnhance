'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import LicenseGate from '../../components/LicenseGate';
import GlassCard from '../../components/GlassCard';
import { useApp, useNavGuard } from '../../context';
import {
  PageHead, Metric, MetricRow, SectionHead, KVList,
  Sparkline, EmptyState, Segmented, Bar,
  ConfigSelect,
} from '../../components/ui';
import { salinTeks } from '../../lib/clipboard';
import { fullTimestamp } from '../../lib/notifications';
import { CompareSlider, VideoCompare } from '../../components/media';
import api, {
  API_BASE_MEDIA, type FlightMissionRecord, type FlightInformationRecord,
  type EnhanceImageResult, type EnhanceVideoResult,
  type TetherCableMonitorPayload, type TetherCableMonitorRecord,
  type TetherCableApiLogRecord,
} from '../../services/api';
import {
  Wand2, Image as ImageIcon, SlidersHorizontal, Save,
  RefreshCw, Clapperboard, Palette, Camera, Thermometer,
  PlugZap, Cable, Activity, Zap, Gauge, ShieldCheck, Copy,
  KeyRound, Plus, TerminalSquare, Waves, CircuitBoard, AlertTriangle, X, Eye,
} from 'lucide-react';

/** "01:42:07" dari durasi milidetik — dipakai total durasi sesi live
    tether-cable-api (gabungan yang sudah berhenti + yang masih berjalan). */
function formatDurationHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* Deret deterministik untuk grafik tren. */
function series(seed: number, len: number, base: number, spread: number, digits = 0) {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    const v = base + ((s / 2147483647) - 0.5) * spread;
    out.push(Number(v.toFixed(digits)));
  }
  return out;
}

/* =====================================================================
   1.2a — DIGITAL IMAGING ENHANCEMENT
   ===================================================================== */
const IMAGE_FILTERS = [
  { id: 'clahe', label: 'CLAHE', desc: 'Contrast Limited Adaptive Histogram Equalization — menaikkan kontras lokal tanpa membakar sorotan.' },
  { id: 'lap', label: 'Laplacian', desc: 'Penajaman tepi untuk memperjelas kontur bangunan dan kendaraan.' },
  { id: 'unsharp', label: 'Unsharp Mask', desc: 'Penajaman berbasis selisih blur — efektif pada citra sedikit kabur.' },
  { id: 'dehaze', label: 'Dehaze', desc: 'Pengurangan kabut atmosferik pada pengambilan jarak jauh.' },
] as const;

type FilterId = typeof IMAGE_FILTERS[number]['id'];

export function ImageEnhancementPage() {
  const { pushToast, notify, t } = useApp();
  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<EnhanceImageResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [filter, setFilter] = useState<FilterId>('clahe');
  const [strength, setStrength] = useState(55);
  const [blend, setBlend] = useState(80);
  const [denoise, setDenoise] = useState<'off' | 'low' | 'medium' | 'high'>('low');
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  useNavGuard(
    busy || saving,
    t('Proses enhancement citra sedang berjalan. Meninggalkan halaman ini akan membatalkan proses dan hasil yang belum disimpan akan hilang.'),
  );

  /* Enhancement harus dikaitkan ke satu flight mission — dimuat sekali di
     awal supaya operator wajib memilihnya sebelum "Terapkan" bisa dipakai.
     Misi dengan mission_status.name "Flight" atau "Done" yang relevan di sini.
     /flight-information dimuat sekalian untuk mencari id-nya lewat
     pencocokan mission_id — endpoint /media butuh id flight_information,
     bukan id flight_missions. */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getFlightMissions().catch(() => []),
      api.getFlightInformation().catch(() => []),
    ]).then(([missionRows, infoRows]) => {
      if (cancelled) return;
      const flightOnly = missionRows.filter(m => {
        const status = m.mission_status;
        const name = typeof status === 'string' ? status : status?.name;
        return name === 'Flight' || name === 'Done';
      });
      setMissions(flightOnly);
      setFlightInfoRecords(infoRows);
    }).finally(() => { if (!cancelled) setMissionsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const flightInfoId = useMemo(
    () => flightInfoRecords.find(i => String(i.mission_id) === missionId)?.id ?? null,
    [flightInfoRecords, missionId],
  );

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(jpe?g|png|tiff?)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: 'Format tidak didukung', detail: 'Gunakan berkas JPG, PNG, atau TIFF.' });
      notify({
        title: 'Format tidak didukung',
        detail: 'Gunakan berkas JPG, PNG, atau TIFF.',
        severity: 'peringatan',
        category: 'Media',
        source: 'Imaging Enhancement',
        page: 'enhance-image',
        silent: true,
      });
      return;
    }
    setFile({ name: f.name, url: URL.createObjectURL(f), raw: f });
    setApplied(false);
    /* Upload citra baru membatalkan hasil enhancement sebelumnya — variabel
       ditampung dari respons /enhance/image ini harus ikut ter-reset. */
    setEnhanceResult(null);
  };

  const apply = async () => {
    if (!file || !missionId || busy) return;
    setBusy(true);
    try {
      const result = await api.enhanceImage(file.raw);
      setEnhanceResult(result);
      setApplied(true);
      pushToast({
        tone: 'success',
        title: t('Penajaman diterapkan'),
        detail: `${result.processing_type} · ${result.processing_time} ms`,
      });
      notify({
        title: t('Penajaman diterapkan'),
        detail: `${result.processing_type} · ${result.processing_time} ms`,
        severity: 'informasi',
        category: 'Media',
        source: 'Imaging Enhancement',
        page: 'enhance-image',
        silent: true,
      });
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menerapkan enhancement'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
      notify({
        title: t('Gagal menerapkan enhancement'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Media',
        source: 'Imaging Enhancement',
        page: 'enhance-image',
        silent: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const saveMedia = async () => {
    if (!enhanceResult || !missionId || saving) return;
    if (flightInfoId == null) {
      pushToast({
        tone: 'error',
        title: t('Flight mission belum punya data flight information'),
        detail: t('Tidak ditemukan flight-information untuk misi ini. Lengkapi datanya di modul Flight Information dahulu.'),
      });
      notify({
        title: t('Flight mission belum punya data flight information'),
        detail: t('Tidak ditemukan flight-information untuk misi ini. Lengkapi datanya di modul Flight Information dahulu.'),
        severity: 'peringatan',
        category: 'Media',
        source: 'Imaging Enhancement',
        page: 'enhance-image',
        silent: true,
      });
      return;
    }
    setSaving(true);
    try {
      await api.createMedia({
        flight_information_id: flightInfoId,
        temp_path: enhanceResult.temp_path,
        processing_type: enhanceResult.processing_type,
      });
      pushToast({
        tone: 'success',
        title: t('Citra hasil olahan disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; citra asli tetap utuh.'),
      });
      notify({
        title: t('Citra hasil olahan disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; citra asli tetap utuh.'),
        severity: 'informasi',
        category: 'Media',
        source: 'Imaging Enhancement',
        page: 'enhance-image',
        silent: true,
      });
      /* Simpan menutup satu siklus enhancement — semua state dikembalikan
         ke awal supaya operator mulai bersih untuk citra berikutnya. */
      setFile(null);
      setEnhanceResult(null);
      setApplied(false);
      setMissionId('');
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
      notify({
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Media',
        source: 'Imaging Enhancement',
        page: 'enhance-image',
        silent: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <LicenseGate moduleCode="1.2a" moduleName="Digital Imaging Enhancement">
      <div className="animate-fade-in">
        <PageHead
          icon={<Wand2 size={22} />}
          title={t('Digital Imaging Enhancement')}
          code="1.2a"
          description={t('Peningkatan kualitas citra statis: kontras, ketajaman, dan reduksi derau.')}
          actions={
            <>
              <button
                className="btn btn-secondary"
                disabled={!applied || saving}
                onClick={saveMedia}
              >
                {saving
                  ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan…')}</>
                  : <><Save size={15} /> {t('Simpan Media')}</>}
              </button>
              <button className="btn btn-primary" onClick={apply} disabled={!file || !missionId || busy}>
                {busy ? <><RefreshCw size={15} className="spin" /> {t('Memproses…')}</> : <><Wand2 size={15} /> {t('Terapkan')}</>}
              </button>
            </>
          }
        />

        <input ref={inputRef} type="file" accept=".jpg,.jpeg,.png,.tif,.tiff" hidden onChange={e => pick(e.target.files?.[0])} />

        <GlassCard tilt={false} style={{ marginBottom: 14 }}>
          <SectionHead icon={<Wand2 size={15} />} title={t('Flight Mission')} sub={t('Wajib dipilih sebelum enhancement dapat diterapkan')} />
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-input"
              value={missionId}
              onChange={e => setMissionId(e.target.value)}
              disabled={missionsLoading}
            >
              <option value="">{missionsLoading ? t('Memuat misi…') : t('— Pilih flight mission —')}</option>
              {missions.map(m => (
                <option key={String(m.id)} value={String(m.id)}>
                  {m.mission_code ? `${m.mission_code} — ${m.mission_name ?? ''}` : (m.mission_name ?? String(m.id))}
                </option>
              ))}
            </select>
            {!missionId && !missionsLoading && (
              <p style={{ fontSize: 11, color: 'var(--warning-400)', marginTop: 6 }}>
                {t('Pilih flight mission terkait terlebih dahulu — tombol Terapkan aktif setelah ini terisi.')}
              </p>
            )}
          </div>
        </GlassCard>

        <GlassCard tilt={false} style={{ marginBottom: 14 }}>
          <SectionHead
            icon={<ImageIcon size={15} />}
            title={file ? 'Citra Unggahan' : 'Hasil Peningkatan'}
            sub={file
              ? `${file.name} · ${enhanceResult ? `${enhanceResult.processing_type} · ${enhanceResult.processing_time} ms` : 'belum diterapkan'}`
              : 'Muat citra dan terapkan penajaman untuk melihat hasil'}
            right={file && (
              <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
                {t('Hapus Citra')}
              </button>
            )}
          />

          {file && enhanceResult ? (
            <CompareSlider labelBefore={t('Asli')} labelAfter={t('Hasil Olahan')} aspect="16 / 9">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={file.url} alt="Citra asli" />
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={enhanceResult.preview_url.startsWith('http') ? enhanceResult.preview_url : `${API_BASE_MEDIA}${enhanceResult.preview_url}`}
                alt="Hasil peningkatan"
              />
            </CompareSlider>
          ) : file ? (
            <div className="cmp" style={{ aspectRatio: '16 / 9' }}>
              <div className="cmp-layer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={file.url} alt="Citra asli" />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<ImageIcon size={22} />}
              title={t('Belum ada citra ditingkatkan')}
              description={t('Muat citra, pilih flight mission, lalu terapkan penajaman untuk melihat hasil perbandingan.')}
            />
          )}

          <div
            className={`uploader ${drag ? 'drag' : ''}`}
            style={{ marginTop: 12 }}
            onClick={() => inputRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
            role="button"
            tabIndex={0}
            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
          >
            <span className="uploader-ring"><ImageIcon size={22} /></span>
            <span className="uploader-copy">
              <span className="uploader-title">{t('Tingkatkan citra lain')}</span>
              <span className="uploader-sub">{t('JPG, PNG, atau TIFF · maksimum 50 MB')}</span>
            </span>
            <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
          </div>
        </GlassCard>

        <div className="grid-2" style={{ visibility: 'hidden' }}>
          <GlassCard tilt={false}>
            <SectionHead icon={<SlidersHorizontal size={15} />} title={t('Kendali Penajaman')} />

            <div className="form-group">
              <label className="form-label">{t('Algoritma')}</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {IMAGE_FILTERS.map(f => (
                  <button
                    key={f.id}
                    className={`chip-btn ${filter === f.id ? 'on' : ''}`}
                    onClick={() => { setFilter(f.id); setApplied(false); }}
                    title={f.desc}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.55 }}>
                {IMAGE_FILTERS.find(f => f.id === filter)?.desc}
              </p>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label" htmlFor="enh-kekuatan">Kekuatan — {strength}%</label>
                <input id="enh-kekuatan" type="range" min={0} max={100} value={strength} onChange={e => setStrength(Number(e.target.value))} style={rangeStyle} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="enh-blend">Blend Hasil — {blend}%</label>
                <input id="enh-blend" type="range" min={0} max={100} value={blend} onChange={e => setBlend(Number(e.target.value))} style={rangeStyle} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">{t('Bilateral Denoising')}</label>
              <Segmented
                full
                value={denoise}
                options={[
                  { id: 'off', label: 'Nonaktif' }, { id: 'low', label: 'Rendah' },
                  { id: 'medium', label: 'Sedang' }, { id: 'high', label: 'Tinggi' },
                ]}
                onChange={setDenoise}
              />
            </div>

            <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={!applied}
                onClick={() => {
                  pushToast({
                    tone: 'success',
                    title: 'Citra hasil olahan disimpan',
                    detail: 'Berkas baru ditambahkan ke katalog Surveillance Media; citra asli tetap utuh.',
                  });
                  notify({
                    title: 'Citra hasil olahan disimpan',
                    detail: 'Berkas baru ditambahkan ke katalog Surveillance Media; citra asli tetap utuh.',
                    severity: 'informasi',
                    category: 'Media',
                    source: 'Imaging Enhancement',
                    page: 'enhance-image',
                    silent: true,
                  });
                }}
              >
                <Save size={13} /> Simpan Hasil
              </button>
              <button className="btn btn-secondary btn-sm" onClick={() => { setStrength(55); setBlend(80); setDenoise('low'); setApplied(false); }}>
                <RefreshCw size={13} /> Kembalikan Default
              </button>
            </div>
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<Activity size={15} />} title={t('Metrik Kualitas')} sub={applied ? 'Hasil pengukuran terhadap citra asli' : 'Tersedia setelah penajaman diterapkan'} />
            {applied ? (
              <>
                <Bar label={t('Peningkatan kontras (RMS)')} value={42} unit="%" color="var(--accent-primary)" foot={t('Terhadap histogram citra asli')} />
                <Bar label={t('Ketajaman tepi (Laplacian variance)')} value={68} unit="%" color="var(--accent-secondary)" foot={t('Semakin tinggi, semakin tegas kontur')} />
                <Bar label={t('Rasio sinyal terhadap derau')} value={31} unit="dB" max={50} color="var(--accent-emerald)" foot={t('Setelah bilateral denoising')} />
                <MetricRow cols={3}>
                  <Metric label={t('Waktu Proses')} value="72 ms" foot={t('CUDA')} />
                  <Metric label={t('Resolusi')} value="1920×1080" foot={t('dipertahankan')} />
                  <Metric label={t('Bit Depth')} value="8-bit" foot={t('per kanal')} />
                </MetricRow>
              </>
            ) : (
              <EmptyState
                icon={<Wand2 size={22} />}
                title={t('Belum ada hasil untuk diukur')}
                description={t('Muat citra dan terapkan algoritma penajaman untuk melihat perbandingan metrik kualitas.')}
              />
            )}
          </GlassCard>
        </div>
      </div>
    </LicenseGate>
  );
}

const rangeStyle: React.CSSProperties = { width: '100%', accentColor: 'var(--accent-primary)' };

/* =====================================================================
   1.2b — DIGITAL VIDEO ENHANCEMENT
   ===================================================================== */
/* Palet false color sesuai Epsilon Manual §5.7.3 — 22 pilihan. */
const PALETTES: { id: string; label: string; from: string; to: string; mid?: string }[] = [
  { id: 'whitehot', label: 'White Hot', from: '#000000', to: '#ffffff' },
  { id: 'blackhot', label: 'Black Hot', from: '#ffffff', to: '#000000' },
  { id: 'rainbow', label: 'Rainbow', from: '#3b0764', mid: '#22c55e', to: '#ef4444' },
  { id: 'rainbowhc', label: 'Rainbow HC', from: '#1e1b4b', mid: '#06b6d4', to: '#fbbf24' },
  { id: 'iron', label: 'Iron', from: '#000000', mid: '#b91c1c', to: '#fde68a' },
  { id: 'iron256', label: 'Iron 256', from: '#0c0a09', mid: '#c2410c', to: '#fef3c7' },
  { id: 'ironhc', label: 'Iron HC', from: '#000000', mid: '#dc2626', to: '#ffffff' },
  { id: 'hotcold', label: 'Hot / Cold', from: '#1d4ed8', mid: '#0f172a', to: '#dc2626' },
  { id: 'hotmetal', label: 'Hot Metal', from: '#000000', mid: '#ea580c', to: '#fef08a' },
  { id: 'jet', label: 'Jet', from: '#000080', mid: '#22d3ee', to: '#7f1d1d' },
  { id: 'icefire', label: 'IceFire', from: '#0ea5e9', mid: '#0f172a', to: '#f97316' },
  { id: 'sepia', label: 'Sepia', from: '#1c1917', mid: '#92400e', to: '#fde68a' },
  { id: 'ocean', label: 'Ocean', from: '#020617', mid: '#0369a1', to: '#67e8f9' },
  { id: 'amber', label: 'Amber', from: '#0c0a09', mid: '#b45309', to: '#fcd34d' },
  { id: 'green', label: 'Green Hot', from: '#022c22', mid: '#16a34a', to: '#bbf7d0' },
  { id: 'hsv', label: 'HSV', from: '#ef4444', mid: '#22c55e', to: '#3b82f6' },
  { id: 'globow', label: 'Globow', from: '#000000', mid: '#a855f7', to: '#fde047' },
  { id: 'midgreen', label: 'Mid Green', from: '#052e16', mid: '#4ade80', to: '#f0fdf4' },
  { id: 'midgrey', label: 'Mid Grey', from: '#111827', mid: '#9ca3af', to: '#f9fafb' },
  { id: 'lava', label: 'Lava', from: '#0c0a09', mid: '#dc2626', to: '#fbbf24' },
  { id: 'arctic', label: 'Arctic', from: '#020617', mid: '#38bdf8', to: '#f0f9ff' },
  { id: 'isotherm', label: 'Isotherm', from: '#1e293b', mid: '#22c55e', to: '#dc2626' },
];

export function VideoEnhancementPage() {
  const { pushToast, notify, t } = useApp();
  const [palette, setPalette] = useState('whitehot');
  const [mode, setMode] = useState<'fast' | 'quality'>('quality');
  const [denoise, setDenoise] = useState(20);
  const [contrast, setContrast] = useState(15);
  const [sharpness, setSharpness] = useState(20);

  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [enhanceResult, setEnhanceResult] = useState<EnhanceVideoResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [applied, setApplied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  useNavGuard(
    busy || saving,
    t('Proses enhancement video sedang berjalan. Meninggalkan halaman ini akan membatalkan proses dan hasil yang belum disimpan akan hilang.'),
  );

  /* Sama seperti ImageEnhancementPage — enhancement harus dikaitkan ke satu
     flight mission (yang mission_status.name "Flight" atau "Done"), dan
     flight-information dimuat sekalian untuk resolusi flight_information_id
     saat menyimpan ke /media. */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getFlightMissions().catch(() => []),
      api.getFlightInformation().catch(() => []),
    ]).then(([missionRows, infoRows]) => {
      if (cancelled) return;
      const flightOnly = missionRows.filter(m => {
        const status = m.mission_status;
        const name = typeof status === 'string' ? status : status?.name;
        return name === 'Flight' || name === 'Done';
      });
      setMissions(flightOnly);
      setFlightInfoRecords(infoRows);
    }).finally(() => { if (!cancelled) setMissionsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const flightInfoId = useMemo(
    () => flightInfoRecords.find(i => String(i.mission_id) === missionId)?.id ?? null,
    [flightInfoRecords, missionId],
  );

  const current = PALETTES.find(p => p.id === palette)!;

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(mp4|mov|avi|mkv|webm|ts)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: 'Format tidak didukung', detail: 'Gunakan berkas MP4, MOV, AVI, MKV, TS atau WEBM.' });
      notify({
        title: 'Format tidak didukung',
        detail: 'Gunakan berkas MP4, MOV, AVI, MKV, TS atau WEBM.',
        severity: 'peringatan',
        category: 'Media',
        source: 'Video Enhancement',
        page: 'enhance-video',
        silent: true,
      });
      return;
    }
    setFile({ name: f.name, url: URL.createObjectURL(f), raw: f });
    setApplied(false);
    setEnhanceResult(null);
  };

  const apply = async () => {
    if (!file || !missionId || busy) return;
    setBusy(true);
    try {
      const result = await api.enhanceVideo(file.raw, { denoise, contrast, sharpness, mode });
      setEnhanceResult(result);
      setApplied(true);
      pushToast({
        tone: 'success',
        title: t('Peningkatan diterapkan'),
        detail: `${result.processing_type} · ${result.processing_time} ms`,
      });
      notify({
        title: t('Peningkatan diterapkan'),
        detail: `${result.processing_type} · ${result.processing_time} ms`,
        severity: 'informasi',
        category: 'Media',
        source: 'Video Enhancement',
        page: 'enhance-video',
        silent: true,
      });
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menerapkan enhancement'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
      notify({
        title: t('Gagal menerapkan enhancement'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Media',
        source: 'Video Enhancement',
        page: 'enhance-video',
        silent: true,
      });
    } finally {
      setBusy(false);
    }
  };

  const saveMedia = async () => {
    if (!enhanceResult || !missionId || saving) return;
    if (flightInfoId == null) {
      pushToast({
        tone: 'error',
        title: t('Flight mission belum punya data flight information'),
        detail: t('Tidak ditemukan flight-information untuk misi ini. Lengkapi datanya di modul Flight Information dahulu.'),
      });
      notify({
        title: t('Flight mission belum punya data flight information'),
        detail: t('Tidak ditemukan flight-information untuk misi ini. Lengkapi datanya di modul Flight Information dahulu.'),
        severity: 'peringatan',
        category: 'Media',
        source: 'Video Enhancement',
        page: 'enhance-video',
        silent: true,
      });
      return;
    }
    setSaving(true);
    try {
      await api.createMedia({
        flight_information_id: flightInfoId,
        temp_path: enhanceResult.temp_path,
        processing_type: enhanceResult.processing_type,
      });
      pushToast({
        tone: 'success',
        title: t('Video hasil olahan disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; video asli tetap utuh.'),
      });
      notify({
        title: t('Video hasil olahan disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; video asli tetap utuh.'),
        severity: 'informasi',
        category: 'Media',
        source: 'Video Enhancement',
        page: 'enhance-video',
        silent: true,
      });
      setFile(null);
      setEnhanceResult(null);
      setApplied(false);
      setMissionId('');
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
      notify({
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Media',
        source: 'Video Enhancement',
        page: 'enhance-video',
        silent: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const previewUrl = enhanceResult
    ? (enhanceResult.preview_url.startsWith('http') ? enhanceResult.preview_url : `${API_BASE_MEDIA}${enhanceResult.preview_url}`)
    : '';

  return (
    <LicenseGate moduleCode="1.2b" moduleName="Digital Video Enhancement">
      <div className="animate-fade-in">
        <PageHead
          icon={<Clapperboard size={22} />}
          title={t('Digital Video Enhancement')}
          code="1.2b"
          description={t('Peningkatan video perekaman.')}
          actions={
            <>
              <button className="btn btn-secondary" disabled={!applied || saving} onClick={saveMedia}>
                {saving
                  ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan…')}</>
                  : <><Save size={15} /> {t('Simpan Media')}</>}
              </button>
              <button className="btn btn-primary" onClick={apply} disabled={!file || !missionId || busy}>
                {busy ? <><RefreshCw size={15} className="spin" /> {t('Memproses…')}</> : <><Wand2 size={15} /> {t('Terapkan')}</>}
              </button>
            </>
          }
        />

        <input ref={inputRef} type="file" accept=".mp4,.mov,.avi,.mkv,.webm,.ts" hidden onChange={e => pick(e.target.files?.[0])} />

        <GlassCard tilt={false} style={{ marginBottom: 14 }}>
          <SectionHead icon={<Clapperboard size={15} />} title={t('Flight Mission')} sub={t('Wajib dipilih sebelum enhancement dapat diterapkan')} />
          <div className="form-group" style={{ marginBottom: 0 }}>
            <select
              className="form-input"
              value={missionId}
              onChange={e => setMissionId(e.target.value)}
              disabled={missionsLoading}
            >
              <option value="">{missionsLoading ? t('Memuat misi…') : t('— Pilih flight mission —')}</option>
              {missions.map(m => (
                <option key={String(m.id)} value={String(m.id)}>
                  {m.mission_code ? `${m.mission_code} — ${m.mission_name ?? ''}` : (m.mission_name ?? String(m.id))}
                </option>
              ))}
            </select>
            {!missionId && !missionsLoading && (
              <p style={{ fontSize: 11, color: 'var(--warning-400)', marginTop: 6 }}>
                {t('Pilih flight mission terkait terlebih dahulu — tombol Terapkan aktif setelah ini terisi.')}
              </p>
            )}
          </div>
        </GlassCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead
                icon={<Clapperboard size={15} />}
                title={file ? 'Video Unggahan' : 'Hasil Peningkatan'}
                sub={file
                  ? `${file.name} · ${enhanceResult ? `${enhanceResult.processing_type} · ${enhanceResult.processing_time} ms` : 'belum diterapkan'}`
                  : 'Muat video dan terapkan peningkatan untuk melihat hasil'}
                right={file && (
                  <button className="btn btn-ghost btn-sm" onClick={() => setFile(null)}>
                    {t('Hapus Video')}
                  </button>
                )}
              />

              {file && enhanceResult ? (
                <VideoCompare
                  before={file.url}
                  after={previewUrl}
                  labelBefore={t('Asli')}
                  labelAfter={t('Hasil Olahan')}
                  aspect="16 / 9"
                />
              ) : file ? (
                <div className="cmp" style={{ aspectRatio: '16 / 9' }}>
                  <div className="cmp-layer">
                    {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
                    <video src={file.url} muted loop autoPlay playsInline controls style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<Clapperboard size={22} />}
                  title={t('Belum ada video ditingkatkan')}
                  description={t('Muat video, pilih flight mission, lalu terapkan peningkatan untuk melihat hasil perbandingan.')}
                />
              )}

              {/* Lapisan palet aktif ditumpangkan agar pilihan false color
                  terlihat langsung pada rekaman yang sedang diputar. */}
              <div
                aria-hidden
                style={{
                  height: 6, marginTop: 10, borderRadius: 999,
                  background: `linear-gradient(90deg, ${current.from}, ${current.mid ?? current.from} 50%, ${current.to})`,
                  transition: 'background 0.35s ease',
                }}
              />
              <p className="note-inline" style={{ marginTop: 8 }}>
                Palet aktif: <b style={{ color: 'var(--text-secondary)' }}>{current.label}</b> — dipakai
                saat kanal termal dipetakan ke warna pada keluaran stream.
              </p>

              <div
                className={`uploader ${drag ? 'drag' : ''}`}
                style={{ marginTop: 12 }}
                onClick={() => inputRef.current?.click()}
                onDragOver={e => { e.preventDefault(); setDrag(true); }}
                onDragLeave={() => setDrag(false)}
                onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                role="button"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
              >
                <span className="uploader-ring"><Clapperboard size={22} /></span>
                <span className="uploader-copy">
                  <span className="uploader-title">{t('Tingkatkan video lain')}</span>
                  <span className="uploader-sub">{t('MP4, MOV, AVI, TS, atau MKV · maksimum 200 MB')}</span>
                </span>
                <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
              </div>
            </GlassCard>


          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Thermometer size={15} />} title={t('Pengaturan Peningkatan')} />

              <div className="form-group" style={{ marginTop: 8 }}>
                <label className="form-label">{t('Mode Pemrosesan')}</label>
                <Segmented
                  full
                  value={mode}
                  options={[
                    { id: 'fast', label: 'Fast', icon: <Zap size={13} /> },
                    { id: 'quality', label: 'Quality', icon: <ShieldCheck size={13} /> },
                  ]}
                  onChange={setMode}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="vid-denoise">Denoise — {denoise}%</label>
                <input id="vid-denoise" type="range" min={0} max={100} value={denoise} onChange={e => setDenoise(Number(e.target.value))} style={rangeStyle} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="vid-contrast">Contrast — {contrast}%</label>
                <input id="vid-contrast" type="range" min={0} max={100} value={contrast} onChange={e => setContrast(Number(e.target.value))} style={rangeStyle} />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="vid-sharpness">Sharpness — {sharpness}%</label>
                <input id="vid-sharpness" type="range" min={0} max={100} value={sharpness} onChange={e => setSharpness(Number(e.target.value))} style={rangeStyle} />
              </div>
            </GlassCard>


          </div>
        </div>
      </div>
    </LicenseGate>
  );
}

/* =====================================================================
   1.2c — INTERFACE INTEGRASI (API) MAIN TETHER CABLE
   ===================================================================== */
export function TetherAPIPage() {
  const { pushToast, notify, t, lang } = useApp();
  const [logs, setLogs] = useState<TetherCableApiLogRecord[]>([]);
  const [logsLoading, setLogsLoading] = useState(true);
  const [selected, setSelected] = useState<TetherCableApiLogRecord | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getTetherCableApiLogs().catch(() => []).then(rows => {
      if (cancelled) return;
      setLogs(rows);
      setSelected(rows[0] ?? null);
    }).finally(() => { if (!cancelled) setLogsLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* Berdetak tiap detik supaya durasi sesi yang masih berjalan
     (status 'live', belum ada stopped_at) ikut bertambah secara live. */
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const isLive = logs.some(l => l.status === 'live');
  const totalLiveMs = useMemo(() => logs.reduce((sum, l) => {
    const start = new Date(l.created_at).getTime();
    const end = l.stopped_at ? new Date(l.stopped_at).getTime() : now;
    return sum + Math.max(0, end - start);
  }, 0), [logs, now]);

  const sample = useMemo(
    () => (selected ? JSON.stringify(selected, null, 2) : '—'),
    [selected],
  );

  /* Hasil penyalinan ditunggu sebelum melapor. Versi sebelumnya
     melepas promise tanpa penangkap — penolakan izin muncul sebagai
     galat konsol, dan operator tetap diberi tahu "berhasil" padahal
     papan klip masih kosong. */
  const copy = async () => {
    if (await salinTeks(sample)) {
      pushToast({ tone: 'success', title: t('Contoh respons disalin'), detail: t('Payload JSON tersalin ke papan klip.') });
      notify({
        title: t('Contoh respons disalin'),
        detail: t('Payload JSON tersalin ke papan klip.'),
        severity: 'informasi',
        category: 'Konektivitas',
        source: 'Tether Cable API',
        page: 'tether-api',
        silent: true,
      });
    } else {
      pushToast({ tone: 'error', title: t('Gagal menyalin'), detail: t('Peramban menolak akses papan klip.') });
      notify({
        title: t('Gagal menyalin'),
        detail: t('Peramban menolak akses papan klip.'),
        severity: 'peringatan',
        category: 'Konektivitas',
        source: 'Tether Cable API',
        page: 'tether-api',
        silent: true,
      });
    }
  };

  return (
    <LicenseGate moduleCode="1.2c" moduleName="Interface Integrasi (API) Main Tether Cable">
      <div className="animate-fade-in">
        <PageHead
          icon={<PlugZap size={22} />}
          title={t('Tether Cable Integration API')}
          code="1.2c"
          description={t('Antarmuka REST dan WebSocket untuk data daya dan tautan kabel penambat.')}
        />

        <div className="lic-summary">
          <SummaryStat
            icon={<Zap size={19} />}
            accent={isLive ? 'var(--accent-emerald)' : 'var(--text-disabled)'}
            label={t('Status Layanan')}
            value={isLive ? 'ONLINE' : 'OFFLINE'}
          />
          <SummaryStat
            icon={<ShieldCheck size={19} />}
            accent="var(--accent-tertiary)"
            label={t('Total Durasi Live')}
            value={formatDurationHMS(totalLiveMs)}
          />
        </div>

        <GlassCard tilt={false}>
          <SectionHead icon={<TerminalSquare size={15} />} title={t('Data Live Stream')} sub={`${logs.length} ${t('sesi tercatat')}`} />
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>{t('Waktu')}</th>
                  <th>{t('Status')}</th>
                  <th>{t('URL Live Stream')}</th>
                  <th>{t('Berhenti Pada')}</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr><td colSpan={4} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Memuat…')}</td></tr>
                ) : logs.length === 0 ? (
                  <tr><td colSpan={4} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Belum ada sesi tercatat')}</td></tr>
                ) : logs.map(row => (
                  <tr
                    key={row.uid}
                    onClick={() => setSelected(row)}
                    style={{ cursor: 'pointer', background: selected?.uid === row.uid ? 'rgba(96,165,250,0.06)' : undefined }}
                  >
                    <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                      {fullTimestamp(new Date(row.created_at).getTime(), lang)}
                    </td>
                    <td>
                      <span className={`badge ${row.status === 'live' ? 'badge-success' : 'badge-neutral'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="font-mono text-xs">{row.udp_url}</td>
                    <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                      {row.stopped_at ? fullTimestamp(new Date(row.stopped_at).getTime(), lang) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>

        <div style={{ display: 'none', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead icon={<TerminalSquare size={15} />} title={t('Data Live Stream')} sub={`${logs.length} ${t('sesi tercatat')}`} />
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>{t('Waktu')}</th>
                      <th>{t('Status')}</th>
                      <th>{t('URL Live Stream')}</th>
                      <th>{t('Berhenti Pada')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logsLoading ? (
                      <tr><td colSpan={4} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Memuat…')}</td></tr>
                    ) : logs.length === 0 ? (
                      <tr><td colSpan={4} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Belum ada sesi tercatat')}</td></tr>
                    ) : logs.map(row => (
                      <tr
                        key={row.uid}
                        onClick={() => setSelected(row)}
                        style={{ cursor: 'pointer', background: selected?.uid === row.uid ? 'rgba(96,165,250,0.06)' : undefined }}
                      >
                        <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                          {fullTimestamp(new Date(row.created_at).getTime(), lang)}
                        </td>
                        <td>
                          <span className={`badge ${row.status === 'live' ? 'badge-success' : 'badge-neutral'}`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{row.udp_url}</td>
                        <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                          {row.stopped_at ? fullTimestamp(new Date(row.stopped_at).getTime(), lang) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead
                icon={<TerminalSquare size={15} />}
                title={t('Contoh Respons')}
                sub={selected ? `UID ${selected.uid}` : t('Belum ada sesi dipilih')}
                right={<button className="btn btn-ghost btn-sm" onClick={copy}><Copy size={13} /> {t('Salin')}</button>}
              />
              <pre className="code-block">{sample}</pre>
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead
                icon={<KeyRound size={15} />}
                title={t('Kunci Akses API')}
                right={
                  <button
                    className="btn btn-primary btn-sm"
                    onClick={() => {
                      pushToast({
                        tone: 'success',
                        title: 'Kunci akses baru diterbitkan',
                        detail: 'Salin kunci sekarang — nilai penuhnya hanya ditampilkan satu kali.',
                      });
                      notify({
                        title: 'Kunci akses baru diterbitkan',
                        detail: 'Salin kunci sekarang — nilai penuhnya hanya ditampilkan satu kali.',
                        severity: 'informasi',
                        category: 'Konektivitas',
                        source: 'Tether Cable API',
                        page: 'tether-api',
                        silent: true,
                      });
                    }}
                  >
                    <Plus size={13} /> Terbitkan
                  </button>
                }
              />
              <div className="table-container">
                <table>
                  <thead><tr><th>{t('Nama')}</th><th>{t('Kunci')}</th></tr></thead>
                  <tbody>
                    <tr><td style={{ fontWeight: 600 }}>{t('Ground Winch Gateway')}</td><td className="font-mono text-xs">{t('tab_live_••••4c1a')}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>{t('Mooring Controller')}</td><td className="font-mono text-xs">{t('tab_live_••••9f7b')}</td></tr>
                    <tr><td style={{ fontWeight: 600 }}>{t('Analitik Internal')}</td><td className="font-mono text-xs">{t('tab_live_••••2d80')}</td></tr>
                  </tbody>
                </table>
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.55 }}>
                {t('Kunci hanya ditampilkan sekali saat diterbitkan dan disimpan dalam bentuk hash.')}
              </p>
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<CircuitBoard size={15} />} title={t('Sumber Data')} />
              <KVList rows={[
                ['Protokol', 'Modbus TCP / Serial RTU'],
                ['Alamat Perangkat', '192.168.10.60:502'],
                ['Unit ID', '1'],
                ['Register Tegangan', '40001 (INT16)'],
                ['Register Arus', '40003 (INT16)'],
                ['Register Isolasi', '40005 (INT32)'],
                ['Waktu Respons', '12 ms'],
              ]} />
            </GlassCard>
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}

function SummaryStat({ icon, accent, label, value }: { icon: React.ReactNode; accent: string; label: string; value: string }) {
  return (
    <div className="lic-summary-tile">
      <span
        className="ico"
        style={{
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 24%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </span>
      <span>
        <span className="lbl">{label}</span>
        <span className="val" style={{ fontSize: 15 }}>{value}</span>
      </span>
    </div>
  );
}

/* =====================================================================
   1.2d — MONITORING CHECKING CAPABILITY TETHER CABLE
   ===================================================================== */
const EMPTY_TETHER_FORM: Record<keyof TetherCableMonitorPayload, string> = {
  operating_voltage: '',
  load_current: '',
  insulation_resistance: '',
  conductor_continuity: '',
  optical_snr: '',
  optical_attenuation: '',
  sheath_temperature: '',
  kevlar_tension: '',
  description: '',
};

export function TetherMonitorPage() {
  const { pushToast, notify, t, lang } = useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(EMPTY_TETHER_FORM);
  const [photo, setPhoto] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [photoDrag, setPhotoDrag] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [history, setHistory] = useState<TetherCableMonitorRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    const rows = await api.getTetherCableMonitors().catch(() => []);
    setHistory(rows);
    setHistoryLoading(false);
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailRecord, setDetailRecord] = useState<TetherCableMonitorRecord | null>(null);

  const openDetail = async (id: string) => {
    setDetailOpen(true);
    setDetailLoading(true);
    setDetailRecord(null);
    try {
      const record = await api.getTetherCableMonitorById(id);
      setDetailRecord(record);
    } catch {
      pushToast({ tone: 'error', title: t('Gagal memuat detail') });
      setDetailOpen(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const photoUrl = (path: string) => {
    const normalized = path.replace(/\\/g, '/');
    return `${API_BASE_MEDIA}${normalized.startsWith('/') ? normalized : `/${normalized}`}`;
  };

  const voltage = useMemo(() => series(11, 40, 230, 6, 1), []);
  const current = useMemo(() => series(23, 40, 1.82, 0.26, 2), []);
  const insulation = useMemo(() => series(37, 40, 128, 14, 0), []);
  const snr = useMemo(() => series(53, 40, 42, 4, 1), []);

  const setField = (key: keyof TetherCableMonitorPayload, value: string) =>
    setForm(f => ({ ...f, [key]: value }));

  const pickPhoto = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(jpe?g|png)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: t('Format tidak didukung'), detail: t('Gunakan berkas JPG atau PNG.') });
      return;
    }
    setPhoto({ name: f.name, url: URL.createObjectURL(f), raw: f });
  };

  const formComplete = Object.values(form).every(v => v.trim() !== '') && photo !== null;

  const resetTetherModal = () => {
    setForm(EMPTY_TETHER_FORM);
    setPhoto(null);
    setModalOpen(false);
  };

  const submitTetherData = async () => {
    if (!photo) return;
    setSubmitting(true);
    try {
      const toNum = (v: string) => (v.trim() === '' ? null : Number(v));
      const toStr = (v: string) => (v.trim() === '' ? null : v.trim());
      await api.createTetherCableMonitor({
        operating_voltage: toNum(form.operating_voltage),
        load_current: toNum(form.load_current),
        insulation_resistance: toNum(form.insulation_resistance),
        conductor_continuity: toStr(form.conductor_continuity),
        optical_snr: toNum(form.optical_snr),
        optical_attenuation: toNum(form.optical_attenuation),
        sheath_temperature: toNum(form.sheath_temperature),
        kevlar_tension: toNum(form.kevlar_tension),
        description: toStr(form.description),
      }, photo.raw);
      pushToast({ tone: 'success', title: t('Data tether cable tersimpan') });
      notify({
        title: t('Data tether cable tersimpan'),
        detail: t('Data pemeriksaan kabel penambat baru telah ditambahkan.'),
        severity: 'informasi',
        category: 'Tether',
        source: 'Tether Cable Monitor',
        page: 'tether-monitor',
        silent: true,
      });
      resetTetherModal();
      fetchHistory();
    } catch (err) {
      pushToast({
        tone: 'error',
        title: t('Gagal menyimpan data'),
        detail: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  /* Ambang batas operasi mengacu pada spesifikasi kabel penambat. */
  const latest = history[0];
  const tetherParams = [
    { label: 'Tegangan Operasi', value: latest?.operating_voltage != null ? `${latest.operating_voltage} V` : '—', target: '230 VAC ±5%', ok: true, icon: <Zap size={13} /> },
    { label: 'Arus Beban', value: latest?.load_current != null ? `${latest.load_current} A` : '—', target: '≤ 2,2 A', ok: true, icon: <Activity size={13} /> },
    { label: 'Resistansi Isolasi', value: latest?.insulation_resistance != null ? `${latest.insulation_resistance} MΩ` : '—', target: '> 100 MΩ', ok: true, icon: <ShieldCheck size={13} /> },
    { label: 'Kontinuitas Konduktor', value: latest?.conductor_continuity ?? '—', target: 'Tidak putus', ok: true, icon: <Cable size={13} /> },
    { label: 'SNR Serat Optik (EOP)', value: latest?.optical_snr != null ? `${latest.optical_snr} dB` : '—', target: '> 40 dB', ok: true, icon: <Waves size={13} /> },
    { label: 'Redaman Optik', value: latest?.optical_attenuation != null ? `${latest.optical_attenuation} dB/km` : '—', target: '< 0,40 dB/km', ok: true, icon: <Waves size={13} /> },
    { label: 'Suhu Selubung', value: latest?.sheath_temperature != null ? `${latest.sheath_temperature} °C` : '—', target: '< 70 °C', ok: true, icon: <Thermometer size={13} /> },
    { label: 'Tegangan Tarik Kevlar', value: latest?.kevlar_tension != null ? `${latest.kevlar_tension} N` : '—', target: '< 4.500 N', ok: true, icon: <Gauge size={13} /> },
  ];

  return (
    <LicenseGate moduleCode="1.2d" moduleName="Monitoring Checking Capability Tether Cable">
      <div className="animate-fade-in">
        <PageHead
          icon={<Cable size={22} />}
          title={t('Tether Cable Monitoring')}
          code="1.2d"
          description={t('Kesehatan kabel penambat: daya, isolasi, kontinuitas, dan SNR optik.')}
          actions={
            <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
              <Plus size={15} /> {t('Tambah Data')}
            </button>
          }
        />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 16, marginTop: 16 }}>
          {tetherParams.map(p => (
            <div key={t(p.label)} className="metric">
              <div className="metric-label">{p.icon}{t(p.label)}</div>
              <div className="metric-value" style={{ color: p.ok ? 'var(--success-400)' : 'var(--danger-400)' }}>{p.value}</div>
              <div className="metric-foot">Batas: {t(p.target)}</div>
            </div>
          ))}
        </div>

        <GlassCard tilt={false}>
          <SectionHead icon={<AlertTriangle size={15} />} title={t('Riwayat Diagnostik')} sub={t('Lima pemeriksaan terakhir')} />
          {!historyLoading && history.length === 0 ? (
            <EmptyState
              icon={<AlertTriangle size={22} />}
              title={t('Belum ada data pemeriksaan')}
              description={t('Tambahkan data lewat tombol "Tambah Data" untuk mengisi riwayat ini.')}
            />
          ) : (
            <div className="table-container">
              <table>
                <thead><tr><th>{t('Waktu')}</th><th>{t('Kontinuitas')}</th><th>{t('Parameter')}</th><th>{t('Catatan')}</th><th>{t('Aksi')}</th></tr></thead>
                <tbody>
                  {historyLoading ? (
                    <tr><td colSpan={5} style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Memuat riwayat…')}</td></tr>
                  ) : history.slice(0, 5).map(row => (
                    <tr key={row.id}>
                      <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>
                        {fullTimestamp(new Date(row.created_at).getTime(), lang)}
                      </td>
                      <td>
                        <span className={`badge ${row.conductor_continuity === 'TERSAMBUNG' ? 'badge-success' : row.conductor_continuity === 'PUTUS' ? 'badge-danger' : 'badge-neutral'}`}>
                          {row.conductor_continuity ?? '—'}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>
                        {row.operating_voltage ?? '—'} V · {row.load_current ?? '—'} A · {row.insulation_resistance ?? '—'} MΩ · {row.optical_snr ?? '—'} dB
                      </td>
                      <td style={{ fontSize: 12 }}>{row.description ?? '—'}</td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => openDetail(row.id)}>
                          <Eye size={13} /> {t('Detail')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>




      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => !submitting && resetTetherModal()}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Cable size={16} /> {t('Tambah Data')}
              </h3>
              <button
                className="btn btn-ghost"
                onClick={resetTetherModal}
                disabled={submitting}
                style={{ padding: 4 }}
                aria-label={t('Tutup')}
              >
                <X size={17} />
              </button>
            </div>

            <div className="modal-body">
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Tegangan Operasi')} (V)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.operating_voltage}
                      onChange={e => setField('operating_voltage', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Arus Beban')} (A)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.load_current}
                      onChange={e => setField('load_current', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Resistansi Isolasi')} (MΩ)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.insulation_resistance}
                      onChange={e => setField('insulation_resistance', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Kontinuitas Konduktor')}</label>
                    <select
                      className="form-input"
                      value={form.conductor_continuity}
                      onChange={e => setField('conductor_continuity', e.target.value)}
                    >
                      <option value="">{t('— Pilih —')}</option>
                      <option value="TERSAMBUNG">{t('TERSAMBUNG')}</option>
                      <option value="PUTUS">{t('PUTUS')}</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('SNR Serat Optik (EOP)')} (dB)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.optical_snr}
                      onChange={e => setField('optical_snr', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Redaman Optik')} (dB/km)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.optical_attenuation}
                      onChange={e => setField('optical_attenuation', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Suhu Selubung')} (°C)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.sheath_temperature}
                      onChange={e => setField('sheath_temperature', e.target.value)}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Tegangan Tarik Kevlar')} (N)</label>
                    <input
                      type="number" step="any" className="form-input font-mono"
                      value={form.kevlar_tension}
                      onChange={e => setField('kevlar_tension', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">{t('Foto')}</label>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png"
                  hidden
                  onChange={e => pickPhoto(e.target.files?.[0])}
                />

                {photo ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={t('Foto pemeriksaan')}
                      style={{ width: 56, height: 56, borderRadius: 10, objectFit: 'cover', flexShrink: 0 }}
                    />
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                      {photo.name}
                    </span>
                    <button className="btn btn-ghost btn-sm" onClick={() => setPhoto(null)}>
                      <X size={13} /> {t('Hapus')}
                    </button>
                  </div>
                ) : (
                  <div
                    className={`uploader ${photoDrag ? 'drag' : ''}`}
                    onClick={() => photoInputRef.current?.click()}
                    onDragOver={e => { e.preventDefault(); setPhotoDrag(true); }}
                    onDragLeave={() => setPhotoDrag(false)}
                    onDrop={e => { e.preventDefault(); setPhotoDrag(false); pickPhoto(e.dataTransfer.files?.[0]); }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') photoInputRef.current?.click(); }}
                  >
                    <span className="uploader-ring"><ImageIcon size={22} /></span>
                    <span className="uploader-copy">
                      <span className="uploader-title">{t('Unggah foto pemeriksaan')}</span>
                      <span className="uploader-sub">{t('JPG atau PNG · maksimum 50 MB')}</span>
                    </span>
                    <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{t('Deskripsi')}</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={form.description}
                  onChange={e => setField('description', e.target.value)}
                  placeholder={t('Catatan tambahan hasil pemeriksaan')}
                  style={{ resize: 'vertical' }}
                />
              </div>

              {!formComplete && (
                <p style={{ fontSize: 11, color: 'var(--warning-400)', marginTop: 2 }}>
                  {t('Lengkapi seluruh kolom termasuk foto sebelum menyimpan.')}
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={resetTetherModal} disabled={submitting}>
                {t('Batal')}
              </button>
              <button className="btn btn-primary" onClick={submitTetherData} disabled={submitting || !formComplete}>
                {submitting ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan...')}</> : <><Save size={15} /> {t('Simpan')}</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {detailOpen && (
        <div className="modal-backdrop" onClick={() => setDetailOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Eye size={16} /> {t('Detail Pemeriksaan')}
              </h3>
              <button
                className="btn btn-ghost"
                onClick={() => setDetailOpen(false)}
                style={{ padding: 4 }}
                aria-label={t('Tutup')}
              >
                <X size={17} />
              </button>
            </div>

            <div className="modal-body">
              {detailLoading ? (
                <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t('Memuat detail…')}</p>
              ) : detailRecord && (
                <>
                  {detailRecord.folder_path && (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={photoUrl(detailRecord.folder_path)}
                      alt={t('Foto pemeriksaan')}
                      style={{ width: '100%', maxHeight: 240, objectFit: 'cover', borderRadius: 10, marginBottom: 14 }}
                    />
                  )}
                  <KVList rows={[
                    [t('Tegangan Operasi'), detailRecord.operating_voltage != null ? `${detailRecord.operating_voltage} V` : '—'],
                    [t('Arus Beban'), detailRecord.load_current != null ? `${detailRecord.load_current} A` : '—'],
                    [t('Resistansi Isolasi'), detailRecord.insulation_resistance != null ? `${detailRecord.insulation_resistance} MΩ` : '—'],
                    [t('Kontinuitas Konduktor'), detailRecord.conductor_continuity ?? '—'],
                    [t('SNR Serat Optik (EOP)'), detailRecord.optical_snr != null ? `${detailRecord.optical_snr} dB` : '—'],
                    [t('Redaman Optik'), detailRecord.optical_attenuation != null ? `${detailRecord.optical_attenuation} dB/km` : '—'],
                    [t('Suhu Selubung'), detailRecord.sheath_temperature != null ? `${detailRecord.sheath_temperature} °C` : '—'],
                    [t('Tegangan Tarik Kevlar'), detailRecord.kevlar_tension != null ? `${detailRecord.kevlar_tension} N` : '—'],
                    [t('Deskripsi'), detailRecord.description ?? '—'],
                    [t('Dibuat'), fullTimestamp(new Date(detailRecord.created_at).getTime(), lang)],
                    [t('Diperbarui'), fullTimestamp(new Date(detailRecord.updated_at).getTime(), lang)],
                  ]} />
                </>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailOpen(false)}>
                {t('Tutup')}
              </button>
            </div>
          </div>
        </div>
      )}
    </LicenseGate>
  );
}
