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
import { CompareSlider, VideoCompare } from '../../components/media';
import api, {
  API_BASE_MEDIA, type FlightMissionRecord, type FlightInformationRecord,
  type EnhanceImageResult, type EnhanceVideoResult,
} from '../../services/api';
import {
  Wand2, Image as ImageIcon, SlidersHorizontal, Save,
  RefreshCw, Clapperboard, Palette, Camera, Thermometer,
  PlugZap, Cable, Activity, Zap, Gauge, ShieldCheck, Radio, Copy,
  KeyRound, Plus, TerminalSquare, Waves, CircuitBoard, AlertTriangle,
} from 'lucide-react';

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
     Hanya misi dengan mission_status.name "Flight" yang relevan di sini.
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
        return name === 'Flight';
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
     flight mission (hanya yang mission_status.name "Flight"), dan
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
        return name === 'Flight';
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
    if (!/\.(mp4|mov|avi|mkv|webm)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: 'Format tidak didukung', detail: 'Gunakan berkas MP4, MOV, AVI, MKV, atau WEBM.' });
      notify({
        title: 'Format tidak didukung',
        detail: 'Gunakan berkas MP4, MOV, AVI, MKV, atau WEBM.',
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
      const result = await api.enhanceVideo(file.raw, { denoise, contrast, sharpness });
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

        <input ref={inputRef} type="file" accept=".mp4,.mov,.avi,.mkv,.webm" hidden onChange={e => pick(e.target.files?.[0])} />

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
                  <span className="uploader-sub">{t('MP4, MOV, AVI, atau MKV · maksimum 200 MB')}</span>
                </span>
                <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
              </div>
            </GlassCard>

           
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Thermometer size={15} />} title={t('Pengaturan Peningkatan')} />

              <div className="form-group" style={{ marginTop: 8 }}>
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
const ENDPOINTS = [
  { method: 'GET', path: '/api/v1/tether/status', desc: 'Ringkasan status kabel penambat: tegangan, arus, isolasi, kontinuitas.' },
  { method: 'GET', path: '/api/v1/tether/power', desc: 'Parameter kelistrikan terkini beserta stempel waktu pembacaan.' },
  { method: 'GET', path: '/api/v1/tether/optical', desc: 'Redaman dan SNR jalur serat optik (EOP) pada kabel utama.' },
  { method: 'GET', path: '/api/v1/tether/history', desc: 'Riwayat pembacaan sensor dalam rentang waktu tertentu.' },
  { method: 'POST', path: '/api/v1/tether/calibrate', desc: 'Menjalankan kalibrasi ulang sensor arus dan tegangan ground winch.' },
  { method: 'WS', path: '/ws/tether/telemetry', desc: 'Aliran telemetri real-time kabel penambat via WebSocket.' },
];

export function TetherAPIPage() {
  const { pushToast, notify, t } = useApp();
  const [selected, setSelected] = useState(ENDPOINTS[0]);

  const sample = useMemo(() => JSON.stringify({
    timestamp: '2026-07-27T11:42:08+07:00',
    station: 'GCS-01',
    voltage_ac: 229.6,
    current_a: 1.82,
    power_w: 417.9,
    insulation_mohm: 128.4,
    continuity: 'OK',
    eop_snr_db: 42.6,
    attenuation_db_km: 0.31,
    winch_tension_n: 1240,
    source: 'modbus-tcp://192.168.10.60:502',
  }, null, 2), []);

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
          <SummaryStat icon={<Zap size={19} />} accent="var(--accent-emerald)" label={t('Status Layanan')} value="ONLINE" />
          <SummaryStat icon={<Radio size={19} />} accent="var(--accent-primary)" label={t('Protokol Sumber')} value="Modbus TCP" />
          <SummaryStat icon={<Activity size={19} />} accent="var(--accent-secondary)" label={t('Interval Polling')} value="1 detik" />
          <SummaryStat icon={<ShieldCheck size={19} />} accent="var(--accent-tertiary)" label={t('Rate Limit')} value="600/menit" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead icon={<TerminalSquare size={15} />} title={t('Daftar Endpoint')} sub={t('Seluruh endpoint hanya dapat diakses dari segmen jaringan lokal')} />
              <div className="table-container">
                <table>
                  <thead><tr><th style={{ width: 70 }}>{t('Metode')}</th><th>{t('Path')}</th><th>{t('Keterangan')}</th></tr></thead>
                  <tbody>
                    {ENDPOINTS.map(e => (
                      <tr
                        key={e.path}
                        onClick={() => setSelected(e)}
                        style={{ cursor: 'pointer', background: selected.path === e.path ? 'rgba(96,165,250,0.06)' : undefined }}
                      >
                        <td>
                          <span className={`badge badge-${e.method === 'GET' ? 'success' : e.method === 'POST' ? 'warning' : 'info'}`}>
                            {e.method}
                          </span>
                        </td>
                        <td className="font-mono text-xs">{e.path}</td>
                        <td style={{ fontSize: 12 }}>{e.desc}</td>
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
                sub={`${selected.method} ${selected.path}`}
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
export function TetherMonitorPage() {
  const { pushToast, notify, t } = useApp();
  const [testing, setTesting] = useState(false);

  const voltage = useMemo(() => series(11, 40, 230, 6, 1), []);
  const current = useMemo(() => series(23, 40, 1.82, 0.26, 2), []);
  const insulation = useMemo(() => series(37, 40, 128, 14, 0), []);
  const snr = useMemo(() => series(53, 40, 42, 4, 1), []);

  const runDiagnostic = () => {
    setTesting(true);
    window.setTimeout(() => {
      setTesting(false);
      pushToast({
        tone: 'success',
        title: 'Diagnostik kabel selesai',
        detail: 'Seluruh parameter berada dalam batas operasi. Tidak ditemukan anomali.',
      });
      notify({
        title: 'Diagnostik kabel selesai',
        detail: 'Seluruh parameter berada dalam batas operasi. Tidak ditemukan anomali.',
        severity: 'informasi',
        category: 'Tether',
        source: 'Tether Cable Monitor',
        page: 'tether-monitor',
        silent: true,
      });
    }, 1600);
  };

  /* Ambang batas operasi mengacu pada spesifikasi kabel penambat. */
  const params = [
    { label: 'Tegangan Operasi', value: '229,6 V', target: '230 VAC ±5%', ok: true, icon: <Zap size={13} /> },
    { label: 'Arus Beban', value: '1,82 A', target: '≤ 2,2 A', ok: true, icon: <Activity size={13} /> },
    { label: 'Resistansi Isolasi', value: '128 MΩ', target: '> 100 MΩ', ok: true, icon: <ShieldCheck size={13} /> },
    { label: 'Kontinuitas Konduktor', value: 'TERSAMBUNG', target: 'Tidak putus', ok: true, icon: <Cable size={13} /> },
    { label: 'SNR Serat Optik (EOP)', value: '42,6 dB', target: '> 40 dB', ok: true, icon: <Waves size={13} /> },
    { label: 'Redaman Optik', value: '0,31 dB/km', target: '< 0,40 dB/km', ok: true, icon: <Waves size={13} /> },
    { label: 'Suhu Selubung', value: '38,4 °C', target: '< 70 °C', ok: true, icon: <Thermometer size={13} /> },
    { label: 'Tegangan Tarik Kevlar', value: '1.240 N', target: '< 4.500 N', ok: true, icon: <Gauge size={13} /> },
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
            <button className="btn btn-primary" onClick={runDiagnostic} disabled={testing}>
              {testing ? <><RefreshCw size={15} className="spin" /> {t('Menguji…')}</> : <><ShieldCheck size={15} /> {t('Jalankan Diagnostik')}</>}
            </button>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 16 }}>
          {params.map(p => (
            <div key={t(p.label)} className="metric">
              <div className="metric-label">{p.icon}{t(p.label)}</div>
              <div className="metric-value" style={{ color: p.ok ? 'var(--success-400)' : 'var(--danger-400)' }}>{p.value}</div>
              <div className="metric-foot">Batas: {t(p.target)}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 14 }}>
          <GlassCard tilt={false}>
            <SectionHead icon={<Zap size={15} />} title={t('Tren Kelistrikan')} sub={t('40 pembacaan terakhir · interval 1 detik')} />
            <Sparkline data={voltage} color="var(--accent-emerald)" height={82} label={t('Tegangan kabel utama')} unit=" V" />
            <div style={{ height: 12 }} />
            <Sparkline data={current} color="var(--accent-amber)" height={82} label={t('Arus beban')} unit=" A" />
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<Waves size={15} />} title={t('Tren Isolasi & Optik')} sub={t('40 pembacaan terakhir')} />
            <Sparkline data={insulation} color="var(--accent-primary)" height={82} label={t('Resistansi isolasi')} unit=" MΩ" />
            <div style={{ height: 12 }} />
            <Sparkline data={snr} color="var(--accent-secondary)" height={82} label={t('SNR serat optik (EOP)')} unit=" dB" />
          </GlassCard>
        </div>

        <div className="grid-2">
          <GlassCard tilt={false}>
            <SectionHead icon={<Cable size={15} />} title={t('Spesifikasi Kabel Penambat')} />
            <KVList rows={[
              ['Panjang Terpasang', '600 m'],
              ['Panjang Terulur', '450 m'],
              ['Konstruksi', 'Kevlar reinforced + serat optik'],
              ['Konduktor Daya', '2 × 1,5 mm² tembaga'],
              ['Kapasitas Tarik', '4.500 N (breaking 9.000 N)'],
              ['Serat Optik', '1 × single-mode G.652.D'],
              ['Berat per Meter', '38 g/m'],
              ['Umur Layanan', '1.850 jam / 5.000 jam'],
            ]} />
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<AlertTriangle size={15} />} title={t('Riwayat Diagnostik')} sub={t('Lima pemeriksaan terakhir')} />
            <div className="table-container">
              <table>
                <thead><tr><th>{t('Waktu')}</th><th>{t('Jenis')}</th><th>{t('Hasil')}</th><th>{t('Catatan')}</th></tr></thead>
                <tbody>
                  {[
                    ['2026-07-27 10:15', 'Rutin harian', 'LULUS', 'Isolasi 128 MΩ · kontinuitas OK'],
                    ['2026-07-26 10:04', 'Rutin harian', 'LULUS', 'Seluruh parameter nominal'],
                    ['2026-07-25 16:38', 'Pasca-badai', 'LULUS', 'Isolasi turun ke 112 MΩ, masih di atas batas'],
                    ['2026-07-25 09:50', 'Rutin harian', 'LULUS', 'SNR optik 41,2 dB'],
                    ['2026-07-24 14:22', 'Pra-penerbangan', 'LULUS', 'Uji tarik statis 1.180 N'],
                  ].map(([t, jenis, hasil, catatan]) => (
                    <tr key={t}>
                      <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>{t}</td>
                      <td style={{ fontSize: 12 }}>{jenis}</td>
                      <td><span className="badge badge-success">{hasil}</span></td>
                      <td style={{ fontSize: 12 }}>{catatan}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>
        </div>
      </div>
    </LicenseGate>
  );
}
