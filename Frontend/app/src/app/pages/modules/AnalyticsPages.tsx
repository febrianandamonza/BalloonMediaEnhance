'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import LicenseGate from '../../components/LicenseGate';
import GlassCard from '../../components/GlassCard';
import { useApp } from '../../context';
import {
  PageHead, Metric, MetricRow, SectionHead, KVList,
  Sparkline, EmptyState, Segmented,
  ConfigSelect, ConfigText, OfflineNotice,
} from '../../components/ui';
import { CompareSlider, VideoCompare, VideoPlayer, SAMPLES } from '../../components/media';
import api, {
  API_BASE_MEDIA, WS_BASE, type FlightMissionRecord, type FlightInformationRecord,
  type DetectImageResult, type DetectedObject, type DetectVideoFrameMessage,
} from '../../services/api';
import {
  UsersRound, Play, Pause, Square, Camera, Cpu, Video, Radio,
  ScanSearch, Clapperboard, UploadCloud, Image as ImageIcon, Target,
  Crosshair, SlidersHorizontal, ListFilter, Activity, MapPin,
  Car, PersonStanding, Save, RefreshCw, Loader2, FileVideo,
} from 'lucide-react';

type RunState = 'idle' | 'running' | 'paused';

/* Deret pseudo-acak deterministik agar render server & klien konsisten. */
function series(seed: number, len: number, base: number, spread: number) {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    out.push(Math.round(base + ((s / 2147483647) - 0.5) * spread));
  }
  return out;
}

/* =====================================================================
   CC-01 — CROWD COUNTING
   ===================================================================== */
export function CrowdCountingPage() {
  const { pushToast, offline, t } = useApp();
  const [state, setState] = useState<RunState>('idle');
  const [count, setCount] = useState(0);
  const [peak, setPeak] = useState(0);
  const [frames, setFrames] = useState(0);
  const [threshold, setThreshold] = useState(500);
  const [history, setHistory] = useState<number[]>([]);
  const tick = useRef(0);

  /* Simulasi aliran hasil inferensi dari server AI lokal. */
  useEffect(() => {
    /* Umpan berasal dari platform; tanpa daya tidak ada bingkai masuk. */
    if (state !== 'running' || offline) return;
    const id = window.setInterval(() => {
      tick.current += 1;
      const wave = Math.sin(tick.current / 7) * 90 + Math.sin(tick.current / 2.3) * 24;
      const next = Math.max(0, Math.round(340 + wave));
      setCount(next);
      setPeak(p => Math.max(p, next));
      setFrames(f => f + 25);
      setHistory(h => [...h.slice(-39), next]);
    }, 900);
    return () => window.clearInterval(id);
  }, [state, offline]);

  const average = history.length
    ? Math.round(history.reduce((a, b) => a + b, 0) / history.length)
    : 0;
  const overThreshold = count > threshold;

  const start = () => {
    setState('running');
    pushToast({ tone: 'info', title: 'Sesi crowd counting dimulai', detail: 'Model CSRNet dimuat ke CUDA:0 — inferensi berjalan.' });
  };

  const stop = () => {
    setState('idle');
    pushToast({ tone: 'success', title: 'Sesi dihentikan', detail: `${frames.toLocaleString('id-ID')} frame diproses · puncak ${peak} jiwa.` });
    setCount(0); setPeak(0); setFrames(0); setHistory([]); tick.current = 0;
  };

  return (
    <LicenseGate moduleCode="CC-01" moduleName="Crowd Density Estimation">
      <div className="animate-fade-in">
        <PageHead
          icon={<UsersRound size={22} />}
          title={t('Crowd Counting')}
          code="CC-01"
          description={t('Estimasi kepadatan massa dengan overlay density map di atas umpan video.')}
          actions={
            <>
              {state === 'idle' && <button className="btn btn-primary" onClick={start} disabled={offline}><Play size={15} /> {t('Mulai Analisis')}</button>}
              {state === 'running' && <button className="btn btn-secondary" onClick={() => setState('paused')}><Pause size={15} /> {t('Jeda')}</button>}
              {state === 'paused' && <button className="btn btn-primary" onClick={() => setState('running')}><Play size={15} /> {t('Lanjutkan')}</button>}
              {state !== 'idle' && <button className="btn btn-danger" onClick={stop}><Square size={15} /> {t('Hentikan')}</button>}
            </>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead
                icon={<Video size={15} />}
                title={t('Umpan Zona A')}
                sub={t('Rekaman gimbal Epsilon dengan keluaran density map')}
                right={
                  <span className={`badge ${overThreshold ? 'badge-danger' : 'badge-info'}`}>
                    {state === 'running' ? `${count.toLocaleString('id-ID')} jiwa` : 'siaga'}
                  </span>
                }
              />
              {offline ? (
                <OfflineNotice
                  title={t('Modul ini memerlukan umpan langsung dari platform.')}
                  detail={t('Daya platform sedang diputus. Pulihkan daya melalui prosedur reset teknisi untuk melanjutkan.')}
                  last={[
                    [t('Puncak'), peak ? peak.toLocaleString('id-ID') : '—'],
                    [t('Frame Diproses'), frames ? frames.toLocaleString('id-ID') : '—'],
                  ]}
                />
              ) : (
                <VideoCompare
                  before={SAMPLES.crowdBefore}
                  after={SAMPLES.crowdAfter}
                  labelBefore={t('Umpan Mentah')}
                  labelAfter={t('Density Map + Hitung')}
                  aspect="16 / 9"
                />
              )}
              {overThreshold && (
                <p className="alert-line danger">
                  Kepadatan melewati ambang {threshold.toLocaleString('id-ID')} jiwa — peringatan
                  dikirim ke modul Smart Notification.
                </p>
              )}
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead icon={<Activity size={15} />} title={t('Statistik Sesi')} sub={t('Diperbarui setiap ~0,9 detik')} />
              <MetricRow cols={3}>
                <Metric label={t('Saat Ini')} value={state !== 'idle' ? count.toLocaleString('id-ID') : '—'} color="var(--accent-cyan)" foot={t('jiwa')} />
                <Metric label={t('Rata-rata')} value={state !== 'idle' ? average.toLocaleString('id-ID') : '—'} color="var(--accent-primary)" foot={t('sepanjang sesi')} />
                <Metric label={t('Puncak')} value={state !== 'idle' ? peak.toLocaleString('id-ID') : '—'} color="var(--accent-tertiary)" foot={t('tertinggi')} />
                <Metric label={t('Frame Diproses')} value={state !== 'idle' ? frames.toLocaleString('id-ID') : '—'} foot={t('akumulasi')} />
                <Metric label={t('Utilisasi GPU')} value={state === 'running' ? '78%' : '—'} color="var(--accent-emerald)" foot={t('RTX 4090 Laptop')} />
                <Metric label={t('Waktu Inferensi')} value={state === 'running' ? '23 ms' : '—'} color="var(--accent-amber)" foot={t('target ≤ 35 ms')} />
              </MetricRow>
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead icon={<Activity size={15} />} title={t('Tren Kepadatan')} sub={t('40 pembacaan terakhir')} />
              {history.length > 2 ? (
                <Sparkline data={history} color={overThreshold ? 'var(--danger-400)' : 'var(--accent-cyan)'} height={110} unit=" jiwa" />
              ) : (
                <EmptyState
                  icon={<Activity size={22} />}
                  title={t('Belum ada data tren')}
                  description={t('Mulai analisis untuk merekam perubahan kepadatan sepanjang sesi pengawasan.')}
                />
              )}
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Video size={15} />} title={t('Sumber Video')} />
              <ConfigSelect label={"Jenis Sumber"} options={["RTSP Stream (Epsilon)", "Berkas Video Lokal", "Kamera USB"]} />
              <ConfigText label={t('Alamat')} initial="rtsp://192.168.10.100:15004/stream1" />
              <ConfigSelect label={"Resolusi Inferensi"} options={["1920 × 1080", "1280 × 720", "960 × 540"]} />
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<Cpu size={15} />} title={t('Konfigurasi Model')} />
              <ConfigSelect label={"Arsitektur"} options={["CSRNet (Density Map)", "DM-Count", "MCNN"]} />
              <ConfigSelect label={"Perangkat"} options={["CUDA:0 — RTX 4090 Laptop", "CPU (fallback)"]} />
              <div className="form-group">
                <label className="form-label" htmlFor="crowd-ambang">{t('Ambang Peringatan Kepadatan')}</label>
                <input
                  id="crowd-ambang"
                  className="form-input font-mono"
                  type="number"
                  value={threshold}
                  min={50}
                  step={50}
                  onChange={e => setThreshold(Number(e.target.value) || 0)}
                />
                <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
                  {t('Alert dikirim ke modul Smart Notification bila estimasi melewati nilai ini.')}
                </p>
              </div>
              <ConfigSelect label={"Interval Sampling"} options={["Setiap 25 frame (≈1 detik)", "Setiap 50 frame", "Setiap frame"]} />
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<Camera size={15} />} title={t('Zona Pengawasan')} />
              <KVList rows={[
                ['Zona Aktif', 'Zona A — Lapangan Utama'],
                ['Luas Terpantau', '≈ 12.400 m²'],
                ['Ketinggian Balon', '450 m AGL'],
                ['Sudut Tilt', '−28,4°'],
                ['Skala Piksel', '0,18 m/px'],
              ]} />
              <button
                className="btn btn-secondary btn-sm w-full mt-16"
                onClick={() => pushToast({
                  tone: 'info',
                  title: 'Mode sunting poligon aktif',
                  detail: 'Tarik simpul pada peta zona untuk mengubah batas area penghitungan, lalu simpan.',
                })}
              >
                <MapPin size={13} /> Ubah Poligon Zona
              </button>
            </GlassCard>
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}

/* =====================================================================
   1.1a — DIGITAL IMAGING ANALYTIC & OBJECT DETECTION
   ===================================================================== */
export function ImageDetectionPage() {
  const { pushToast, t } = useApp();
  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [detectResult, setDetectResult] = useState<DetectImageResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [confidence, setConfidence] = useState(10);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  /* Sama seperti ImageEnhancementPage — deteksi harus dikaitkan ke satu
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

  /* Hasil Deteksi disaring lewat ambang kepercayaan — confidence dari API
     berskala 0–1, jadi dibandingkan sebagai persen. */
  const visible = useMemo(
    () => (detectResult?.objects ?? []).filter(o => o.confidence * 100 >= confidence),
    [detectResult, confidence],
  );

  const previewUrl = detectResult
    ? (detectResult.preview_url.startsWith('http') ? detectResult.preview_url : `${API_BASE_MEDIA}${detectResult.preview_url}`)
    : '';

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(jpe?g|png|tiff?)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: 'Format tidak didukung', detail: 'Gunakan berkas JPG, PNG, atau TIFF.' });
      return;
    }
    setFile({ name: f.name, url: URL.createObjectURL(f), raw: f });
    /* Upload citra baru membatalkan hasil deteksi sebelumnya. */
    setDetectResult(null);
  };

  const analyze = async () => {
    if (analyzing) return;
    /* Tombol tetap bisa diklik walau syarat belum lengkap — tanpa ini,
       atribut disabled bisu (tidak ada gaya CSS pembeda) membuat klik
       terlihat tidak berefek sama sekali. */
    if (!missionId) {
      pushToast({ tone: 'error', title: t('Pilih flight mission dahulu'), detail: t('Flight mission wajib dipilih sebelum menjalankan deteksi.') });
      return;
    }
    if (!file) {
      pushToast({ tone: 'error', title: t('Unggah citra dahulu'), detail: t('Pilih atau seret berkas citra sebelum menjalankan deteksi.') });
      return;
    }
    setAnalyzing(true);
    try {
      const result = await api.detectImage(file.raw);
      setDetectResult(result);
      pushToast({
        tone: 'success',
        title: t('Deteksi selesai'),
        detail: `${result.objects.length} objek ditemukan · ${result.processing_time} ms.`,
      });
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menjalankan deteksi'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const saveMedia = async () => {
    if (!detectResult || !missionId || saving) return;
    if (flightInfoId == null) {
      pushToast({
        tone: 'error',
        title: t('Flight mission belum punya data flight information'),
        detail: t('Tidak ditemukan flight-information untuk misi ini. Lengkapi datanya di modul Flight Information dahulu.'),
      });
      return;
    }
    setSaving(true);
    try {
      await api.createMedia({
        flight_information_id: flightInfoId,
        temp_path: detectResult.temp_path,
        processing_type: detectResult.processing_type,
      });
      pushToast({
        tone: 'success',
        title: t('Citra hasil deteksi disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; citra asli tetap utuh.'),
      });
      setFile(null);
      setDetectResult(null);
      setMissionId('');
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <LicenseGate moduleCode="1.1a" moduleName="Digital Imaging Analytic & Object Detection">
      <div className="page-in">
        <PageHead
          icon={<ScanSearch size={22} />}
          title={t('Digital Imaging Analytic')}
          code="1.1a"
          description={t('Deteksi objek pada citra statis dengan bounding box, label kelas, dan nilai kepercayaan.')}
          actions={
            <>
              <button className="btn btn-secondary" disabled={!detectResult || saving} onClick={saveMedia}>
                {saving
                  ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan…')}</>
                  : <><Save size={15} /> {t('Simpan Media')}</>}
              </button>
              <button className="btn btn-primary sheen" onClick={analyze} disabled={analyzing}>
                {analyzing
                  ? <><RefreshCw size={15} className="spin" /> {t('Menganalisis…')}</>
                  : <><Crosshair size={15} /> {t('Jalankan Deteksi')}</>}
              </button>
            </>
          }
        />

        <input
          ref={inputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.tif,.tiff"
          hidden
          onChange={e => pick(e.target.files?.[0])}
        />

        <GlassCard tilt={false} style={{ marginBottom: 14 }}>
          <SectionHead icon={<ScanSearch size={15} />} title={t('Flight Mission')} sub={t('Wajib dipilih sebelum deteksi dapat dijalankan')} />
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
                {t('Pilih flight mission terkait terlebih dahulu — tombol Jalankan Deteksi aktif setelah ini terisi.')}
              </p>
            )}
          </div>
        </GlassCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead
                icon={<ImageIcon size={15} />}
                title={file ? 'Citra Unggahan' : 'Hasil Deteksi'}
                sub={file
                  ? `${file.name} · ${detectResult ? `${detectResult.processing_type} · ${detectResult.processing_time} ms` : 'belum dianalisis'}`
                  : 'Muat citra, pilih flight mission, lalu jalankan deteksi untuk melihat hasil'}
                right={detectResult && (
                  <span className="badge badge-info">{visible.length} objek</span>
                )}
              />

              {file && detectResult ? (
                <CompareSlider
                  labelBefore={t('Citra Asli')}
                  labelAfter={t('Bounding Box')}
                  aspect="16 / 9"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={file.url} alt="Citra asli" />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewUrl} alt="Citra dengan kotak deteksi objek" />
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
                  icon={<ScanSearch size={22} />}
                  title={t('Belum ada citra dianalisis')}
                  description={t('Muat citra, pilih flight mission, lalu jalankan deteksi untuk melihat hasil bounding box.')}
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
                <span className="uploader-ring"><UploadCloud size={22} /></span>
                <span className="uploader-copy">
                  <span className="uploader-title">{t('Analisis citra lain')}</span>
                  <span className="uploader-sub">{t('JPG, PNG, atau TIFF · maksimum 50 MB')}</span>
                </span>
                <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
              </div>
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead
                icon={<ListFilter size={15} />}
                title={t('Rincian Deteksi')}
                sub={detectResult ? `${visible.length} dari ${detectResult.objects.length} objek lolos ambang ≥ ${confidence}%` : undefined}
              />



              {visible.length === 0 ? (
                <EmptyState
                  icon={<Crosshair size={22} />}
                  title={t('Tidak ada objek di atas ambang')}
                  description={t('Jalankan deteksi, atau turunkan ambang kepercayaan untuk menampilkan hasil berkeyakinan lebih rendah.')}
                />
              ) : (
                <div className="table-container">
                  <table>
                    <thead>
                      <tr>
                        <th>{t('Kelas Objek')}</th>
                        <th>{t('Kepercayaan')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visible.map((d, i) => {
                        const pct = Math.round(d.confidence * 100);
                        const color = d.class === 'person' ? 'var(--accent-emerald)' : 'var(--accent-primary)';
                        return (
                          <tr key={`${d.class}-${i}`}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                {d.class === 'person' ? <PersonStanding size={13} /> : <Car size={13} />}
                                {d.class}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden', minWidth: 90 }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                                </div>
                                <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color }}>
                                  {pct}%
                                </span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}


/* =====================================================================
   1.1b — DIGITAL VIDEO ANALYTIC & OBJECT DETECTION
   ===================================================================== */
/* Hasil job yang dikumpulkan dari pesan WebSocket terakhir — cuma
   terisi begitu backend menandai job selesai (temp_path/processing_type
   ikut dikirim), dipakai menggerbangi tombol Simpan Media. */
interface VideoDetectJobResult {
  temp_path?: string;
  processing_type?: string;
  preview_url?: string;
  processing_time?: number;
}

/** Satu frame yang sudah diterima lewat WebSocket — direkam ke dalam
    array `frames` supaya seluruh proses bisa diputar ulang sebagai
    linimasa begitu job selesai, bukan cuma menampilkan frame terakhir. */
interface CapturedFrame {
  image: string;
  objects: DetectedObject[];
  /** milidetik sejak deteksi dimulai — dipakai label linimasa */
  t: number;
}

function formatElapsed(ms: number) {
  return `${(ms / 1000).toFixed(1)}s`;
}

/* Sumber RTSP disembunyikan sementara — backend baru mendukung deteksi
   lewat unggah berkas. Ganti ke true begitu jalur RTSP siap dipakai. */
const RTSP_SOURCE_ENABLED = false;

export function VideoDetectionPage() {
  const { pushToast, t } = useApp();
  const [source, setSource] = useState<'upload' | 'rtsp'>('upload');
  const [rtspUrl, setRtspUrl] = useState('rtsp://192.168.10.100:15004/stream1');
  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  /* Seluruh frame yang sudah diterima sejauh ini — linimasa proses. */
  const [frames, setFrames] = useState<CapturedFrame[]>([]);
  /* Indeks frame yang sedang ditampilkan. Mengikuti frame terbaru secara
     otomatis selama liveEdge true (posisi "siaran langsung"); begitu
     operator menggeser linimasa secara manual, liveEdge dimatikan supaya
     tampilan tidak "ditarik paksa" kembali ke ujung. */
  const [playIndex, setPlayIndex] = useState(0);
  const [liveEdge, setLiveEdge] = useState(true);
  /* Putar-ulang otomatis lewat frame yang sudah direkam — hanya berlaku
     setelah job selesai. */
  const [replaying, setReplaying] = useState(false);
  const [jobResult, setJobResult] = useState<VideoDetectJobResult | null>(null);
  const [confidence, setConfidence] = useState(10);
  const [saving, setSaving] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const currentIndex = liveEdge && running ? frames.length - 1 : playIndex;
  const currentFrame = frames[currentIndex];
  const finished = !running && frames.length > 0;

  /* Putar-ulang otomatis: majukan playIndex tiap ~130ms selagi replaying
     aktif, berhenti sendiri begitu mencapai frame terakhir. */
  useEffect(() => {
    if (!replaying) return;
    const id = window.setInterval(() => {
      setPlayIndex(i => {
        if (i + 1 >= frames.length) { setReplaying(false); return i; }
        return i + 1;
      });
    }, 130);
    return () => window.clearInterval(id);
  }, [replaying, frames.length]);

  /* Sama seperti ImageEnhancementPage/ImageDetectionPage — deteksi harus
     dikaitkan ke satu flight mission (hanya yang mission_status.name
     "Flight"), dan flight-information dimuat sekalian untuk resolusi
     flight_information_id saat menyimpan ke /media. */
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

  const visible = useMemo(
    () => (currentFrame?.objects ?? []).filter(o => o.confidence * 100 >= confidence),
    [currentFrame, confidence],
  );

  /* Hasil Deteksi dikelompokkan per kelas objek dan diurutkan berdasarkan
     jumlah kemunculannya pada frame ini — bukan lagi daftar per-objek
     yang diurutkan/ditampilkan berdasarkan confidence. */
  const classCounts = useMemo(() => {
    const counts = new globalThis.Map<string, number>();
    for (const o of visible) counts.set(o.class, (counts.get(o.class) ?? 0) + 1);
    return Array.from(counts, ([cls, count]) => ({ cls, count })).sort((a, b) => b.count - a.count);
  }, [visible]);

  const closeSocket = () => {
    wsRef.current?.close();
    wsRef.current = null;
    setRunning(false);
  };

  /* Socket ditutup otomatis kalau operator berpindah halaman di
     tengah-tengah job berjalan. */
  useEffect(() => () => { wsRef.current?.close(); }, []);

  const openSocket = (jobId: string) => {
    const socket = new WebSocket(`${WS_BASE}/detect/ws/${jobId}`);
    wsRef.current = socket;
    startedAtRef.current = Date.now();

    socket.onopen = () => setRunning(true);

    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as DetectVideoFrameMessage;
        if (data.frame) {
          const t = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
          setFrames(prev => [...prev, { image: `data:image/jpeg;base64,${data.frame}`, objects: data.objects ?? [], t }]);
        }
        /* Job selesai — backend menyertakan medan penyelesaian di pesan
           terakhir, jadi digabung apa adanya begitu muncul. */
        if (data.temp_path || data.processing_type) {
          setJobResult(prev => ({
            ...prev,
            temp_path: data.temp_path ?? prev?.temp_path,
            processing_type: data.processing_type ?? prev?.processing_type,
            preview_url: data.preview_url ?? prev?.preview_url,
            processing_time: data.processing_time ?? prev?.processing_time,
          }));
        }
      } catch {
        /* pesan bukan JSON — diabaikan */
      }
    };

    socket.onerror = () => {
      pushToast({ tone: 'error', title: t('Koneksi deteksi terputus'), detail: t('WebSocket ke server deteksi video gagal.') });
    };

    socket.onclose = () => setRunning(false);
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(mp4|avi|mov|mkv)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: t('Format tidak didukung'), detail: t('Gunakan berkas MP4, AVI, MOV, atau MKV.') });
      return;
    }
    closeSocket();
    setFile({ name: f.name, url: URL.createObjectURL(f), raw: f });
    setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null);
  };

  const startDetection = async () => {
    if (starting || running) return;
    if (!missionId) {
      pushToast({ tone: 'error', title: t('Pilih flight mission dahulu'), detail: t('Flight mission wajib dipilih sebelum menjalankan deteksi.') });
      return;
    }
    if (source === 'rtsp') {
      pushToast({ tone: 'info', title: t('Sumber RTSP belum tersedia'), detail: t('Untuk saat ini jalankan deteksi lewat unggah berkas video.') });
      return;
    }
    if (!file) {
      pushToast({ tone: 'error', title: t('Unggah berkas video dahulu'), detail: t('Pilih atau seret berkas video sebelum menjalankan deteksi.') });
      return;
    }
    setStarting(true);
    setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null);
    try {
      const job = await api.detectVideo(file.raw);
      openSocket(job.job_id);
    } catch {
      pushToast({ tone: 'error', title: t('Gagal memulai deteksi'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
    } finally {
      setStarting(false);
    }
  };

  const saveMedia = async () => {
    if (!jobResult?.temp_path || !jobResult?.processing_type || !missionId || saving) return;
    if (flightInfoId == null) {
      pushToast({
        tone: 'error',
        title: t('Flight mission belum punya data flight information'),
        detail: t('Tidak ditemukan flight-information untuk misi ini. Lengkapi datanya di modul Flight Information dahulu.'),
      });
      return;
    }
    setSaving(true);
    try {
      await api.createMedia({
        flight_information_id: flightInfoId,
        temp_path: jobResult.temp_path,
        processing_type: jobResult.processing_type,
      });
      pushToast({
        tone: 'success',
        title: t('Video hasil deteksi disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; video asli tetap utuh.'),
      });
      closeSocket();
      setFile(null); setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null); setMissionId('');
    } catch {
      pushToast({ tone: 'error', title: t('Gagal menyimpan media'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(jobResult?.temp_path && jobResult?.processing_type);

  return (
    <LicenseGate moduleCode="1.1b" moduleName="Digital Video Analytic & Object Detection">
      <div className="animate-fade-in">
        <PageHead
          icon={<Clapperboard size={22} />}
          title={t('Digital Video Analytic')}
          code="1.1b"
          description={t('Deteksi dan pelacakan objek bergerak pada video misi.')}
          actions={
            <>
              <button className="btn btn-secondary" disabled={!canSave || saving} onClick={saveMedia}>
                {saving
                  ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan…')}</>
                  : <><Save size={15} /> {t('Simpan Media')}</>}
              </button>
              {running ? (
                <button className="btn btn-danger" onClick={closeSocket}><Square size={15} /> {t('Hentikan')}</button>
              ) : (
                <button className="btn btn-primary sheen" onClick={startDetection} disabled={starting}>
                  {starting
                    ? <><Loader2 size={15} className="spin" /> {t('Memulai…')}</>
                    : <><Play size={15} /> {t('Jalankan Deteksi')}</>}
                </button>
              )}
            </>
          }
        />

        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.avi,.mov,.mkv"
          hidden
          onChange={e => { pick(e.target.files?.[0]); if (inputRef.current) inputRef.current.value = ''; }}
        />

        <GlassCard tilt={false} style={{ marginBottom: 14 }}>
          <SectionHead icon={<Clapperboard size={15} />} title={t('Flight Mission')} sub={t('Wajib dipilih sebelum deteksi dapat dijalankan')} />
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
          </div>
        </GlassCard>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 484px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead
                icon={<Video size={15} />}
                title={finished ? t('Putar Ulang Deteksi') : t('Umpan Deteksi')}
                sub={
                  running ? t('Aliran langsung dari job berjalan')
                    : finished ? t('Job selesai — geser linimasa untuk meninjau ulang')
                      : file ? file.name : t('Belum ada video dimuat')
                }
                right={running
                  ? <span className={`badge ${liveEdge ? 'badge-success' : 'badge-neutral'}`}>{liveEdge ? t('LIVE') : t('DIJEDA')}</span>
                  : finished && <span className="badge badge-info">{t('SELESAI')}</span>}
              />

              {currentFrame ? (
                <div className="cmp" style={{ aspectRatio: '16 / 9' }}>
                  <div className="cmp-layer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentFrame.image} alt="Frame deteksi" />
                  </div>
                </div>
              ) : file ? (
                <VideoPlayer src={file.url} label={file.name} sublabel={t('Menunggu deteksi dimulai')} aspect="16 / 9" />
              ) : (
                <EmptyState
                  icon={<FileVideo size={22} />}
                  title={t('Belum ada video dimuat')}
                  description={t('Pilih sumber video di panel kanan, lalu jalankan deteksi untuk melihat umpan langsung.')}
                />
              )}

              {frames.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {finished && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (!replaying && currentIndex >= frames.length - 1) setPlayIndex(0);
                          setReplaying(r => !r);
                        }}
                      >
                        {replaying ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                    )}
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', minWidth: 46 }}>
                      {formatElapsed(currentFrame?.t ?? 0)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, frames.length - 1)}
                      value={currentIndex}
                      onChange={e => { setLiveEdge(false); setReplaying(false); setPlayIndex(Number(e.target.value)); }}
                      style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                    />
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
                      {t('frame')} {currentIndex + 1}/{frames.length}
                    </span>
                    {running && !liveEdge && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setLiveEdge(true); setReplaying(false); }}>
                        {t('Ke Live')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead
                icon={<ListFilter size={15} />}
                title={t('Hasil Deteksi')}
                // sub={(currentFrame?.objects.length ?? 0) > 0 ? `${visible.length} dari ${currentFrame?.objects.length} objek lolos ambang ≥ ${confidence}%` : undefined}
              />
              {/* <div className="form-group">
                <label className="form-label" htmlFor="vid-ambang">{t('Ambang Kepercayaan')} — {confidence}%</label>
                <input
                  id="vid-ambang"
                  type="range" min={0} max={95} value={confidence}
                  onChange={e => setConfidence(Number(e.target.value))}
                  style={{ width: '100%', accentColor: 'var(--accent-primary)' }}
                />
              </div> */}

              {classCounts.length === 0 ? (
                <EmptyState
                  icon={<Crosshair size={22} />}
                  title={t('Belum ada objek terdeteksi')}
                  description={t('Jalankan deteksi untuk melihat rekap jumlah objek per kelas.')}
                />
              ) : (
                <div className="table-container" style={{ maxHeight: 260, overflowY: 'auto' }}>
                  <table>
                    <thead>
                      <tr><th>{t('Kelas Objek')}</th><th>{t('Jumlah')}</th></tr>
                    </thead>
                    <tbody>
                      {classCounts.map(({ cls, count }) => {
                        const pct = Math.round((count / classCounts[0].count) * 100);
                        const color = cls === 'person' ? 'var(--accent-emerald)' : 'var(--accent-primary)';
                        return (
                          <tr key={cls}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                                {cls === 'person' ? <PersonStanding size={13} /> : <Car size={13} />}
                                {cls}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden', minWidth: 90 }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                                </div>
                                <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color }}>{count}</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Radio size={15} />} title={t('Sumber Video')} />
              {RTSP_SOURCE_ENABLED && (
                <div className="form-group">
                  <label className="form-label">{t('Jenis Sumber')}</label>
                  <Segmented
                    full
                    value={source}
                    options={[{ id: 'upload', label: t('Unggah Berkas') }, { id: 'rtsp', label: 'RTSP' }]}
                    onChange={setSource}
                  />
                </div>
              )}

              {RTSP_SOURCE_ENABLED && source === 'rtsp' ? (
                <div className="form-group">
                  <label className="form-label" htmlFor="vid-rtsp">{t('Alamat RTSP')}</label>
                  <input
                    id="vid-rtsp"
                    className="form-input"
                    value={rtspUrl}
                    onChange={e => setRtspUrl(e.target.value)}
                  />
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.55 }}>
                    {t('Sumber RTSP baru sebatas pratinjau alamat — jalankan deteksi lewat unggah berkas video untuk saat ini.')}
                  </p>
                </div>
              ) : (
                <div
                  className={`uploader ${drag ? 'drag' : ''}`}
                  onClick={() => inputRef.current?.click()}
                  onDragOver={e => { e.preventDefault(); setDrag(true); }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={e => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files?.[0]); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
                >
                  <span className="uploader-ring"><UploadCloud size={22} /></span>
                  <span className="uploader-copy">
                    <span className="uploader-title">{t('Seret berkas video, atau telusuri')}</span>
                    <span className="uploader-sub">{t('MP4, AVI, MOV, atau MKV')}</span>
                  </span>
                  <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
                </div>
              )}
            </GlassCard>
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}
