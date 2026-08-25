'use client';
import React, { useId, useEffect, useMemo, useRef, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import LicenseGate from '../../components/LicenseGate';
import GlassCard from '../../components/GlassCard';
import { useApp } from '../../context';
import {
  PageHead, OfflineNotice, Metric, MetricRow, SectionHead, KVList,
  Sparkline, EmptyState, Segmented, Bar,
  ConfigSelect, ConfigToggle,
} from '../../components/ui';
import { salinTeks } from '../../lib/clipboard';
import { Switch } from '../../components/fx';
import api, {
  type FlightSimulationRecord, type LocationRecord, type BalloonRecord, type OperatorRecord,
  type FlightMissionRecord, type FlightInformationRecord,
} from '../../services/api';
/* Katalog basemap dan geodesi diambil dari lib/geo — modul murni tanpa
   Leaflet, agar bundel server tidak ikut memuat pustaka peta. */
import { BASEMAPS, bearingBetween, distanceBetween, type BasemapId } from '../../lib/geo';

/* Leaflet menyentuh objek window saat dimuat, sehingga peta hanya boleh
   dirakit di peramban — bukan saat pra-render di server. */
const EsriMap = dynamic(() => import('../../components/EsriMap'), {
  ssr: false,
  loading: () => (
    <div className="esri-wrap" style={{ height: 420, display: 'grid', placeItems: 'center' }}>
      <span style={{ fontSize: 11.5, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>
        MENYIAPKAN KANVAS PETA…
      </span>
    </div>
  ),
});
import {
  FileBarChart2, FileText, FileSpreadsheet, Download, CalendarRange,
  Map, Target, Layers, Crosshair, MapPin, Navigation,
  BellRing, Plus, Check, Filter, AlertTriangle, ShieldAlert, Info,
  PlaneTakeoff, ClipboardCheck, Timer, Users2, Anchor, Wind, Gauge,
  Thermometer, BatteryCharging, Zap, CloudLightning, Waves,
  FlaskConical, Play, CircleCheck, CircleX, CircleAlert, Radio,
  RefreshCw, Eye, Activity, Ruler, Copy, Pencil, Trash2,
  CheckCheck, X, Inbox, ToggleLeft, ToggleRight, Save, Loader2, History, Square,
  ChevronLeft, ChevronRight,
} from 'lucide-react';
import {
  fullTimestamp, loadRules, saveRules, CATEGORIES,
  type AlertRule, type Severity, type Category, type AppNotification,
} from '../../lib/notifications';

function series(seed: number, len: number, base: number, spread: number, digits = 0) {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    out.push(Number((base + ((s / 2147483647) - 0.5) * spread).toFixed(digits)));
  }
  return out;
}

function Tile({ icon, accent, label, value, foot }: {
  icon: React.ReactNode; accent: string; label: string; value: string; foot?: string;
}) {
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
      <span style={{ minWidth: 0 }}>
        <span className="lbl">{label}</span>
        <span className="val" style={{ fontSize: 17 }}>{value}</span>
        {foot && <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-disabled)', marginTop: 2 }}>{foot}</span>}
      </span>
    </div>
  );
}

/* Kotak tanggal terkendali — dipakai pada penyaring rentang laporan. */
function DateBox({ initial, id }: { initial: string; id?: string }) {
  const [v, setV] = useState(initial);
  return (
    <input
      id={id}
      className="form-input font-mono"
      type="date"
      value={v}
      onChange={e => setV(e.target.value)}
    />
  );
}

/* =====================================================================
   1.3a — DIGITAL REPORTING
   ===================================================================== */
const REPORT_TEMPLATES = [
  { id: 'daily', name: 'Laporan Operasi Harian', desc: 'Rekapitulasi misi, jam terbang, temuan analitik, dan status perangkat dalam satu hari operasi.', sections: 7 },
  { id: 'weekly', name: 'Rekapitulasi Mingguan', desc: 'Agregasi tujuh hari: tren kepadatan, jumlah deteksi, ketersediaan sistem, dan insiden.', sections: 9 },
  { id: 'incident', name: 'Laporan Insiden', desc: 'Kronologi peristiwa, bukti tangkapan layar, koordinat, dan tindakan penanganan.', sections: 6 },
  { id: 'flight', name: 'Laporan Penerbangan', desc: 'Logbook per misi: takeoff, landing, ketinggian, konsumsi helium, dan tim operator.', sections: 8 },
  { id: 'crowd', name: 'Analisis Kepadatan Massa', desc: 'Grafik kepadatan per zona, puncak, rata-rata, dan pelanggaran ambang batas.', sections: 5 },
  { id: 'maintenance', name: 'Laporan Pemeliharaan', desc: 'Hasil diagnostik kabel penambat, mooring, dan gimbal beserta rekomendasi tindakan.', sections: 6 },
];

const CLASSIFICATIONS = ['BIASA', 'TERBATAS', 'RAHASIA', 'SANGAT RAHASIA'];

export function ReportingPage() {
  const { pushToast, notify, account, t } = useApp();
  const [template, setTemplate] = useState(REPORT_TEMPLATES[0].id);
  const [format, setFormat] = useState<'pdf' | 'xlsx'>('pdf');
  const [classification, setClassification] = useState('TERBATAS');
  const [generating, setGenerating] = useState(false);

  const selected = REPORT_TEMPLATES.find(tpl => tpl.id === template)!;

  const generate = () => {
    setGenerating(true);
    window.setTimeout(() => {
      setGenerating(false);
      pushToast({
        tone: 'success',
        title: 'Laporan berhasil dibuat',
        detail: `${selected.name} · format ${format.toUpperCase()} · klasifikasi ${classification} · watermark ${account?.stationCode ?? 'GCS'}.`,
      });
      notify({
        title: 'Laporan berhasil dibuat',
        detail: `${selected.name} · format ${format.toUpperCase()} · klasifikasi ${classification} · watermark ${account?.stationCode ?? 'GCS'}.`,
        severity: 'informasi',
        category: 'Sistem',
        source: 'Digital Reporting',
        page: 'reporting',
        silent: true,
      });
    }, 1500);
  };

  return (
    <LicenseGate moduleCode="1.3a" moduleName="Digital Reporting Tethered Balloon">
      <div className="animate-fade-in">
        <PageHead
          icon={<FileBarChart2 size={22} />}
          title={t('Digital Reporting')}
          code="1.3a"
          description={t('Laporan misi otomatis dalam format PDF dan Excel berwatermark klasifikasi.')}
          actions={
            <button className="btn btn-primary" onClick={generate} disabled={generating}>
              {generating ? <><RefreshCw size={15} className="spin" /> {t('Menyusun…')}</> : <><FileText size={15} /> {t('Buat Laporan')}</>}
            </button>
          }
        />

        <div className="lic-summary">
          <Tile icon={<FileText size={19} />} accent="var(--accent-primary)" label={t('Templat Tersedia')} value={String(REPORT_TEMPLATES.length)} />
          <Tile icon={<Download size={19} />} accent="var(--accent-emerald)" label={t('Laporan Bulan Ini')} value="34" foot={t('Juli 2026')} />
          <Tile icon={<CalendarRange size={19} />} accent="var(--accent-secondary)" label={t('Jadwal Otomatis')} value="2 aktif" foot={t('harian & mingguan')} />
          <Tile icon={<ShieldAlert size={19} />} accent="var(--accent-tertiary)" label={t('Klasifikasi Default')} value={classification} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 340px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead icon={<Layers size={15} />} title={t('Pilih Templat Laporan')} sub={`${selected.sections} bagian akan disertakan`} />
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 8 }}>
                {REPORT_TEMPLATES.map(tpl => (
                  <button
                    key={tpl.id}
                    onClick={() => setTemplate(tpl.id)}
                    className={`select-card ${template === tpl.id ? 'on' : ''}`}
                  >
                    <span className="sc-title">{t(tpl.name)}</span>
                    <span className="sc-desc">{t(tpl.desc)}</span>
                    <span className="sc-foot">{tpl.sections} bagian</span>
                  </button>
                ))}
              </div>
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead icon={<FileText size={15} />} title={t('Riwayat Laporan')} sub={t('Enam laporan terakhir')} />
              <div className="table-container">
                <table>
                  <thead><tr><th>{t('Judul')}</th><th>{t('Jenis')}</th><th>{t('Format')}</th><th>{t('Klasifikasi')}</th><th>{t('Dibuat')}</th><th style={{ textAlign: 'right' }}>{t('Aksi')}</th></tr></thead>
                  <tbody>
                    {[
                      ['Laporan Operasi Harian — 27 Jul 2026', 'Harian', 'PDF', 'TERBATAS', '2026-07-27 12:00'],
                      ['Analisis Kepadatan Zona A — Pekan 30', 'Analitik', 'XLSX', 'BIASA', '2026-07-27 09:15'],
                      ['Laporan Penerbangan Misi #24', 'Penerbangan', 'PDF', 'TERBATAS', '2026-07-27 11:35'],
                      ['Laporan Insiden — Geofence NW', 'Insiden', 'PDF', 'RAHASIA', '2026-07-26 14:22'],
                      ['Rekapitulasi Mingguan — Pekan 29', 'Mingguan', 'XLSX', 'TERBATAS', '2026-07-21 08:00'],
                      ['Laporan Pemeliharaan Tether', 'Pemeliharaan', 'PDF', 'BIASA', '2026-07-20 16:40'],
                    ].map(([judul, jenis, fmt, klas, waktu]) => (
                      <tr key={judul}>
                        <td style={{ fontWeight: 600, fontSize: 12.5 }}>{judul}</td>
                        <td><span className="badge badge-info">{jenis}</span></td>
                        <td>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            {fmt === 'PDF' ? <FileText size={13} /> : <FileSpreadsheet size={13} />} {fmt}
                          </span>
                        </td>
                        <td>
                          <span className={`badge badge-${klas === 'RAHASIA' ? 'danger' : klas === 'TERBATAS' ? 'warning' : 'neutral'}`}>{klas}</span>
                        </td>
                        <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>{waktu}</td>
                        <td>
                          <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                            <button
                              className="btn btn-ghost btn-sm"
                              title={`Pratinjau ${judul}`}
                              onClick={() => {
                                pushToast({
                                  tone: 'info',
                                  title: 'Membuka pratinjau laporan',
                                  detail: `${judul} — ${fmt}, klasifikasi ${klas}.`,
                                });
                                notify({
                                  title: 'Membuka pratinjau laporan',
                                  detail: `${judul} — ${fmt}, klasifikasi ${klas}.`,
                                  severity: 'informasi',
                                  category: 'Sistem',
                                  source: 'Digital Reporting',
                                  page: 'reporting',
                                  silent: true,
                                });
                              }}
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              className="btn btn-ghost btn-sm"
                              title={`Unduh ${judul}`}
                              onClick={() => {
                                pushToast({
                                  tone: 'success',
                                  title: 'Laporan diunduh',
                                  detail: `${judul} disalin ke folder ekspor stasiun dalam format ${fmt}.`,
                                });
                                notify({
                                  title: 'Laporan diunduh',
                                  detail: `${judul} disalin ke folder ekspor stasiun dalam format ${fmt}.`,
                                  severity: 'informasi',
                                  category: 'Sistem',
                                  source: 'Digital Reporting',
                                  page: 'reporting',
                                  silent: true,
                                });
                              }}
                            >
                              <Download size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Filter size={15} />} title={t('Parameter Laporan')} />
              <ConfigSelect label={"Rentang Waktu"} options={["Hari ini", "7 hari terakhir", "30 hari terakhir", "Rentang khusus"]} />
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="lap-dari">{t('Dari')}</label>
                  <DateBox id="lap-dari" initial="2026-07-27" />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="lap-sampai">{t('Sampai')}</label>
                  <DateBox id="lap-sampai" initial="2026-07-27" />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{t('Format Berkas')}</label>
                <Segmented
                  full
                  value={format}
                  options={[
                    { id: 'pdf', label: 'PDF', icon: <FileText size={13} /> },
                    { id: 'xlsx', label: 'Excel', icon: <FileSpreadsheet size={13} /> },
                  ]}
                  onChange={setFormat}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('Klasifikasi Dokumen')}</label>
                <select className="form-select" value={classification} onChange={e => setClassification(e.target.value)}>
                  {CLASSIFICATIONS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<ClipboardCheck size={15} />} title={t('Konten yang Disertakan')} />
              {[
                'Ringkasan eksekutif misi',
                'Data penerbangan & jam operasi',
                'Grafik sensor mooring & tether',
                'Tangkapan layar kamera EO/IR',
                'Statistik deteksi objek',
                'Rekapitulasi crowd counting',
                'Daftar alert & tindak lanjut',
              ].map((item, i) => (
                <ConfigToggle key={item} label={item} initial={i < 6} />
              ))}
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<ShieldAlert size={15} />} title={t('Watermark & Pengesahan')} />
              <KVList rows={[
                ['Instansi', 'Badan Intelijen Negara'],
                ['Stasiun', account?.stationCode ?? 'GCS'],
                ['Watermark', classification],
                ['Penyusun', account?.username ?? '—'],
                ['Nomor Dokumen', 'Otomatis (urut per hari)'],
              ]} />
            </GlassCard>
          </div>
        </div>
      </div>
    </LicenseGate>
  );
}

/* =====================================================================
   1.3b — DIGITAL VISUALISATION INFORMATION GEOINT
   ===================================================================== */
interface TargetPoint {
  /** Id misi asli dari backend — bisa angka atau string (UUID). Sentinel
      angka negatif dipakai hanya bila backend sama sekali tidak
      mengirim id (lihat loadDoneTargets). */
  id: string | number;
  name: string;
  lat: number;
  lon: number;
  threat: 'rendah' | 'sedang' | 'tinggi';
  range: number;
}

/* Target Bank tidak lagi diisi manual — daftar ini dimuat dari misi
   berstatus Done (GET /flight-missions), lihat loadDoneTargets(). */

/* Menyimpan berkas ke perangkat operator. Karena stasiun tertutup,
   "ekspor" berarti menulis salinan ke penyimpanan lokal — bukan
   mengunggah ke layanan luar. */
function saveFile(name: string, mime: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  /* Beri kesempatan peramban memulai unduhan sebelum URL dilepas. */
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

const xml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function buildKML(targets: TargetPoint[], station: string, lat: number, lon: number): string {
  const marks = targets.map(tp => `    <Placemark>
      <name>${xml(tp.name)}</name>
      <description>Lokasi misi selesai — jarak ${tp.range} m dari titik gelar</description>
      <Point><coordinates>${tp.lon.toFixed(6)},${tp.lat.toFixed(6)},0</coordinates></Point>
    </Placemark>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<kml xmlns="http://www.opengis.net/kml/2.2">
  <Document>
    <name>Target Bank — ${xml(station)}</name>
    <description>Diekspor dari Tethered Balloon GeoInt Monitoring System</description>
    <Placemark>
      <name>Titik Gelar ${xml(station)}</name>
      <Point><coordinates>${lon.toFixed(6)},${lat.toFixed(6)},0</coordinates></Point>
    </Placemark>
${marks}
  </Document>
</kml>`;
}

function buildGPX(targets: TargetPoint[], station: string): string {
  const pts = targets.map(tp => `  <wpt lat="${tp.lat.toFixed(6)}" lon="${tp.lon.toFixed(6)}">
    <name>${xml(tp.name)}</name>
    <desc>Lokasi misi selesai — jarak ${tp.range} m</desc>
    <sym>Flag</sym>
  </wpt>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="Tethered Balloon GeoInt Monitoring System"
     xmlns="http://www.topografix.com/GPX/1/1">
  <metadata><name>Target Bank — ${xml(station)}</name></metadata>
${pts}
</gpx>`;
}

export function GeoVisualizationPage() {
  const { pushToast, notify, account, t } = useApp();

  const [targets, setTargets] = useState<TargetPoint[]>([]);
  const [targetsLoading, setTargetsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | number | null>(null);
  const [basemap, setBasemap] = useState<BasemapId>('imagery');
  const [showFov, setShowFov] = useState(false);
  const [showRings, setShowRings] = useState(false);
  const [showGeofence, setShowGeofence] = useState(false);
  const [showTrack, setShowTrack] = useState(false);
  const [fovDeg, setFovDeg] = useState(34);

  /* Alat kerja peta */
  const [measureMode, setMeasureMode] = useState(false);
  const [measured, setMeasured] = useState<{ dist: number; bearing: number } | null>(null);
  const [focus, setFocus] = useState<{ lat: number; lon: number; zoom?: number; nonce: number } | null>(null);

  const [liveCoords, setLiveCoords] = useState<{ lat: number; lon: number } | null>(null);

  /* Modal Detail Misi — dibuka dari klik titik di peta maupun baris
     Target Bank di sidebar (keduanya lewat pickTarget yang sama). */
  const [detailTargetId, setDetailTargetId] = useState<string | number | null>(null);
  const [missionDetail, setMissionDetail] = useState<FlightMissionRecord | null>(null);
  const [missionDetailInfo, setMissionDetailInfo] = useState<FlightInformationRecord | null>(null);
  const [missionDetailLoading, setMissionDetailLoading] = useState(false);

  /* Titik gelar mengikuti lokasi perangkat bila diizinkan; jika ditolak
     atau gagal, tetap pakai koordinat stasiun yang terkonfigurasi. */
  useEffect(() => {
    // console.log(!('geolocation' in navigator))
    if (!('geolocation' in navigator)) return;
    const watchId = navigator.geolocation.watchPosition(
      pos => setLiveCoords({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      () => {
        pushToast({
          tone: 'warning',
          title: t('Lokasi perangkat tidak tersedia'),
          detail: t('Menggunakan koordinat stasiun yang terkonfigurasi.'),
        });
        notify({
          title: t('Lokasi perangkat tidak tersedia'),
          detail: t('Menggunakan koordinat stasiun yang terkonfigurasi.'),
          severity: 'peringatan',
          category: 'Geofence',
          source: 'GeoInt Visualisation',
          page: 'geo-viz',
          silent: true,
        });
      },
      { enableHighAccuracy: true, maximumAge: 10000 },
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const camLat = liveCoords?.lat ?? account?.siteCoords.lat ?? -6.2088;
  const camLon = liveCoords?.lon ?? account?.siteCoords.lon ?? 106.8456;
  const station = account?.stationCode ?? 'GCS';
  const ALT_AGL = 450;

  const selected = targets.find(tp => tp.id === selectedId) ?? null;

  /* Solusi geolokasi dihitung dari geometri sebenarnya. */
  const solution = useMemo(() => {
    if (!selected) return null;
    const ground = distanceBetween(camLat, camLon, selected.lat, selected.lon);
    const slant = Math.sqrt(ground ** 2 + ALT_AGL ** 2);
    const azimuth = bearingBetween(camLat, camLon, selected.lat, selected.lon);
    const depression = (Math.atan2(ALT_AGL, ground) * 180) / Math.PI;
    const swath = 2 * slant * Math.tan((fovDeg / 2) * (Math.PI / 180));
    return { ground, slant, azimuth, depression, swath, gsd: (swath / 1920) * 100 };
  }, [selected, camLat, camLon, fovDeg]);

  const flyTo = (lat: number, lon: number, zoom?: number) =>
    setFocus({ lat, lon, zoom, nonce: Date.now() });

  const pickTarget = (tp: TargetPoint) => {
    setSelectedId(tp.id);
    flyTo(tp.lat, tp.lon);
    if (typeof tp.id === 'number' && tp.id < 0) {
      pushToast({
        tone: 'warning',
        title: t('Data misi tidak lengkap'),
        detail: t('Misi ini tidak memiliki id yang valid untuk dimuat detailnya.'),
      });
      return;
    }
    setDetailTargetId(tp.id);
  };

  /* Detail misi + flight-information digabung berdasarkan mission_id,
     dipicu setiap kali target baru dipilih (lihat pickTarget). */
  useEffect(() => {
    if (detailTargetId == null) return;
    let cancelled = false;
    setMissionDetailLoading(true);
    setMissionDetail(null);
    setMissionDetailInfo(null);
    Promise.all([
      api.getFlightMissionById(detailTargetId).catch(() => null),
      api.getFlightInformation().catch(() => []),
    ]).then(([mission, infoRows]) => {
      if (cancelled) return;
      setMissionDetail(mission);
      setMissionDetailInfo(infoRows.find(i => String(i.mission_id) === String(detailTargetId)) ?? null);
    }).finally(() => { if (!cancelled) setMissionDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailTargetId]);

  /* Target Bank dimuat dari misi berstatus Done — setiap misi punya relasi
     location dengan latitude/longitude. Dipanggil sekali saat mount; tidak
     bergantung pada camLat/camLon (yang terus berubah lewat watchPosition)
     supaya tidak memicu fetch berulang. */
  const loadDoneTargets = async () => {
    setTargetsLoading(true);
    try {
      const missions = await api.getFlightMissions().catch(() => []);
      const mapped: TargetPoint[] = [];
      missions
        .filter(m => missionStatusName(m) === 'Done')
        .forEach((m, idx) => {

          const lat = Number(m.location?.latitude);
          const lon = Number(m.location?.longitude);
          // console.log(!Number.isFinite(lat) || !Number.isFinite(lon))
          if (!Number.isFinite(lat) || !Number.isFinite(lon)) return;
          const range = Math.round(
            Math.sqrt(distanceBetween(camLat, camLon, lat, lon) ** 2 + ALT_AGL ** 2),
          );
          /* Id misi dipakai apa adanya (angka ATAU string/UUID) supaya
             tetap bisa dicocokkan lewat GET /flight-missions/{id} —
             sentinel angka negatif hanya untuk kasus backend tidak
             mengirim id sama sekali. */
          mapped.push({
            id: m.id != null && m.id !== '' ? m.id : -(idx + 1),
            name: String(m.mission_name || m.mission_code || `Misi ${idx + 1}`),
            lat, lon, threat: 'rendah', range,
          });
        });
      setTargets(mapped);
      setSelectedId(mapped[0]?.id ?? null);
    } finally {
      setTargetsLoading(false);
    }
  };

  useEffect(() => { loadDoneTargets(); }, []);

  const copyCoords = async () => {
    if (!selected) return;
    const text = `${selected.lat.toFixed(6)}, ${selected.lon.toFixed(6)}`;
    if (await salinTeks(text)) {
      pushToast({ tone: 'success', title: t('Koordinat disalin'), detail: text });
      notify({
        title: t('Koordinat disalin'),
        detail: text,
        severity: 'informasi',
        category: 'Geofence',
        source: 'GeoInt Visualisation',
        page: 'geo-viz',
        silent: true,
      });
    } else {
      pushToast({ tone: 'error', title: t('Gagal menyalin'), detail: t('Peramban menolak akses papan klip.') });
      notify({
        title: t('Gagal menyalin'),
        detail: t('Peramban menolak akses papan klip.'),
        severity: 'peringatan',
        category: 'Geofence',
        source: 'GeoInt Visualisation',
        page: 'geo-viz',
        silent: true,
      });
    }
  };

  const exportTargets = (fmt: 'KML' | 'GPX') => {
    if (targets.length === 0) {
      pushToast({ tone: 'warning', title: 'Target Bank kosong', detail: 'Belum ada misi berstatus Done untuk diekspor.' });
      notify({
        title: 'Target Bank kosong',
        detail: 'Belum ada misi berstatus Done untuk diekspor.',
        severity: 'peringatan',
        category: 'Geofence',
        source: 'GeoInt Visualisation',
        page: 'geo-viz',
        silent: true,
      });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    if (fmt === 'KML') {
      saveFile(`TargetBank_${station}_${stamp}.kml`,
        'application/vnd.google-earth.kml+xml',
        buildKML(targets, station, camLat, camLon));
    } else {
      saveFile(`TargetBank_${station}_${stamp}.gpx`,
        'application/gpx+xml',
        buildGPX(targets, station));
    }
    pushToast({
      tone: 'success',
      title: `Target Lokasi diekspor — ${fmt}`,
      detail: `${targets.length} titik koordinat WGS-84 ditulis ke berkas.`,
    });
    notify({
      title: `Target Lokasi diekspor — ${fmt}`,
      detail: `${targets.length} titik koordinat WGS-84 ditulis ke berkas.`,
      severity: 'informasi',
      category: 'Geofence',
      source: 'GeoInt Visualisation',
      page: 'geo-viz',
      silent: true,
    });
  };

  return (
    <LicenseGate moduleCode="1.3b" moduleName="Digital Visualisation Information GeoInt">
      <div className="page-in">
        <PageHead
          icon={<Map size={22} />}
          title={t('GeoInt Visualisation')}
          code="1.3b"
          description={t('Peta taktis di atas basemap Esri dengan proyeksi pandang kamera.')}
          actions={
            <>
              <button className="btn btn-secondary sheen" onClick={() => exportTargets('KML')}>
                <Download size={15} /> Ekspor KML
              </button>
              <button className="btn btn-secondary sheen" onClick={() => exportTargets('GPX')}>
                <Download size={15} /> Ekspor GPX
              </button>
            </>
          }
        />

        <div className="geo-layout" style={{ display: 'grid', gridTemplateColumns: 'minmax(0px, 1fr) 451px', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            {/* ---- Bilah alat peta ---- */}
            <div className="map-toolbar">
              <button
                className={`map-tool ${measureMode ? 'on' : ''}`}
                onClick={() => { setMeasureMode(v => !v); setMeasured(null); }}
                title={t('Ukur jarak dan baringan antara dua titik')}
              >
                <Ruler size={14} /> Ukur Jarak
              </button>
              {/* <button
                className="map-tool"
                onClick={() => flyTo(camLat, camLon, 14)}
                title={t('Kembali ke titik gelar stasiun')}
              >
                <Crosshair size={14} /> Pusatkan Stasiun
              </button> */}
              <button
                className="map-tool"
                onClick={copyCoords}
                disabled={!selected}
                title={t('Salin koordinat target terpilih')}
              >
                <Copy size={14} /> Salin Koordinat
              </button>

              {measured && (
                <span className="map-measure-out">
                  <Ruler size={12} />
                  {measured.dist >= 1000
                    ? `${(measured.dist / 1000).toFixed(2)} km`
                    : `${Math.round(measured.dist)} m`}
                  <b>·</b>
                  {measured.bearing.toFixed(1)}°
                </span>
              )}
            </div>

            <EsriMap
              camLat={camLat}
              camLon={camLon}
              altitude={ALT_AGL}
              targets={targets}
              selected={selected}
              onSelect={pickTarget}
              basemap={basemap}
              onBasemapFallback={(reason) => {
                pushToast({ tone: 'warning', title: 'Basemap beralih ke mode luring', detail: reason });
                notify({
                  title: 'Basemap beralih ke mode luring',
                  detail: reason,
                  severity: 'peringatan',
                  category: 'Geofence',
                  source: 'GeoInt Visualisation',
                  page: 'geo-viz',
                  silent: true,
                });
              }}
              showFov={showFov}
              showRings={showRings}
              showGeofence={showGeofence}
              showTrack={showTrack}
              showStation={false}
              initialZoom={5}
              fovDeg={fovDeg}
              height={468}
              measureMode={measureMode}
              onMeasure={(r) => setMeasured({ dist: r.dist, bearing: r.bearing })}
            // focus={focus}
            />

            {/* <GlassCard tilt={false}>
              <SectionHead
                icon={<Crosshair size={15} />}
                title={t('Solusi Geolokasi')}
                sub={selected ? `Target terkunci — ${selected.name}` : 'Belum ada target terpilih'}
              />
              {solution && selected ? (
                <MetricRow cols={4}>
                  <Metric label={t('Lintang Target')} value={`${selected.lat.toFixed(5)}°`} foot={t('WGS-84')} color="var(--accent-cyan)" />
                  <Metric label={t('Bujur Target')} value={`${selected.lon.toFixed(5)}°`} foot={t('WGS-84')} color="var(--accent-cyan)" />
                  <Metric label={t('Azimut')} value={`${solution.azimuth.toFixed(1)}°`} foot={t('dari utara sejati')} />
                  <Metric label={t('Sudut Depresi')} value={`${solution.depression.toFixed(1)}°`} foot={t('di bawah horizon')} />
                  <Metric label={t('Jarak Permukaan')} value={`${Math.round(solution.ground).toLocaleString('id-ID')} m`} foot={t('proyeksi datar')} />
                  <Metric label={t('Jarak Miring')} value={`${Math.round(solution.slant).toLocaleString('id-ID')} m`} foot={`termasuk ${ALT_AGL} m AGL`} color="var(--accent-amber)" />
                  <Metric label={t('Lebar Jejak Pandang')} value={`${Math.round(solution.swath).toLocaleString('id-ID')} m`} foot={`pada FOV ${fovDeg}°`} />
                  <Metric label={t('Resolusi Tanah')} value={`${solution.gsd.toFixed(1)} cm/px`} foot={t('sensor 1920 px')} />
                </MetricRow>
              ) : (
                <EmptyState
                  icon={<Target size={22} />}
                  title={t('Pilih titik pada peta')}
                  description={t('Klik penanda target atau salah satu entri Target Bank untuk menghitung solusi geolokasi.')}
                />
              )}
            </GlassCard> */}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
            <div style={{ display: 'none' }}>
              <GlassCard>
                <SectionHead icon={<Layers size={15} />} title={t('Basemap')} sub={t('Sumber ubin peta')} />
                <div className="lyr-pick">
                  {BASEMAPS.map(b => (
                    <button
                      key={b.id}
                      className={basemap === b.id ? 'on' : ''}
                      onClick={() => setBasemap(b.id)}
                      style={{ padding: '7px 9px', textAlign: 'left' }}
                    >
                      <span className="sw-chip" style={{ background: b.chip }} />
                      <span style={{ minWidth: 0, display: 'block' }}>
                        <span style={{ display: 'block', fontWeight: 600 }}>{b.label}</span>
                        <span style={{ display: 'block', fontSize: 10, color: 'var(--text-muted)', marginTop: 1 }}>
                          {b.note}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
                <p className="note-inline">
                  {t('Bila jaringan keluar ditutup, peta berpindah sendiri ke Grid Referensi Lokal tanpa kehilangan lapisan taktis.')}
                </p>
              </GlassCard>
              <GlassCard>
                <SectionHead icon={<Eye size={15} />} title={t('Lapisan Taktis')} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  <Switch checked={showFov} onChange={setShowFov}
                    label={t('Kerucut pandang kamera')} hint={t('Proyeksi FOV menuju target terkunci')} />
                  <Switch checked={showRings} onChange={setShowRings}
                    label={t('Cincin jangkauan')} hint={t('Radius 1, 2, dan 3 km dari titik gelar')} />
                  <Switch checked={showGeofence} onChange={setShowGeofence}
                    label={t('Poligon geofence')} hint={t('Batas area tanggung jawab stasiun')} />
                  <Switch checked={showTrack} onChange={setShowTrack}
                    label={t('Jejak lintasan balon')} hint={t('Simpangan platform akibat angin')} />
                </div>

                <div className="slider-row" style={{ marginTop: 12 }}>
                  <label htmlFor="fov-range">
                    Bukaan FOV
                    <b className="tabnum">{fovDeg}°</b>
                  </label>
                  <input
                    id="fov-range"
                    type="range"
                    min={6}
                    max={60}
                    step={2}
                    value={fovDeg}
                    onChange={e => setFovDeg(Number(e.target.value))}
                  />
                  <span className="slider-foot">
                    Setara zoom optik {(60 / fovDeg).toFixed(1)}× pada gimbal Epsilon
                  </span>
                </div>
              </GlassCard>
            </div>



            <GlassCard>
              <SectionHead
                icon={<Target size={15} />}
                title={t('Titik Ballon')}
                sub={`${targets.length} titik tersimpan`}
                right={
                  <button
                    className="btn btn-sm btn-secondary sheen"
                    onClick={() => loadDoneTargets()}
                    disabled={targetsLoading}
                    title={t('Muat ulang dari misi Done')}
                  >
                    <RefreshCw size={12} className={targetsLoading ? 'spin' : ''} /> {t('Muat Ulang')}
                  </button>
                }
              />

              {targetsLoading ? (
                <EmptyState
                  icon={<RefreshCw size={22} className="spin" />}
                  title={t('Memuat…')}
                  description={t('Mengambil lokasi dari misi berstatus Done.')}
                />
              ) : targets.length === 0 ? (
                <EmptyState
                  icon={<MapPin size={22} />}
                  title={t('Target Bank kosong')}
                  description={t('Titik akan muncul setelah ada misi yang selesai (status Done).')}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {targets.map(tp => (
                    <div
                      key={tp.id}
                      className={`tgt-row ${selectedId === tp.id ? 'on' : ''}`}
                    >
                      <button className="tgt-main" onClick={() => pickTarget(tp)}>
                        <span className="tgt-head">
                          <MapPin size={13} style={{ flexShrink: 0 }} />
                          <span className="tgt-name">{tp.name}</span>
                        </span>
                        <span className="tgt-coord">
                          {tp.lat.toFixed(4)}, {tp.lon.toFixed(4)} · {Math.round(
                            distanceBetween(camLat, camLon, tp.lat, tp.lon),
                          ).toLocaleString('id-ID')} m
                        </span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </GlassCard>

            {/* <GlassCard>
              <SectionHead icon={<Navigation size={15} />} title={t('Sikap Kamera')} />
              <KVList rows={[
                ['Azimut Gimbal', solution ? `${solution.azimuth.toFixed(1)}°` : '—'],
                ['Elevasi Gimbal', solution ? `−${solution.depression.toFixed(1)}°` : '—'],
                ['Bukaan FOV', `${fovDeg}°`],
                ['Ketinggian Platform', `${ALT_AGL} m AGL`],
                ['Sistem Referensi', 'WGS-84 / EPSG:3857'],
              ]} />
            </GlassCard> */}
          </div>
        </div>
      </div>

      {detailTargetId != null && (
        <div className="modal-backdrop" onClick={() => setDetailTargetId(null)}>
          <div className="modal lq" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Detail Misi')}>
            <div className="modal-header">
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Detail Misi')}</h3>
              <button className="modal-x" onClick={() => setDetailTargetId(null)} aria-label={t('Tutup')}>
                <X size={16} />
              </button>
            </div>
            <div className="modal-body">
              {missionDetailLoading ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{t('Memuat…')}</div>
              ) : missionDetail ? (
                <KVList rows={[
                  [t('Nama Misi'), missionDetail.mission_name ?? '—'],
                  [t('Deskripsi'), missionDetail.description ?? '—'],
                  [t('Balon'), missionDetail.balloon?.balloon_name ?? missionDetail.balloon?.name ?? '—'],
                  [t('Status'), t(missionStatusName(missionDetail) || '—')],
                  [t('Pimpinan'), missionDetailInfo?.mission_leader ?? '—'],
                  [t('Take Off'), missionDetailInfo?.takeoff_time ?? '—'],
                  [t('Landing'), missionDetailInfo?.landing_time ?? '—'],
                  [t('Durasi'), missionDetailInfo?.duration != null ? `${missionDetailInfo.duration} menit` : '—'],
                  [t('Ketinggian Maksimal'), missionDetailInfo?.max_altitude != null ? `${missionDetailInfo.max_altitude} m AGL` : '—'],
                  [t('Panjang Kabel'), missionDetailInfo?.cable_length != null ? `${missionDetailInfo.cable_length} m` : '—'],
                ]} />
              ) : (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>{t('Data tidak ditemukan.')}</div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDetailTargetId(null)}>{t('Tutup')}</button>
            </div>
          </div>
        </div>
      )}
    </LicenseGate>
  );
}


/* =====================================================================
   1.3c — DIGITAL SMART NOTIFICATION ALERT

   Modul ini dan lonceng di bilah atas membaca gudang data yang sama.
   Menangani sebuah peringatan di sini akan langsung terlihat di panel
   notifikasi, dan sebaliknya — tidak ada dua daftar yang harus
   disamakan secara manual.
   ===================================================================== */
const SEV_META = {
  kritis: { badge: 'badge-danger', icon: <ShieldAlert size={13} />, color: 'var(--danger-400)' },
  peringatan: { badge: 'badge-warning', icon: <AlertTriangle size={13} />, color: 'var(--warning-400)' },
  informasi: { badge: 'badge-info', icon: <Info size={13} />, color: 'var(--info-400)' },
} as const;

const STATUS_BADGE = { terbuka: 'badge-danger', ditangani: 'badge-warning', selesai: 'badge-success' } as const;

/** Bentuk aturan kosong untuk dialog "Buat Aturan". */
const RULE_DRAFT: Omit<AlertRule, 'id'> = {
  name: '', category: 'Cuaca', severity: 'peringatan',
  metric: '', operator: '>', threshold: '', enabled: true,
};

export function AlertsPage() {
  const {
    pushToast, t, lang, account, offline,
    notifications, unreadCount, notify,
    markRead, markAllRead, setAlertStatus, removeNotification, resetNotifications,
    syncNotifications, notifSyncing,
  } = useApp();

  const [filter, setFilter] = useState<'all' | Severity>('all');
  const [detailNotif, setDetailNotif] = useState<AppNotification | null>(null);
  const [confirmMarkAll, setConfirmMarkAll] = useState(false);

  const confirmMarkAllRead = () => {
    markAllRead();
    setConfirmMarkAll(false);
  };

  const openDetail = (a: AppNotification) => {
    markRead(a.id);
    setDetailNotif(a);
  };

  /* ----- Aturan peringatan ----- */
  const [rules, setRules] = useState<AlertRule[]>([]);
  const [editing, setEditing] = useState<AlertRule | null>(null);
  const [draft, setDraft] = useState<Omit<AlertRule, 'id'>>(RULE_DRAFT);
  const [showRuleForm, setShowRuleForm] = useState(false);

  /* Sama seperti riwayat peringatan: satu penulisan dilewati tepat
     setelah pemuatan agar daftar yang baru dibaca tidak tertimpa. */
  const lewatiSimpanAturan = useRef(true);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!account) return;
    lewatiSimpanAturan.current = true;
    setRules(loadRules(account.username));
  }, [account]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!account) return;
    if (lewatiSimpanAturan.current) { lewatiSimpanAturan.current = false; return; }
    saveRules(account.username, rules);
  }, [rules, account]);

  const filtered = useMemo(
    () => notifications
      .filter(a => filter === 'all' || a.severity === filter)
      .sort((a, b) => b.ts - a.ts),
    [notifications, filter],
  );

  /* Riwayat Peringatan dipaginasi 10 baris per halaman. */
  const ALERTS_PAGE_SIZE = 10;
  const [alertsPage, setAlertsPage] = useState(1);
  const alertsPageCount = Math.max(1, Math.ceil(filtered.length / ALERTS_PAGE_SIZE));
  /* Filter berubah atau riwayat menyusut (mis. dihapus) bisa membuat
     halaman yang sedang dibuka lewat batas — turunkan sendiri ke halaman
     valid terakhir alih-alih menampilkan tabel kosong yang membingungkan. */
  useEffect(() => {
    setAlertsPage(p => Math.min(p, alertsPageCount));
  }, [alertsPageCount]);
  const paged = filtered.slice((alertsPage - 1) * ALERTS_PAGE_SIZE, alertsPage * ALERTS_PAGE_SIZE);

  /* Jendela nomor halaman di sekitar halaman aktif — maksimal 3 tombol
     angka, digeser supaya tetap 3 nomor selama total halaman mencukupi. */
  const alertsPageWindow = useMemo(() => {
    const span = Math.min(3, alertsPageCount);
    let start = Math.min(Math.max(1, alertsPage - 1), alertsPageCount - span + 1);
    start = Math.max(1, start);
    return Array.from({ length: span }, (_, i) => start + i);
  }, [alertsPage, alertsPageCount]);

  const counts = useMemo(() => ({
    kritis: notifications.filter(a => a.severity === 'kritis').length,
    peringatan: notifications.filter(a => a.severity === 'peringatan').length,
    informasi: notifications.filter(a => a.severity === 'informasi').length,
    terbuka: notifications.filter(a => a.status === 'terbuka').length,
  }), [notifications]);

  /* ----- Tindakan pada peringatan ----- */
  const advance = (id: string | number, next: 'ditangani' | 'selesai', title: string, prev: 'terbuka' | 'ditangani' | 'selesai') => {
    setAlertStatus(id, next);
    pushToast({
      tone: 'success',
      title: next === 'ditangani' ? t('Peringatan ditangani') : t('Peringatan ditutup'),
      detail: title,
      action: { label: t('Urungkan'), onClick: () => setAlertStatus(id, prev) },
    });
  };

  const drop = (id: string | number, title: string) => {
    removeNotification(id);
    pushToast({ tone: 'info', title: t('Peringatan dihapus'), detail: title });
  };

  /* ----- CRUD aturan ----- */
  const openCreate = () => { setEditing(null); setDraft(RULE_DRAFT); setShowRuleForm(true); };
  const openEdit = (r: AlertRule) => {
    setEditing(r);
    setDraft({ name: r.name, category: r.category, severity: r.severity, metric: r.metric, operator: r.operator, threshold: r.threshold, enabled: r.enabled });
    setShowRuleForm(true);
  };

  const draftValid = draft.name.trim().length >= 3 && draft.metric.trim().length >= 2 && draft.threshold.trim().length >= 1;

  const submitRule = () => {
    if (!draftValid) return;
    if (editing) {
      setRules(prev => prev.map(r => (r.id === editing.id ? { ...editing, ...draft } : r)));
      pushToast({ tone: 'success', title: t('Aturan diperbarui'), detail: draft.name });
    } else {
      const id = Math.max(0, ...rules.map(r => r.id)) + 1;
      setRules(prev => [...prev, { id, ...draft }]);
      pushToast({ tone: 'success', title: t('Aturan ditambahkan'), detail: draft.name });
    }
    setShowRuleForm(false);
  };

  const toggleRule = (r: AlertRule) => {
    setRules(prev => prev.map(x => (x.id === r.id ? { ...x, enabled: !x.enabled } : x)));
    pushToast({
      tone: 'info',
      title: r.enabled ? t('Aturan dinonaktifkan') : t('Aturan diaktifkan'),
      detail: r.name,
    });
  };

  const deleteRule = (r: AlertRule) => {
    setRules(prev => prev.filter(x => x.id !== r.id));
    pushToast({
      tone: 'info',
      title: t('Aturan dihapus'),
      detail: r.name,
      action: { label: t('Urungkan'), onClick: () => setRules(prev => [...prev, r].sort((a, b) => a.id - b.id)) },
    });
  };

  /* Uji aturan: memunculkan satu peringatan sungguhan lewat jalur yang
     sama dengan sensor, sehingga operator dapat memastikan rantai
     pemberitahuan benar-benar tersambung sebelum bertugas. */
  const testRule = (r: AlertRule) => {
    notify({
      title: `${t('Uji aturan')} — ${r.name}`,
      detail: `${r.metric} ${r.operator} ${r.threshold}. ${t('Peringatan uji, bukan kejadian sebenarnya.')}`,
      severity: r.severity,
      category: r.category,
      source: t('Penguji Aturan'),
      reading: r.threshold,
      threshold: r.threshold,
    });
  };

  return (
    <LicenseGate moduleCode="1.3c" moduleName="Digital Smart Notification Alert">
      <div className="animate-fade-in">
        <PageHead
          icon={<BellRing size={22} />}
          title={t('Smart Notification Alert')}
          description={t('Aturan peringatan berbasis geofence, ambang sensor, dan deteksi intrusi.')}
          actions={
            <>
              <button className="btn btn-secondary" onClick={syncNotifications} disabled={notifSyncing}>
                <RefreshCw size={15} className={notifSyncing ? 'spin' : ''} /> {t('Sinkronkan')}
              </button>
              <button className="btn btn-secondary" onClick={() => setConfirmMarkAll(true)} disabled={unreadCount === 0}>
                <CheckCheck size={15} /> {t('Tandai Semua Dibaca')}
              </button>
              {/* <button className="btn btn-primary sheen" onClick={openCreate}>
                <Plus size={15} /> {t('Buat Aturan')}
              </button> */}
            </>
          }
        />

        {offline && (
          <OfflineNotice
            title={t('Umpan peringatan dihentikan')}
            detail={t('Platform padam. Riwayat tetap dapat ditinjau, namun tidak ada peringatan baru sampai daya dipulihkan.')}
          />
        )}

        <div className="lic-summary">
          <Tile icon={<ShieldAlert size={19} />} accent="var(--danger-400)" label={t('Kritis')} value={String(counts.kritis)} />
          <Tile icon={<AlertTriangle size={19} />} accent="var(--warning-400)" label={t('Peringatan')} value={String(counts.peringatan)} />
          <Tile icon={<Info size={19} />} accent="var(--info-400)" label={t('Informasi')} value={String(counts.informasi)} />
          <Tile icon={<CircleAlert size={19} />} accent="var(--accent-tertiary)" label={t('Belum Dibaca')} value={String(unreadCount)} />
        </div>

        {/* <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 330px', gap: 16 }}> */}
          <GlassCard tilt={false}>
            <SectionHead
              icon={<BellRing size={15} />}
              title={t('Riwayat Peringatan')}
              sub={`${filtered.length} ${t('dari')} ${notifications.length} ${t('entri')}`}
              right={
                <Segmented
                  value={filter}
                  options={[
                    { id: 'all', label: t('Semua') },
                    { id: 'kritis', label: t('Kritis') },
                    { id: 'peringatan', label: t('Peringatan') },
                    { id: 'informasi', label: t('Info') },
                  ]}
                  onChange={v => { setFilter(v); setAlertsPage(1); }}
                />
              }
            />
            <div className="table-container">
              <table>
                <thead><tr><th>{t('Waktu')}</th><th>{t('Peringatan')}</th>
                <th>{t('Tingkat')}</th><th>{t('Jenis')}</th><th>{t('Dibaca')}</th>
                {/* <th>{t('Status')}</th> */}
                <th style={{ textAlign: 'right' }}>{t('Aksi')}</th></tr></thead>
                <tbody>
                  {paged.map(a => (
                    <tr key={a.id} style={{ opacity: a.status === 'selesai' ? 0.72 : 1 }}>
                      <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>{fullTimestamp(a.ts, lang)}</td>
                      <td>
                        <div style={{ fontWeight: a.read ? 600 : 700, fontSize: 12.5, display: 'flex', alignItems: 'center', gap: 6 }}>
                          {!a.read && <span className="nc-unread-dot" style={{ marginTop: 0 }} />}
                          {t(a.title)}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                          {t('Sumber')}: {t(a.source)}
                          {a.reading && ` · ${t(a.reading)}${a.threshold ? ` / ${t(a.threshold)}` : ''}`}
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${SEV_META[a.severity].badge}`} style={{ gap: 4 }}>
                          {SEV_META[a.severity].icon} {t(a.severity)}
                        </span>
                      </td>
                      <td style={{ fontSize: 12 }}>{t(a.category)}</td>
                      <td>
                        <span className={`badge ${a.read ? 'badge-neutral' : 'badge-info'}`}>
                          {a.read ? t('Sudah Dibaca') : t('Belum Dibaca')}
                        </span>
                      </td>
                      {/* <td><span className={`badge ${STATUS_BADGE[a.status]}`}>{t(a.status)}</span></td> */}
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'inline-flex', gap: 4 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => openDetail(a)}>
                            <Eye size={12} /> {a.read ? t('Detail') : t('Baca')}
                          </button>
                          {/* {a.status === 'terbuka' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => advance(a.id, 'ditangani', t(a.title), a.status)}>
                              <Check size={12} /> {t('Tangani')}
                            </button>
                          )}
                          {a.status === 'ditangani' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => advance(a.id, 'selesai', t(a.title), a.status)}>
                              <CheckCheck size={12} /> {t('Tutup')}
                            </button>
                          )} */}
                          {/* <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => drop(a.id, t(a.title))}
                            aria-label={`${t('Hapus')}: ${t(a.title)}`}
                          >
                            <Trash2 size={12} />
                          </button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {filtered.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 10, padding: '8px 12px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {t('Halaman')} {alertsPage} {t('dari')} {alertsPageCount}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAlertsPage(p => Math.max(1, p - 1))}
                    disabled={alertsPage <= 1}
                    aria-label={t('Halaman sebelumnya')}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  {alertsPageWindow.map(p => (
                    <button
                      key={p}
                      className={`btn btn-sm ${p === alertsPage ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setAlertsPage(p)}
                      aria-current={p === alertsPage ? 'page' : undefined}
                      aria-label={`${t('Halaman')} ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setAlertsPage(p => Math.min(alertsPageCount, p + 1))}
                    disabled={alertsPage >= alertsPageCount}
                    aria-label={t('Halaman berikutnya')}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
            {filtered.length === 0 && (
              <EmptyState
                icon={<Inbox size={22} />}
                title={t('Tidak ada peringatan')}
                description={
                  notifications.length === 0
                    ? t('Riwayat kosong. Peringatan baru akan muncul begitu ambang aturan terlampaui.')
                    : t('Tidak ditemukan peringatan pada tingkat yang dipilih.')
                }
                action={
                  notifications.length === 0
                    ? <button className="btn btn-secondary btn-sm" onClick={resetNotifications}>
                      <RefreshCw size={12} /> {t('Muat Riwayat Contoh')}
                    </button>
                    : undefined
                }
              />
            )}
          </GlassCard>

          <div style={{ display: 'NONE', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead
                icon={<Filter size={15} />}
                title={t('Aturan Peringatan')}
                sub={`${rules.filter(r => r.enabled).length} ${t('dari')} ${rules.length} ${t('aktif')}`}
                right={
                  <button className="btn btn-ghost btn-sm" onClick={openCreate} aria-label={t('Buat Aturan')}>
                    <Plus size={13} />
                  </button>
                }
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {rules.map(r => (
                  <div key={r.id} className={`rule-row ${r.enabled ? '' : 'off'}`}>
                    <div className="rule-top">
                      <span className={`rule-dot ${r.severity}`} aria-hidden="true" />
                      <span className="rule-name">{t(r.name)}</span>
                    </div>
                    <div className="rule-bottom">
                      <span className="rule-cond">
                        {t(r.metric)} {r.operator} {t(r.threshold)}
                      </span>
                      <span className="rule-acts">
                        <button
                          className="rule-act"
                          onClick={() => toggleRule(r)}
                          title={r.enabled ? t('Nonaktifkan') : t('Aktifkan')}
                          aria-label={`${r.enabled ? t('Nonaktifkan') : t('Aktifkan')}: ${t(r.name)}`}
                        >
                          {r.enabled ? <ToggleRight size={14} /> : <ToggleLeft size={14} />}
                        </button>
                        <button
                          className="rule-act"
                          onClick={() => testRule(r)}
                          title={t('Uji aturan')}
                          aria-label={`${t('Uji aturan')}: ${t(r.name)}`}
                        >
                          <Play size={12} />
                        </button>
                        <button
                          className="rule-act"
                          onClick={() => openEdit(r)}
                          title={t('Ubah')}
                          aria-label={`${t('Ubah')}: ${t(r.name)}`}
                        >
                          <Pencil size={12} />
                        </button>
                        <button
                          className="rule-act danger"
                          onClick={() => deleteRule(r)}
                          title={t('Hapus')}
                          aria-label={`${t('Hapus')}: ${t(r.name)}`}
                        >
                          <Trash2 size={12} />
                        </button>
                      </span>
                    </div>
                  </div>
                ))}
                {rules.length === 0 && (
                  <p style={{ fontSize: 11.5, color: 'var(--text-muted)', margin: '8px 0', lineHeight: 1.6 }}>
                    {t('Belum ada aturan. Tanpa aturan, tidak ada ambang yang diawasi.')}
                  </p>
                )}
              </div>
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<Radio size={15} />} title={t('Kanal Notifikasi')} />
              <ConfigToggle label={t('Notifikasi dalam aplikasi')} initial={true} />
              <ConfigToggle label={t('Alarm suara pada peringatan kritis')} initial={true} />
              <ConfigToggle label={t('Catat ke Audit Trail')} initial={true} />
              <ConfigToggle label={t('Teruskan ke stasiun GCS lain')} initial={false} />
              <ConfigToggle label={t('Sertakan dalam laporan harian otomatis')} initial={false} />
            </GlassCard>

            <GlassCard>
              <SectionHead icon={<Activity size={15} />} title={t('Eskalasi Bertingkat')} />
              <KVList rows={[
                [t('Tingkat 1 — Informasi'), t('Operator stasiun')],
                [t('Tingkat 2 — Peringatan'), t('Operator + Supervisor')],
                [t('Tingkat 3 — Kritis'), t('Seluruh peran + Commander')],
                [t('Batas Waktu Tanggapan'), t('5 menit (kritis)')],
                [t('Tindakan Otomatis'), t('Rekam video 60 detik')],
              ]} />
            </GlassCard>
          </div>
        {/* </div> */}

        {/* ----- Dialog aturan ----- */}
        {showRuleForm && (
          <div className="modal-backdrop" onClick={() => setShowRuleForm(false)}>
            <div className="modal lq" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={editing ? t('Ubah Aturan') : t('Buat Aturan')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  {editing ? t('Ubah Aturan') : t('Buat Aturan')}
                </h3>
                <button className="modal-x" onClick={() => setShowRuleForm(false)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <RuleField label={t('Nama Aturan')}>
                  <input
                    className="form-input"
                    value={draft.name}
                    onChange={e => setDraft(d => ({ ...d, name: e.target.value }))}
                    placeholder={t('mis. Angin melampaui batas operasi')}
                    autoFocus
                  />
                </RuleField>

                <RuleField label={t('Besaran yang Diawasi')}>
                  <input
                    className="form-input"
                    value={draft.metric}
                    onChange={e => setDraft(d => ({ ...d, metric: e.target.value }))}
                    placeholder={t('mis. Kecepatan angin')}
                  />
                </RuleField>

                <div style={{ display: 'grid', gridTemplateColumns: '90px minmax(0,1fr)', gap: 10 }}>
                  <RuleField label={t('Pembanding')}>
                    <select
                      className="form-input"
                      value={draft.operator}
                      onChange={e => setDraft(d => ({ ...d, operator: e.target.value as AlertRule['operator'] }))}
                    >
                      <option value=">">&gt;</option>
                      <option value="<">&lt;</option>
                      <option value="=">=</option>
                    </select>
                  </RuleField>
                  <RuleField label={t('Ambang')}>
                    <input
                      className="form-input"
                      value={draft.threshold}
                      onChange={e => setDraft(d => ({ ...d, threshold: e.target.value }))}
                      placeholder={t('mis. 35 km/h')}
                    />
                  </RuleField>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <RuleField label={t('Kategori')}>
                    <select
                      className="form-input"
                      value={draft.category}
                      onChange={e => setDraft(d => ({ ...d, category: e.target.value as Category }))}
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{t(c)}</option>)}
                    </select>
                  </RuleField>
                  <RuleField label={t('Tingkat Keparahan')}>
                    <select
                      className="form-input"
                      value={draft.severity}
                      onChange={e => setDraft(d => ({ ...d, severity: e.target.value as Severity }))}
                    >
                      <option value="informasi">{t('informasi')}</option>
                      <option value="peringatan">{t('peringatan')}</option>
                      <option value="kritis">{t('kritis')}</option>
                    </select>
                  </RuleField>
                </div>

                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={draft.enabled}
                    onChange={e => setDraft(d => ({ ...d, enabled: e.target.checked }))}
                  />
                  {t('Aktifkan aturan ini segera setelah disimpan')}
                </label>

                {!draftValid && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                    {t('Nama, besaran, dan ambang wajib diisi sebelum aturan dapat disimpan.')}
                  </p>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowRuleForm(false)}>{t('Batal')}</button>
                <button className="btn btn-primary" onClick={submitRule} disabled={!draftValid}>
                  <Check size={14} /> {editing ? t('Simpan Perubahan') : t('Tambah Aturan')}
                </button>
              </div>
            </div>
          </div>
        )}

        {detailNotif && (
          <div className="modal-backdrop" onClick={() => setDetailNotif(null)}>
            <div className="modal lq" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Detail Notifikasi')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t(detailNotif.title)}</h3>
                <button className="modal-x" onClick={() => setDetailNotif(null)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <KVList rows={[
                  [t('Waktu'), fullTimestamp(detailNotif.ts, lang)],
                  [t('Tingkat'), t(detailNotif.severity)],
                  [t('Jenis'), t(detailNotif.category)],
                  [t('Sumber'), t(detailNotif.source)],
                  // [t('Status'), t(detailNotif.status)],
                ]} />
                <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, color: 'var(--text-secondary)' }}>
                  {t(detailNotif.detail)}
                </p>
                {/* {detailNotif.metadata && (
                  <pre style={{
                    fontSize: 10.5, background: 'rgba(255,255,255,0.03)', padding: 10,
                    borderRadius: 8, overflowX: 'auto', maxHeight: 220, margin: 0,
                  }}>
                    {JSON.stringify(detailNotif.metadata, null, 2)}
                  </pre>
                )} */}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDetailNotif(null)}>{t('Tutup')}</button>
              </div>
            </div>
          </div>
        )}

        {confirmMarkAll && (
          <div className="modal-backdrop" onClick={() => setConfirmMarkAll(false)}>
            <div className="modal lq" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Tandai Semua Dibaca')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Tandai Semua Dibaca')}</h3>
                <button className="modal-x" onClick={() => setConfirmMarkAll(false)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: 12.5, lineHeight: 1.6, margin: 0, color: 'var(--text-secondary)' }}>
                  {t('Semua notifikasi yang belum dibaca akan ditandai sebagai sudah dibaca. Lanjutkan?')}
                </p>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setConfirmMarkAll(false)}>{t('Batal')}</button>
                <button className="btn btn-primary" onClick={confirmMarkAllRead}>
                  <CheckCheck size={15} /> {t('Ya, Tandai Semua')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

/** Label + kendali untuk dialog aturan. */
function RuleField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: 'block' }}>
      <span style={{
        display: 'block', marginBottom: 5, fontSize: 10.5, fontWeight: 700,
        letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--text-muted)',
      }}>
        {label}
      </span>
      {children}
    </label>
  );
}

/* =====================================================================
   1.3d — INFORMATION FLIGHT BALLOON INTELLIGENT APP
   ===================================================================== */
const CHECKLIST = [
  { item: 'Tekanan helium ≥ 150 bar', critical: true },
  { item: 'Tegangan baterai cadangan ≥ 24 V', critical: true },
  { item: 'Kontinuitas kabel penambat terverifikasi', critical: true },
  { item: 'Resistansi isolasi > 100 MΩ', critical: true },
  { item: 'GPS lock diperoleh (≥ 8 satelit)', critical: true },
  { item: 'Kecepatan angin darat < 35 km/h', critical: true },
  { item: 'Payload Epsilon terpasang & terkunci', critical: true },
  { item: 'Tautan optik EOP terverifikasi (> 40 dB)', critical: false },
  { item: 'Sistem proteksi petir terhubung', critical: false },
  { item: 'Winch dan rem darurat berfungsi', critical: false },
  { item: 'Area lepas landas steril dari personel', critical: false },
  { item: 'Izin operasi ruang udara diperoleh', critical: false },
];

interface MissionDraft {
  simulationId: string;
  missionCode: string;
  missionName: string;
  description: string;
  locationId: string;
  balloonId: string;
  operatorId: string;
  takeoffAt: string;
  landingAt: string;
  maxAltitude: number;
  cableLength: number;
  weather: string;
  remark: string;
}

const EMPTY_MISSION_DRAFT: MissionDraft = {
  simulationId: '', missionCode: '#26', missionName: '', description: '',
  locationId: '', balloonId: '', operatorId: '', takeoffAt: '', landingAt: '',
  maxAltitude: 450, cableLength: 300, weather: '', remark: '',
};

/* MAX_CABLE_LENGTH: batas panjang kabel penambat operasional, tetap
   untuk semua misi — tidak bergantung pada balon yang dipilih. */
const MAX_CABLE_LENGTH = 300;

/** "2 jam 5 menit" — dipakai bersisian dengan angka total menit pada
    field Durasi (yang tetap dikirim ke backend dalam menit), supaya
    operator tidak perlu menghitung sendiri dari angka mentah. */
function formatDurationHM(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h} jam ${m} menit`;
}

/* mission_status.name pada flight-missions: "Planned" | "Flight" | "Done" —
   dipakai badge Status dan tombol Aksi pada Logbook Penerbangan. status_id
   numerik (1/2/3, urutan yang sama) cuma dipakai saat mengirim PUT. */
const MISSION_STATUS_META: Record<string, { label: string; tone: 'warning' | 'info' | 'success' }> = {
  Planned: { label: 'PLANNED', tone: 'warning' },
  Flight: { label: 'FLIGHT', tone: 'info' },
  Done: { label: 'DONE', tone: 'success' },
};

/** mission_status kadang berupa string mentah, kadang objek relasi
    {id, name} — dibaca seragam lewat helper ini. */
function missionStatusName(m: FlightMissionRecord): string {
  const status = m.mission_status;
  return (typeof status === 'string' ? status : status?.name) ?? '';
}

export function FlightInfoPage() {
  const { pushToast, notify, t } = useApp();
  const [checked, setChecked] = useState<boolean[]>(() => CHECKLIST.map((_, i) => i < 9));

  const criticalPending = CHECKLIST.filter((c, i) => c.critical && !checked[i]).length;
  const completion = Math.round((checked.filter(Boolean).length / CHECKLIST.length) * 100);

  const toggle = (i: number) => setChecked(prev => prev.map((v, j) => (j === i ? !v : v)));

  const [showMissionForm, setShowMissionForm] = useState(false);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [simOptions, setSimOptions] = useState<FlightSimulationRecord[]>([]);
  const [locationOptions, setLocationOptions] = useState<LocationRecord[]>([]);
  const [balloonOptions, setBalloonOptions] = useState<BalloonRecord[]>([]);
  const [operatorOptions, setOperatorOptions] = useState<OperatorRecord[]>([]);
  const [draft, setDraft] = useState<MissionDraft>(EMPTY_MISSION_DRAFT);
  const [submitting, setSubmitting] = useState(false);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [flightInfo, setFlightInfo] = useState<FlightInformationRecord[]>([]);
  const [logbookLoading, setLogbookLoading] = useState(true);
  const [actionMissionId, setActionMissionId] = useState<string | number | null>(null);
  const [detailMissionId, setDetailMissionId] = useState<string | number | null>(null);
  const [playMissionId, setPlayMissionId] = useState<string | number | null>(null);
  const [endMissionId, setEndMissionId] = useState<string | number | null>(null);
  /* Misi yang tombol "Play to Flight"-nya diklik namun balonnya sedang
     Unavailable — memicu modal peringatan alih-alih checklist pra-terbang. */
  const [balloonUnavailableMissionId, setBalloonUnavailableMissionId] = useState<string | number | null>(null);

  /* Pratinjau titik di peta untuk field "Pilih Lokasi" — hanya tampilan,
     TIDAK dikirim ke backend. Lokasi misi tetap merujuk ke location_id
     dari daftar /locations lewat dropdown yang sudah ada. */
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [pickedCoords, setPickedCoords] = useState<{ lat: number; lon: number } | null>(null);

  /* Pencarian nama lokasi pada field "Pilih Lokasi" — filter client-side,
     sama seperti pola pencarian di halaman admin lain (mis. Balloon
     Management), karena endpoint /locations tidak punya parameter query. */
  const [locationQuery, setLocationQuery] = useState('');
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);

  /* Logbook Penerbangan: /flight-missions untuk baris misi, /flight-information
     dipakai hanya untuk mengambil mission_leader lewat pencocokan mission_id
     — belum ada endpoint list yang sudah tergabung dari backend. /locations
     dan /balloons dimuat sekalian di sini (bukan hanya saat modal Misi Baru
     dibuka) karena setMissionStatus butuh keduanya untuk mencari kembali
     location_id/balloon_id — GET /flight-missions mengembalikan relasi
     location/balloon TANPA id, cuma name/serial_number. */
  const loadLogbook = useCallback(async () => {
    setLogbookLoading(true);
    try {
      const [missionRows, infoRows, locs, balloonsRes] = await Promise.all([
        api.getFlightMissions().catch(() => []),
        api.getFlightInformation().catch(() => []),
        api.getLocations().catch(() => []),
        api.getBalloons().catch(() => []),
      ]);
      setMissions(missionRows);
      setFlightInfo(infoRows);
      setLocationOptions(locs);
      setBalloonOptions(balloonsRes);
    } finally {
      setLogbookLoading(false);
    }
  }, []);

  useEffect(() => { loadLogbook(); }, [loadLogbook]);

  const leaderByMission = useMemo(() => {
    const map = new globalThis.Map<string, string>();
    for (const info of flightInfo) {
      if (info.mission_leader) map.set(String(info.mission_id), info.mission_leader);
    }
    return map;
  }, [flightInfo]);

  const infoByMission = useMemo(() => {
    const map = new globalThis.Map<string, FlightInformationRecord>();
    for (const info of flightInfo) map.set(String(info.mission_id), info);
    return map;
  }, [flightInfo]);

  /* location_id/balloon_id dicari lewat nama/serial_number karena
     GET /flight-missions tidak mengembalikan id relasinya. */
  const locationIdByName = useMemo(() => {
    const map = new globalThis.Map<string, string | number>();
    for (const l of locationOptions) if (l.name) map.set(l.name, l.id);
    return map;
  }, [locationOptions]);

  const filteredLocationOptions = useMemo(() => {
    const q = locationQuery.trim().toLowerCase();
    if (!q) return locationOptions;
    return locationOptions.filter(l =>
      String(l.name ?? l.location_name ?? l.id).toLowerCase().includes(q));
  }, [locationOptions, locationQuery]);

  const balloonIdBySerial = useMemo(() => {
    const map = new globalThis.Map<string, string | number>();
    for (const b of balloonOptions) if (b.serial_number) map.set(b.serial_number, b.id);
    return map;
  }, [balloonOptions]);

  /* GET /flight-missions menyertakan relasi balloon tanpa id (cuma
     name/serial_number) — status paling akurat diambil dari daftar
     lengkap /balloons yang sudah dimuat lewat balloonOptions, dicocokkan
     lewat id (bila ada) atau serial_number sebagai jalan pintasnya. */
  const resolveMissionBalloon = (mission: FlightMissionRecord): BalloonRecord | undefined => {
    const balloonId = mission.balloon_id ?? balloonIdBySerial.get(mission.balloon?.serial_number ?? '');
    if (balloonId != null) {
      const byId = balloonOptions.find(b => String(b.id) === String(balloonId));
      if (byId) return byId;
    }
    return mission.balloon ?? undefined;
  };

  /* Sama seperti tile ringkasan di Balloon Management: hanya status
     "Available" (tanpa peduli besar/kecil huruf) yang dianggap siap
     terbang — status kosong/lainnya dianggap tidak tersedia. */
  const isBalloonAvailable = (balloon: BalloonRecord | undefined) => (balloon?.status ?? '').toLowerCase() === 'available';

  /* Dipakai confirmTakeoff (→ Unavailable) & confirmEndFlight (→ Available)
     supaya siklus status balon mengikuti siklus misi tanpa operator harus
     mengubahnya manual di Balloon Management. PUT /balloons/{id} adalah
     full-replace, jadi kelima field wajib dikirim ulang — bukan cuma
     status — kalau tidak field lain berisiko ikut kosong di backend. */
  const applyBalloonStatus = async (balloon: BalloonRecord, status: 'Available' | 'Unavailable') => {
    try {
      await api.updateBalloon(String(balloon.id), {
        balloon_name: balloon.name ?? balloon.balloon_name ?? '',
        serial_number: balloon.serial_number ?? '',
        capacity: Number(balloon.capacity) || 0,
        max_altitude: Number(balloon.max_altitude) || 0,
        status,
      });
      setBalloonOptions(prev => prev.map(b => (String(b.id) === String(balloon.id) ? { ...b, status } : b)));
    } catch (err) {
      console.error(`Gagal mengubah status balon ke ${status}:`, err);
      const balloonStatusDetail = status === 'Available'
        ? t('Misi berhasil diakhiri, namun status balon tidak berhasil dikembalikan ke Available. Perbarui manual di Balloon Management.')
        : t('Penerbangan dimulai, namun status balon tidak berhasil diubah ke Unavailable. Perbarui manual di Balloon Management.');
      pushToast({
        tone: 'warning',
        title: t('Gagal memperbarui status balon'),
        detail: balloonStatusDetail,
      });
      notify({
        title: t('Gagal memperbarui status balon'),
        detail: balloonStatusDetail,
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Flight Information',
        page: 'flight-info',
        silent: true,
      });
    }
  };

  /* Backend memvalidasi PUT /flight-missions/{id} sebagai full-replace, jadi
     seluruh field asli misi dikirim ulang — cuma status_id yang berubah.
     Mengembalikan status keberhasilan supaya pemanggil (mis. confirmEndFlight)
     tahu apakah aman melanjutkan langkah berikutnya. */
  const setMissionStatus = async (mission: FlightMissionRecord, statusId: number): Promise<boolean> => {
    setActionMissionId(mission.id);
    try {
      await api.updateFlightMission(mission.id, {
        simulation_id: (mission.simulation_id as string | number | null | undefined) ?? null,
        mission_name: mission.mission_name ?? '',
        mission_code: mission.mission_code ?? '',
        description: mission.description ?? '',
        location_id: mission.location_id ?? locationIdByName.get(mission.location?.name ?? '') ?? '',
        balloon_id: mission.balloon_id ?? balloonIdBySerial.get(mission.balloon?.serial_number ?? '') ?? '',
        status_id: statusId,
      });
      await loadLogbook();
      return true;
    } catch (err) {
      console.error('updateFlightMission gagal:', err);
      const apiErr = err as { status?: number; message?: string; error?: string; detail?: { loc?: string[]; msg?: string }[] };
      const detailText = Array.isArray(apiErr?.detail)
        ? apiErr.detail.map(d => `${d.loc?.[d.loc.length - 1] ?? '?'}: ${d.msg ?? ''}`).join(', ')
        : undefined;
      const missionStatusDetail = detailText ?? apiErr?.message ?? apiErr?.error ?? (apiErr?.status ? `HTTP ${apiErr.status}` : t('Tidak bisa terhubung ke server. Coba lagi.'));
      pushToast({
        tone: 'error',
        title: t('Gagal memperbarui status misi'),
        detail: missionStatusDetail,
      });
      notify({
        title: t('Gagal memperbarui status misi'),
        detail: missionStatusDetail,
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Flight Information',
        page: 'flight-info',
        silent: true,
      });
      return false;
    } finally {
      setActionMissionId(null);
    }
  };

  const confirmTakeoff = async () => {
    const mission = missions.find(m => m.id === playMissionId);
    if (!mission || criticalPending > 0) return;
    const ok = await setMissionStatus(mission, 2);

    /* Balon ditandai Unavailable begitu penerbangan dimulai, supaya guard
       "Play to Flight" pada misi lain menolak balon yang sama sampai
       misi ini benar-benar diakhiri lewat confirmEndFlight. */
    if (ok) {
      const balloon = resolveMissionBalloon(mission);
      if (balloon) await applyBalloonStatus(balloon, 'Unavailable');
    }

    setPlayMissionId(null);
  };

  const confirmEndFlight = async () => {
    const mission = missions.find(m => m.id === endMissionId);
    if (!mission) return;
    const ok = await setMissionStatus(mission, 3);

    /* Balon dikembalikan ke Available begitu misinya selesai, supaya
       langsung bisa ditugaskan lagi lewat Play to Flight di misi lain. */
    if (ok) {
      const balloon = resolveMissionBalloon(mission);
      if (balloon) await applyBalloonStatus(balloon, 'Available');
    }

    setEndMissionId(null);
  };

  /* Simulasi & operator baru diambil saat modal dibuka — tidak perlu dimuat
     di balik layar bila operator tidak pernah membuat misi baru. Lokasi dan
     balon sudah dimuat lebih awal lewat loadLogbook (dibutuhkan juga di luar
     modal ini oleh setMissionStatus), jadi tidak diambil ulang di sini. */
  useEffect(() => {
    if (!showMissionForm) return;
    let cancelled = false;
    setOptionsLoading(true);
    Promise.all([
      api.getFlightSimulations().catch(() => []),
      api.getOperators().catch(() => []),
    ]).then(([sims, ops]) => {
      if (cancelled) return;
      setSimOptions(sims);
      setOperatorOptions(ops);
    }).finally(() => { if (!cancelled) setOptionsLoading(false); });
    return () => { cancelled = true; };
  }, [showMissionForm]);

  const missionDuration = useMemo(() => {
    if (!draft.takeoffAt || !draft.landingAt) return 0;
    const start = new Date(draft.takeoffAt).getTime();
    const end = new Date(draft.landingAt).getTime();
    if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0;
    return Math.round((end - start) / 60000);
  }, [draft.takeoffAt, draft.landingAt]);

  /* Batas ketinggian mengikuti data balon yang dipilih — undefined bila
     belum ada balon dipilih atau balonnya tidak melaporkan max_altitude. */
  const selectedBalloonMaxAltitude = useMemo(() => {
    const selected = balloonOptions.find(b => String(b.id) === draft.balloonId);
    const raw = selected?.max_altitude;
    const n = raw != null ? Number(raw) : NaN;
    return Number.isFinite(n) ? n : undefined;
  }, [balloonOptions, draft.balloonId]);

  const missionReady = draft.missionCode.trim() !== ''
    && draft.missionName.trim() !== ''
    && pickedCoords !== null
    && draft.balloonId !== ''
    && draft.operatorId !== ''
    && draft.takeoffAt !== ''
    && draft.landingAt !== ''
    && missionDuration > 0;

  const closeMissionForm = () => {
    setShowMissionForm(false);
    setDraft(EMPTY_MISSION_DRAFT);
    setShowLocationPicker(false);
    setPickedCoords(null);
    setLocationQuery('');
    setLocationDropdownOpen(false);
  };

  /* Simpan tiga langkah: locations dulu (titik dari peta pratinjau, dapat
     id-nya), lalu flight-missions memakai location_id tersebut, baru
     flight-information yang merujuk ke id misi. Kalau langkah berikutnya
     gagal, langkah sebelumnya sudah terlanjur tersimpan di backend —
     operator diberi tahu lewat toast agar bisa memeriksa/mengulang. */
  const submitMission = async () => {
    if (!missionReady || submitting || !pickedCoords) return;
    setSubmitting(true);
    try {
      const location = await api.createLocation({
        name: draft.missionName,
        city: '-',
        province: '-',
        latitude: pickedCoords.lat,
        longitude: pickedCoords.lon,
      });

      const mission = await api.createFlightMission({
        simulation_id: draft.simulationId || null,
        mission_name: draft.missionName,
        mission_code: draft.missionCode,
        description: draft.description,
        location_id: location.id,
        balloon_id: draft.balloonId,
        status_id: 1,
      });

      const operator = operatorOptions.find(o => String(o.id) === draft.operatorId);
      await api.createFlightInformation({
        mission_id: mission.id,
        mission_leader: String(operator?.full_name ?? operator?.username ?? ''),
        takeoff_time: draft.takeoffAt,
        landing_time: draft.landingAt,
        duration: missionDuration,
        max_altitude: draft.maxAltitude,
        cable_length: draft.cableLength,
        weather: draft.weather,
        remarks: draft.remark,
      });

      pushToast({
        tone: 'success',
        title: t('Misi baru dibuat'),
        detail: `${draft.missionName} (${draft.missionCode}) — ${missionDuration} ${t('menit direncanakan')}.`,
      });
      notify({
        title: t('Misi baru dibuat'),
        detail: `${draft.missionName} (${draft.missionCode}) — ${missionDuration} ${t('menit direncanakan')}.`,
        severity: 'informasi',
        category: 'Operasional',
        source: 'Flight Information',
        page: 'flight-info',
        silent: true,
      });
      closeMissionForm();
      loadLogbook();
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menyimpan misi'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
      notify({
        title: t('Gagal menyimpan misi'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Flight Information',
        page: 'flight-info',
        silent: true,
      });
    } finally {
      setSubmitting(false);
    }
  };


  const detailMission = detailMissionId != null ? (missions.find(m => m.id === detailMissionId) ?? null) : null;
  const detailInfo = detailMissionId != null ? (infoByMission.get(String(detailMissionId)) ?? null) : null;
  const playMission = playMissionId != null ? (missions.find(m => m.id === playMissionId) ?? null) : null;
  const endMission = endMissionId != null ? (missions.find(m => m.id === endMissionId) ?? null) : null;

  /* Ringkasan jumlah misi per status — dihitung langsung dari data
     GET /flight-missions yang sama dengan sumber Logbook Penerbangan. */
  const missionStatusCounts = useMemo(() => {
    const counts = { Planned: 0, Flight: 0, Done: 0 };
    for (const m of missions) {
      const name = missionStatusName(m);
      if (name === 'Planned' || name === 'Flight' || name === 'Done') counts[name] += 1;
    }
    return counts;
  }, [missions]);

  return (
    <LicenseGate moduleCode="1.3d" moduleName="Information Flight Balloon Intelligent App">
      <div className="animate-fade-in">
        <PageHead
          icon={<PlaneTakeoff size={22} />}
          title={t('Flight Information')}
          code="1.3d"
          description={t('Logbook penerbangan, checklist pra-terbang, dan roster tim operator.')}
          actions={
            <button
              className="btn btn-primary"
              onClick={() => setShowMissionForm(true)}
            >
              <Plus size={15} /> Misi Baru
            </button>
          }
        />

        <div className="lic-summary" >
          <Tile icon={<ClipboardCheck size={19} />} accent="var(--warning-400)" label={t('Misi Planned')} value={logbookLoading ? '—' : String(missionStatusCounts.Planned)} foot={t('belum lepas landas')} />
          <Tile icon={<PlaneTakeoff size={19} />} accent="var(--accent-primary)" label={t('Misi Flight')} value={logbookLoading ? '—' : String(missionStatusCounts.Flight)} foot={t('sedang berjalan')} />
          <Tile icon={<CheckCheck size={19} />} accent="var(--accent-emerald)" label={t('Misi Done')} value={logbookLoading ? '—' : String(missionStatusCounts.Done)} foot={t('sudah selesai')} />
        </div>


        <GlassCard tilt={false}>
          <SectionHead
            icon={<FileText size={15} />}
            title={t('Logbook Penerbangan')}
            sub={logbookLoading ? t('Memuat…') : `${missions.length} ${t('misi tercatat')}`}
          />
          {!logbookLoading && missions.length === 0 ? (
            <EmptyState
              icon={<FileText size={22} />}
              title={t('Belum ada misi')}
              description={t('Misi yang dibuat lewat "Misi Baru" akan muncul di sini.')}
            />
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>{t('Misi')}</th><th>{t('Lepas Landas')}</th>
                    <th>{t('Mendarat')}</th><th>{t('Durasi')}</th><th>{t('Ketinggian')}</th>
                    <th>{t('Pimpinan')}</th><th>{t('Status')}</th><th>{t('Aksi')}</th>
                  </tr>
                </thead>
                <tbody>
                  {missions.map(m => {
                    const info = infoByMission.get(String(m.id));
                    const statusName = missionStatusName(m);
                    const meta = MISSION_STATUS_META[statusName] ?? { label: statusName || '—', tone: 'danger' as const };
                    const leader = leaderByMission.get(String(m.id)) ?? '—';
                    const isActing = actionMissionId === m.id;
                    return (
                      <tr key={String(m.id)}>
                        <td className="font-mono" style={{ fontWeight: 700 }}>{m.mission_code ?? m.mission_name ?? String(m.id)}</td>
                        <td className="font-mono text-xs">{info?.takeoff_time ? info.takeoff_time.slice(0, 16).replace('T', ' ') : '—'}</td>
                        <td className="font-mono text-xs">{info?.landing_time ? info.landing_time.slice(0, 16).replace('T', ' ') : '—'}</td>
                        <td className="font-mono text-xs">{info?.duration != null ? formatDurationHM(info.duration) : '—'}</td>
                        <td className="font-mono text-xs">{info?.max_altitude != null ? `${info.max_altitude} m` : '—'}</td>
                        <td style={{ fontSize: 12 }}>{leader}</td>
                        <td><span className={`badge badge-${meta.tone}`}>{t(meta.label)}</span></td>
                        <td>
                          {statusName === 'Planned' && (
                            <button
                              className="btn btn-secondary btn-sm"
                              disabled={isActing}
                              onClick={() => {
                                if (isBalloonAvailable(resolveMissionBalloon(m))) setPlayMissionId(m.id);
                                else setBalloonUnavailableMissionId(m.id);
                              }}
                            >
                              <Play size={12} /> {t('Play to Flight')}
                            </button>
                          )}
                          {statusName === 'Flight' && (
                            <button className="btn btn-secondary btn-sm" disabled={isActing} onClick={() => setEndMissionId(m.id)}>
                              {isActing ? <Loader2 size={12} className="spin" /> : <Square size={12} />} {t('End Flight')}
                            </button>
                          )}
                          {statusName === 'Done' && (
                            <button className="btn btn-secondary btn-sm" onClick={() => setDetailMissionId(m.id)}>
                              <Eye size={12} /> {t('Detail')}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </GlassCard>

        {/* ----- Modal Misi Baru ----- */}
        {showMissionForm && (
          <div className="modal-backdrop" onClick={closeMissionForm}>
            <div className="modal lq" style={{ maxWidth: 700 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Misi Baru')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Misi Baru')}</h3>
                <button className="modal-x" onClick={closeMissionForm} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 12, maxHeight: '70vh', overflowY: 'auto' }}>
                {optionsLoading && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{t('Memuat opsi…')}</div>
                )}

                <RuleField label={t('Pilih Simulasi')}>
                  <select
                    className="form-input"
                    value={draft.simulationId}
                    onChange={e => setDraft(d => ({ ...d, simulationId: e.target.value }))}
                  >
                    <option value="">{t('— Pilih acuan simulasi —')}</option>
                    {simOptions.map(s => (
                      <option key={String(s.id)} value={String(s.id)}>{s.simulation_name}</option>
                    ))}
                  </select>
                </RuleField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, display: 'none' }}>
                  <RuleField label={t('Kode Misi')}>
                    <input
                      className="form-input"
                      value={draft.missionCode}
                      onChange={e => setDraft(d => ({ ...d, missionCode: e.target.value }))}
                      placeholder={t('mis. #26')}
                      autoFocus
                    />
                  </RuleField>

                </div>
                <RuleField label={t('Nama Misi')}>
                  <input
                    className="form-input"
                    value={draft.missionName}
                    onChange={e => setDraft(d => ({ ...d, missionName: e.target.value }))}
                    placeholder={t('mis. Pengawasan Zona A')}
                  />
                </RuleField>

                <RuleField label={t('Deskripsi Misi')}>
                  <textarea
                    className="form-input"
                    rows={3}
                    value={draft.description}
                    onChange={e => setDraft(d => ({ ...d, description: e.target.value }))}
                    placeholder={t('Ringkasan tujuan dan cakupan misi')}
                    style={{ resize: 'vertical' }}
                  />
                </RuleField>

                <div >
                  <RuleField label={t('Pilih Lokasi')}>
                    <div style={{ display: 'none', gap: 6 }}>
                      <div style={{ position: 'relative', flex: 1 }}>
                        <input
                          className="form-input"
                          placeholder={t('Cari nama lokasi…')}
                          value={locationQuery}
                          onFocus={() => setLocationDropdownOpen(true)}
                          onChange={e => {
                            setLocationQuery(e.target.value);
                            setLocationDropdownOpen(true);
                            if (draft.locationId) setDraft(d => ({ ...d, locationId: '' }));
                          }}
                          onBlur={() => setLocationDropdownOpen(false)}
                        />
                        {locationDropdownOpen && (
                          <div style={{
                            position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 20,
                            background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                            borderRadius: 'var(--radius-sm)', maxHeight: 180, overflowY: 'auto',
                            boxShadow: '0 12px 28px -12px rgba(0,0,0,0.5)',
                          }}>
                            {filteredLocationOptions.length === 0 && (
                              <div style={{ padding: '8px 10px', fontSize: 12, color: 'var(--text-muted)' }}>
                                {t('Lokasi tidak ditemukan')}
                              </div>
                            )}
                            {filteredLocationOptions.map(l => (
                              <div
                                key={String(l.id)}
                                className="geo-combo-option"
                                onMouseDown={() => {
                                  setDraft(d => ({ ...d, locationId: String(l.id) }));
                                  setLocationQuery(String(l.name ?? l.location_name ?? l.id));
                                  setLocationDropdownOpen(false);
                                }}
                                style={{ padding: '8px 10px', fontSize: 12.5, cursor: 'pointer' }}
                              >
                                {String(l.name ?? l.location_name ?? l.id)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        title={t('Pilih di peta (pratinjau)')}
                        onClick={() => setShowLocationPicker(v => !v)}
                      >
                        <MapPin size={14} />
                      </button>
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <EsriMap
                        camLat={pickedCoords?.lat ?? -6.2088}
                        camLon={pickedCoords?.lon ?? 106.8456}
                        altitude={0}
                        targets={[]}
                        selected={null}
                        onSelect={() => { }}
                        basemap="imagery"
                        markMode
                        onMapClick={(lat, lon) => setPickedCoords({ lat, lon })}
                        height={220}
                      />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                        {pickedCoords
                          ? `${t('Pratinjau titik')}: ${pickedCoords.lat.toFixed(5)}°, ${pickedCoords.lon.toFixed(5)}°`
                          : t('Klik pada peta untuk pratinjau koordinat.')}
                        {' — '}
                        {t('Lokasi misi tetap ditentukan dari daftar di atas.')}
                      </div>
                    </div>
                    {/* {showLocationPicker && (
                      <div style={{ marginTop: 8 }}>
                        <EsriMap
                          camLat={pickedCoords?.lat ?? -6.2088}
                          camLon={pickedCoords?.lon ?? 106.8456}
                          altitude={0}
                          targets={[]}
                          selected={null}
                          onSelect={() => { }}
                          basemap="imagery"
                          markMode
                          onMapClick={(lat, lon) => setPickedCoords({ lat, lon })}
                          height={220}
                        />
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>
                          {pickedCoords
                            ? `${t('Pratinjau titik')}: ${pickedCoords.lat.toFixed(5)}°, ${pickedCoords.lon.toFixed(5)}°`
                            : t('Klik pada peta untuk pratinjau koordinat.')}
                          {' — '}
                          {t('Lokasi misi tetap ditentukan dari daftar di atas.')}
                        </div>
                      </div>
                    )} */}
                  </RuleField>

                </div>
                <RuleField label={t('Pilih Balon')}>
                  <select
                    className="form-input"
                    value={draft.balloonId}
                    onChange={e => {
                      const balloonId = e.target.value;
                      /* Ketinggian maksimal mengikuti data balon yang dipilih —
                         diisi otomatis begitu balon dipilih, operator masih
                         bisa menurunkannya tapi dibatasi max di field-nya. */
                      const selected = balloonOptions.find(b => String(b.id) === balloonId);
                      const cap = selected?.max_altitude != null ? Number(selected.max_altitude) : undefined;
                      setDraft(d => ({
                        ...d,
                        balloonId,
                        maxAltitude: cap != null && Number.isFinite(cap) ? cap : d.maxAltitude,
                      }));
                    }}
                  >
                    <option value="">{t('Pilih…')}</option>
                    {balloonOptions.map(b => (
                      <option key={String(b.id)} value={String(b.id)}>
                        {String(b.name ?? b.balloon_name ?? b.id)}
                      </option>
                    ))}
                  </select>
                </RuleField>
                <RuleField label={t('Pilih Operator Misi')}>
                  <select
                    className="form-input"
                    value={draft.operatorId}
                    onChange={e => setDraft(d => ({ ...d, operatorId: e.target.value }))}
                  >
                    <option value="">{t('Pilih…')}</option>
                    {operatorOptions.map(o => (
                      <option key={String(o.id)} value={String(o.id)}>
                        {String(o.full_name ?? o.username ?? o.id)}
                      </option>
                    ))}
                  </select>
                </RuleField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <RuleField label={t('Tanggal & Waktu Take Off')}>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={draft.takeoffAt}
                      onChange={e => {
                        const takeoffAt = e.target.value;
                        setDraft(d => ({
                          ...d,
                          takeoffAt,
                          /* Landing yang sudah dipilih bisa jadi tidak valid lagi
                             terhadap take off baru — kosongkan agar dipilih ulang. */
                          landingAt: d.landingAt && d.landingAt < takeoffAt ? '' : d.landingAt,
                        }));
                      }}
                    />
                  </RuleField>
                  <RuleField label={t('Tanggal & Waktu Landing')}>
                    <input
                      type="datetime-local"
                      className="form-input"
                      value={draft.landingAt}
                      min={draft.takeoffAt || undefined}
                      disabled={!draft.takeoffAt}
                      onChange={e => {
                        const landingAt = e.target.value;
                        if (landingAt < draft.takeoffAt) return;
                        setDraft(d => ({ ...d, landingAt }));
                      }}
                    />
                  </RuleField>
                </div>
                {!draft.takeoffAt && (
                  <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: '-6px 0 0' }}>
                    {t('Isi Tanggal & Waktu Take Off terlebih dahulu untuk memilih waktu landing.')}
                  </p>
                )}

                <RuleField label={t('Durasi')}>
                  <input
                    className="form-input"
                    value={missionDuration > 0 ? `${formatDurationHM(missionDuration)} (${missionDuration} menit)` : '—'}
                    readOnly
                    disabled
                  />
                </RuleField>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <RuleField label={
                    selectedBalloonMaxAltitude != null
                      ? `${t('Ketinggian Maksimal (m AGL)')} — max ${selectedBalloonMaxAltitude} m`
                      : t('Ketinggian Maksimal (m AGL)')
                  }>
                    <input
                      type="number"
                      className="form-input"
                      value={draft.maxAltitude}
                      max={selectedBalloonMaxAltitude}
                      onChange={e => {
                        const raw = Number(e.target.value);
                        const capped = selectedBalloonMaxAltitude != null ? Math.min(raw, selectedBalloonMaxAltitude) : raw;
                        setDraft(d => ({ ...d, maxAltitude: capped }));
                      }}
                    />
                  </RuleField>
                  <RuleField label={`${t('Panjang Kabel (m)')} — max ${MAX_CABLE_LENGTH} m`}>
                    <input
                      type="number"
                      className="form-input"
                      value={draft.cableLength}
                      max={MAX_CABLE_LENGTH}
                      onChange={e => setDraft(d => ({ ...d, cableLength: Math.min(Number(e.target.value), MAX_CABLE_LENGTH) }))}
                    />
                  </RuleField>
                </div>

                <RuleField label={t('Cuaca')}>
                  <input
                    className="form-input"
                    value={draft.weather}
                    onChange={e => setDraft(d => ({ ...d, weather: e.target.value }))}
                    placeholder={t('mis. Cerah, angin 14 km/h, jarak pandang baik')}
                  />
                </RuleField>

                <RuleField label={t('Remark')}>
                  <textarea
                    className="form-input"
                    rows={2}
                    value={draft.remark}
                    onChange={e => setDraft(d => ({ ...d, remark: e.target.value }))}
                    placeholder={t('Catatan tambahan untuk misi ini')}
                    style={{ resize: 'vertical' }}
                  />
                </RuleField>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={closeMissionForm} disabled={submitting}>{t('Batal')}</button>
                <button className="btn btn-primary" onClick={submitMission} disabled={!missionReady || submitting}>
                  {submitting
                    ? <><Loader2 size={14} className="spin" /> {t('Menyimpan…')}</>
                    : <><Check size={14} /> {t('Simpan Misi')}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----- Modal Detail Misi ----- */}
        {detailMissionId != null && (
          <div className="modal-backdrop" onClick={() => setDetailMissionId(null)}>
            <div className="modal lq" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Detail Misi')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Detail Misi')}</h3>
                <button className="modal-x" onClick={() => setDetailMissionId(null)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                {detailMission ? (
                  <KVList rows={[
                    [t('Kode Misi'), detailMission.mission_code ?? '—'],
                    [t('Nama Misi'), detailMission.mission_name ?? '—'],
                    [t('Deskripsi'), detailMission.description ?? '—'],
                    [t('Lokasi'), detailMission.location?.name ?? '—'],
                    [t('Balon'), String(detailMission.balloon?.name ?? detailMission.balloon?.balloon_name ?? '—')],
                    [t('Pimpinan'), detailInfo?.mission_leader ?? '—'],
                    [t('Take Off'), detailInfo?.takeoff_time ?? '—'],
                    [t('Landing'), detailInfo?.landing_time ?? '—'],
                    [t('Durasi'), detailInfo?.duration != null ? `${detailInfo.duration} menit` : '—'],
                    [t('Ketinggian Maksimal'), detailInfo?.max_altitude != null ? `${detailInfo.max_altitude} m AGL` : '—'],
                    [t('Panjang Kabel'), detailInfo?.cable_length != null ? `${detailInfo.cable_length} m` : '—'],
                    [t('Cuaca'), detailInfo?.weather ?? '—'],
                    [t('Remark'), detailInfo?.remarks ?? '—'],
                  ]} />
                ) : (
                  <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('Data tidak ditemukan.')}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDetailMissionId(null)}>{t('Tutup')}</button>
              </div>
            </div>
          </div>
        )}

        {/* ----- Modal Play to Flight — checklist pra-terbang ----- */}
        {playMissionId != null && (
          <div className="modal-backdrop" onClick={() => setPlayMissionId(null)}>
            <div className="modal lq" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Checklist Pra-Terbang')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>
                  {t('Checklist Pra-Terbang')} — {playMission?.mission_code ?? playMission?.mission_name ?? String(playMissionId)}
                </h3>
                <button className="modal-x" onClick={() => setPlayMissionId(null)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <Bar
                  label={t('Kelengkapan checklist')}
                  value={completion}
                  color={criticalPending > 0 ? 'var(--warning-400)' : 'var(--accent-emerald)'}
                  foot={criticalPending > 0
                    ? `${criticalPending} ${t('butir kritis belum terpenuhi — lepas landas belum diizinkan')}`
                    : t('Seluruh butir kritis terpenuhi — lepas landas dapat dilanjutkan')}
                />
                <div style={{ marginTop: 6, maxHeight: 300, overflowY: 'auto' }}>
                  {CHECKLIST.map((c, i) => (
                    <label key={c.item} className="opt-row">
                      <input type="checkbox" checked={checked[i]} onChange={() => toggle(i)} />
                      <span style={{ flex: 1 }}>{c.item}</span>
                      {c.critical && (
                        <span className="badge badge-danger" style={{ fontSize: 8.5, flexShrink: 0 }}>{t('KRITIS')}</span>
                      )}
                    </label>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setPlayMissionId(null)} disabled={actionMissionId === playMissionId}>
                  {t('Batal')}
                </button>
                <button
                  className="btn btn-primary"
                  onClick={confirmTakeoff}
                  disabled={criticalPending > 0 || actionMissionId === playMissionId}
                >
                  {actionMissionId === playMissionId
                    ? <><Loader2 size={14} className="spin" /> {t('Memproses…')}</>
                    : <><Play size={14} /> {t('Mulai Penerbangan')}</>}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ----- Modal peringatan — balon sedang Unavailable ----- */}
        {balloonUnavailableMissionId != null && (() => {
          const mission = missions.find(m => m.id === balloonUnavailableMissionId);
          const balloon = mission ? resolveMissionBalloon(mission) : undefined;
          const balloonLabel = balloon?.name ?? balloon?.balloon_name ?? t('Balon pada misi ini');
          return (
            <div className="modal-backdrop" onClick={() => setBalloonUnavailableMissionId(null)}>
              <div className="modal lq" style={{ maxWidth: 440 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Balon Tidak Tersedia')}>
                <div className="modal-header">
                  <h3 className="danger-head" style={{ margin: 0, fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AlertTriangle size={17} /> {t('Balon Tidak Tersedia')}
                  </h3>
                  <button className="modal-x" onClick={() => setBalloonUnavailableMissionId(null)} aria-label={t('Tutup')}>
                    <X size={16} />
                  </button>
                </div>

                <div className="modal-body">
                  <div className="danger-callout">
                    <AlertTriangle size={16} />
                    <span>{balloonLabel} — {t('status saat ini Unavailable')}</span>
                  </div>
                  <p className="modal-lead" style={{ marginTop: 10 }}>
                    {t('Balon yang ditugaskan pada misi ini sedang dalam kondisi terbang (atau belum dikembalikan ke Available setelah misi sebelumnya). Penerbangan tidak dapat dimulai selagi statusnya Unavailable.')}
                  </p>
                  <p className="modal-note">
                    {t('Periksa dan perbarui status balon di Balloon Management sebelum mencoba lagi.')}
                  </p>
                </div>

                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={() => setBalloonUnavailableMissionId(null)}>
                    {t('Tutup')}
                  </button>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ----- Modal konfirmasi End Flight ----- */}
        {endMissionId != null && (
          <div className="modal-backdrop" onClick={() => setEndMissionId(null)}>
            <div className="modal lq" style={{ maxWidth: 420 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Konfirmasi End Flight')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Akhiri Penerbangan?')}</h3>
                <button className="modal-x" onClick={() => setEndMissionId(null)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  {t('Misi')} <strong>{endMission?.mission_code ?? endMission?.mission_name ?? String(endMissionId)}</strong> {t('akan ditandai selesai (Done). Tindakan ini mengubah status misi di server dan tidak bisa dibatalkan dari sini.')}
                </p>
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setEndMissionId(null)} disabled={actionMissionId === endMissionId}>
                  {t('Batal')}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={confirmEndFlight}
                  disabled={actionMissionId === endMissionId}
                >
                  {actionMissionId === endMissionId
                    ? <><Loader2 size={14} className="spin" /> {t('Memproses…')}</>
                    : <><Square size={14} /> {t('End Flight')}</>}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

/* =====================================================================
   1.3e — MONITORING AVAILABILITY MOORING APP SYSTEM
   ===================================================================== */
export function MooringMonitorPage() {
  const { t } = useApp();
  const windSeries = useMemo(() => series(71, 40, 14, 12, 0), []);
  const tensionSeries = useMemo(() => series(89, 40, 1240, 260, 0), []);
  const heliumSeries = useMemo(() => series(97, 40, 165, 8, 0), []);

  const sensors = [
    { label: 'Kecepatan Angin', value: '14 km/h', dir: 'Barat Laut (315°)', icon: <Wind size={13} />, ok: true, limit: '< 35 km/h' },
    { label: 'Tegangan Tarik Winch', value: '1.240 N', dir: 'Load cell utama', icon: <Gauge size={13} />, ok: true, limit: '< 4.500 N' },
    { label: 'Tekanan Helium', value: '165 bar', dir: 'Tabung utama', icon: <Waves size={13} />, ok: true, limit: '150 – 180 bar' },
    { label: 'Suhu Ambien', value: '29,4 °C', dir: 'Stasiun darat', icon: <Thermometer size={13} />, ok: true, limit: '< 45 °C' },
    { label: 'Baterai Cadangan', value: '24,2 V · 87%', dir: 'Bank baterai', icon: <BatteryCharging size={13} />, ok: true, limit: '> 22 V' },
    { label: 'Inverter Darurat', value: 'UNIT #1 AKTIF', dir: 'Siaga otomatis', icon: <Zap size={13} />, ok: true, limit: 'Selalu siaga' },
    { label: 'Proteksi Petir', value: 'AMAN', dir: 'Isolasi terpasang', icon: <CloudLightning size={13} />, ok: true, limit: 'Isolasi utuh' },
    { label: 'Tautan Optik EOP', value: '42,6 dB', dir: 'Serat optik kabel', icon: <Radio size={13} />, ok: true, limit: '> 40 dB' },
  ];

  return (
    <LicenseGate moduleCode="1.3e" moduleName="Monitoring Availability Mooring App System">
      <div className="animate-fade-in">
        <PageHead
          icon={<Anchor size={22} />}
          title={t('Mooring Availability Monitoring')}
          code="1.3e"
          description={t('Instrumen stasiun penambat: angin, tarikan winch, helium, dan daya cadangan.')}
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 10, marginBottom: 16 }}>
          {sensors.map(s => (
            <div key={s.label} className="metric">
              <div className="metric-label">{s.icon}{s.label}</div>
              <div className="metric-value" style={{ color: s.ok ? 'var(--success-400)' : 'var(--danger-400)', fontSize: 17 }}>{s.value}</div>
              <div className="metric-foot">{s.dir} · batas {s.limit}</div>
            </div>
          ))}
        </div>

        <div className="grid-2" style={{ marginBottom: 14 }}>
          <GlassCard tilt={false}>
            <SectionHead icon={<Wind size={15} />} title={t('Tren Kondisi Lingkungan')} sub={t('40 pembacaan terakhir')} />
            <Sparkline data={windSeries} color="var(--accent-cyan)" height={82} label={t('Kecepatan angin')} unit=" km/h" />
            <div style={{ height: 12 }} />
            <Sparkline data={heliumSeries} color="var(--accent-primary)" height={82} label={t('Tekanan helium')} unit=" bar" />
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<Gauge size={15} />} title={t('Tren Beban Mekanis')} sub={t('40 pembacaan terakhir')} />
            <Sparkline data={tensionSeries} color="var(--accent-amber)" height={82} label={t('Tegangan tarik kabel')} unit=" N" />
            <div style={{ marginTop: 14 }}>
              <Bar label={t('Pemanfaatan kapasitas tarik')} value={28} unit="%" color="var(--accent-emerald)" foot="1.240 N dari kapasitas kerja 4.500 N" />
              <Bar label={t('Kabel terulur')} value={75} unit="%" color="var(--accent-primary)" foot="450 m dari 600 m total" />
            </div>
          </GlassCard>
        </div>

        <div className="grid-2">
          <GlassCard tilt={false}>
            <SectionHead icon={<Anchor size={15} />} title={t('Status Winch & Penambat')} />
            <div className="table-container">
              <table>
                <thead><tr><th>{t('Unit')}</th><th>{t('Fungsi')}</th><th>{t('Status')}</th><th>{t('Beban')}</th></tr></thead>
                <tbody>
                  {[
                    ['Winch Utama', 'Kabel penambat daya', 'SIAGA', '1.240 N'],
                    ['Winch Bantu 1', 'Tali pengarah kiri', 'SIAGA', '310 N'],
                    ['Winch Bantu 2', 'Tali pengarah kanan', 'SIAGA', '298 N'],
                    ['Winch Bantu 3', 'Tali pengarah belakang', 'SIAGA', '284 N'],
                    ['Rem Darurat', 'Penahan mekanis', 'AKTIF', '—'],
                    ['Daya Eksternal', 'Genset 230 VAC', 'AKTIF', '417 W'],
                  ].map(row => (
                    <tr key={row[0]}>
                      <td style={{ fontWeight: 600 }}>{row[0]}</td>
                      <td style={{ fontSize: 12 }}>{row[1]}</td>
                      <td><span className={`badge badge-${row[2] === 'AKTIF' ? 'success' : 'info'}`}>{row[2]}</span></td>
                      <td className="font-mono text-xs">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<AlertTriangle size={15} />} title={t('Batas Operasi Mooring')} />
            <KVList rows={[
              ['Kecepatan Angin Aman', '< 35 km/h berkelanjutan'],
              ['Hembusan Maksimum', '< 45 km/h sesaat'],
              ['Tekanan Helium Kerja', '150 – 180 bar'],
              ['Kapasitas Tarik Kerja', '4.500 N'],
              ['Ketinggian Maksimum', '600 m AGL'],
              ['Suhu Operasi', '−10 °C s.d. +45 °C'],
              ['Curah Hujan Maksimum', '15 mm/jam'],
              ['Jarak Aman Petir', '> 10 km'],
            ]} />
            <div className="key-hint" style={{ marginTop: 12 }}>
              <Info size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-primary)' }} />
              <span>
                {t('Bila kecepatan angin melewati 35 km/h, sistem menerbitkan peringatan kritis dan merekomendasikan penurunan balon melalui modul Smart Notification.')}
              </span>
            </div>
          </GlassCard>
        </div>
      </div>
    </LicenseGate>
  );
}

/* =====================================================================
   1.3f — SIMULATION PLAN SKENARIO FLIGHT BALLOON
   ===================================================================== */
interface SimInput {
  nama: string;
  wind: number;
  gust: number;
  visibility: number;
  temperature: number;
  rain: number;
  altitude: number;
  helium: number;
  payload: number;
  duration: number;
}

type Verdict = 'GO' | 'MARGINAL' | 'NO-GO';

interface FactorResult {
  name: string;
  verdict: Verdict;
  detail: string;
}

/* Aturan kelayakan terbang — batas mengacu pada prosedur operasi balon
   tertambat dan kapasitas platform 180 m³. */
function assess(v: SimInput): { verdict: Verdict; factors: FactorResult[]; margin: number } {
  const factors: FactorResult[] = [];

  const grade = (name: string, ok: boolean, marginal: boolean, detail: string) =>
    factors.push({ name, verdict: ok ? 'GO' : marginal ? 'MARGINAL' : 'NO-GO', detail });

  grade('Kecepatan Angin', v.wind < 25, v.wind < 35,
    `${v.wind} km/h — aman < 25, batas operasi 35 km/h`);
  grade('Hembusan Angin', v.gust < 35, v.gust < 45,
    `${v.gust} km/h — aman < 35, batas 45 km/h`);
  grade('Jarak Pandang', v.visibility >= 8, v.visibility >= 4,
    `${v.visibility} km — optimal ≥ 8 km untuk pengamatan EO`);
  grade('Suhu Ambien', v.temperature <= 40 && v.temperature >= -5, v.temperature <= 45,
    `${v.temperature} °C — rentang operasi −10 s.d. +45 °C`);
  grade('Curah Hujan', v.rain <= 5, v.rain <= 15,
    `${v.rain} mm/jam — batas operasi 15 mm/jam`);
  grade('Ketinggian Rencana', v.altitude <= 500, v.altitude <= 600,
    `${v.altitude} m AGL — panjang kabel terpasang 600 m`);
  grade('Cadangan Helium', v.helium >= 160, v.helium >= 150,
    `${v.helium} bar — minimum lepas landas 150 bar`);
  grade('Bobot Payload', v.payload <= 12, v.payload <= 15,
    `${v.payload} kg — kapasitas angkut platform 180 m³ adalah 15 kg`);

  /* Daya angkut bersih menurun seiring suhu dan bobot payload. */
  const lift = 180 * 1.05 - v.payload - Math.max(0, (v.temperature - 25) * 0.18);
  grade('Daya Angkut Bersih', lift > 170, lift > 165,
    `${lift.toFixed(1)} kg gaya angkat tersedia setelah dikurangi payload`);

  const durationOk = v.duration <= 480;
  grade('Durasi Misi', durationOk, v.duration <= 600,
    `${Math.floor(v.duration / 60)} jam ${v.duration % 60} menit — blok maksimum 8 jam`);

  const noGo = factors.filter(f => f.verdict === 'NO-GO').length;
  const marginal = factors.filter(f => f.verdict === 'MARGINAL').length;

  const verdict: Verdict = noGo > 0 ? 'NO-GO' : marginal > 1 ? 'MARGINAL' : marginal === 1 ? 'MARGINAL' : 'GO';
  const margin = Math.round(((factors.length - noGo * 2 - marginal) / factors.length) * 100);

  return { verdict, factors, margin: Math.max(0, margin) };
}

const VERDICT_META: Record<Verdict, { color: string; icon: React.ReactNode; note: string }> = {
  'GO': {
    color: 'var(--success-400)',
    icon: <CircleCheck size={40} />,
    note: 'Seluruh parameter berada dalam batas aman. Penerbangan dapat dilaksanakan sesuai rencana.',
  },
  'MARGINAL': {
    color: 'var(--warning-400)',
    icon: <CircleAlert size={40} />,
    note: 'Terdapat parameter yang mendekati batas operasi. Penerbangan dapat dilanjutkan dengan pemantauan ketat dan rencana penurunan dini.',
  },
  'NO-GO': {
    color: 'var(--danger-400)',
    icon: <CircleX size={40} />,
    note: 'Satu atau lebih parameter melewati batas operasi. Penerbangan tidak direkomendasikan hingga kondisi membaik.',
  },
};

export function SimulationPage() {
  const { pushToast, notify, t, lang, account } = useApp();
  const [input, setInput] = useState<SimInput>({
    nama: '', wind: 0, gust: 0, visibility: 0, temperature: 0,
    rain: 0, altitude: 0, helium: 0, payload: 0, duration: 0,
  });
  const [result, setResult] = useState<ReturnType<typeof assess> | null>(null);
  const [running, setRunning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<FlightSimulationRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [detailId, setDetailId] = useState<string | number | null>(null);
  const [detailData, setDetailData] = useState<FlightSimulationRecord | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  /* Riwayat disaring ke milik operator yang sedang login saja — pakai
     account.userId dari context (diisi saat login dari user_id/id
     backend). Fallback ke /auth/me hanya bila context belum sempat
     terisi (mis. saat reload cepat). */
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const rows = await api.getFlightSimulations();
      let myId: string | number | undefined = account?.userId;
      if (myId == null) {
        const me = await api.getProfile();
        myId = me.user?.user_id ?? me.user?.id;
      }
      const mine = myId == null
        ? rows
        : rows.filter(r => String(r.created_by) === String(myId));
      setHistory(mine);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [account?.userId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  useEffect(() => {
    if (detailId == null) return;
    let cancelled = false;
    setDetailLoading(true);
    setDetailData(null);
    api.getFlightSimulationById(detailId)
      .then(row => { if (!cancelled) setDetailData(row); })
      .catch(() => {
        if (!cancelled) {
          pushToast({ tone: 'error', title: t('Gagal memuat detail'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
          notify({
            title: t('Gagal memuat detail'),
            detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
            severity: 'peringatan',
            category: 'Operasional',
            source: 'Flight Simulation',
            page: 'simulation',
            silent: true,
          });
          setDetailId(null);
        }
      })
      .finally(() => { if (!cancelled) setDetailLoading(false); });
    return () => { cancelled = true; };
  }, [detailId, pushToast, notify, t]);

  const set = (k: keyof Omit<SimInput, 'nama'>) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput(p => ({ ...p, [k]: Number(e.target.value) }));

  const setNama = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInput(p => ({ ...p, nama: e.target.value }));

  const run = () => {
    setRunning(true);
    window.setTimeout(() => {
      const r = assess(input);
      setResult(r);
      setRunning(false);
      pushToast({
        tone: r.verdict === 'GO' ? 'success' : r.verdict === 'MARGINAL' ? 'warning' : 'error',
        title: `Hasil simulasi: ${r.verdict}`,
        detail: VERDICT_META[r.verdict].note,
      });
      notify({
        title: `Hasil simulasi: ${r.verdict}`,
        detail: VERDICT_META[r.verdict].note,
        severity: r.verdict === 'GO' ? 'informasi' : 'peringatan',
        category: 'Operasional',
        source: 'Flight Simulation',
        page: 'simulation',
        silent: true,
      });
    }, 1000);
  };

  /* Tombol Simpan hanya tampil setelah ada hasil (result), tapi input bisa
     saja diubah lagi setelah simulasi dijalankan — jadi tetap dicek ulang
     di sini, bukan cuma mengandalkan validasi di form. */
  const saveSimulation = async () => {
    if (!result || saving) return;

    const requiredFields: [string, number | string][] = [
      [t('Nama Simulasi'), input.nama],
      [t('Angin (km/h)'), input.wind],
      [t('Hembusan (km/h)'), input.gust],
      [t('Jarak Pandang (km)'), input.visibility],
      [t('Suhu (°C)'), input.temperature],
      [t('Curah Hujan (mm/j)'), input.rain],
      [t('Ketinggian (m AGL)'), input.altitude],
      [t('Helium (bar)'), input.helium],
      [t('Payload (kg)'), input.payload],
      [t('Durasi (menit)'), input.duration],
    ];
    const missing = requiredFields
      .filter(([, value]) => (typeof value === 'string' ? value.trim() === '' : !Number.isFinite(value)))
      .map(([label]) => label);

    if (missing.length > 0) {
      pushToast({
        tone: 'error',
        title: t('Form belum lengkap'),
        detail: `${t('Isi dulu')}: ${missing.join(', ')}.`,
      });
      notify({
        title: t('Form belum lengkap'),
        detail: `${t('Isi dulu')}: ${missing.join(', ')}.`,
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Flight Simulation',
        page: 'simulation',
        silent: true,
      });
      return;
    }

    /* Faktor yang tidak GO menjelaskan tepatnya kenapa penerbangan
       ditahan/dibatalkan; kalau semua faktor GO, pakai catatan verdict
       yang memang menjelaskan kondisi aman secara umum. */
    const concerning = result.factors.filter(f => f.verdict !== 'GO');
    const remarks = concerning.length > 0
      ? concerning.map(f => `${f.name}: ${f.detail}`).join(' | ')
      : VERDICT_META[result.verdict].note;

    setSaving(true);
    try {
      await api.createFlightSimulation({
        simulation_name: input.nama,
        payload_weight: input.payload,
        helium_volume: input.helium,
        flight_altitude: input.altitude,
        estimated_duration: input.duration,
        wind_speed: input.wind,
        gust_speed: input.gust,
        visibility: input.visibility,
        rainfall: input.rain,
        temperature: input.temperature,
        go_no_go: result.verdict === 'GO' || result.verdict === 'MARGINAL',
        remarks,
      });
      pushToast({
        tone: 'success',
        title: t('Simulasi disimpan'),
        detail: `${input.nama} — hasil ${result.verdict} tersimpan ke riwayat.`,
      });
      notify({
        title: t('Simulasi disimpan'),
        detail: `${input.nama} — hasil ${result.verdict} tersimpan ke riwayat.`,
        severity: 'informasi',
        category: 'Operasional',
        source: 'Flight Simulation',
        page: 'simulation',
        silent: true,
      });
      setInput({ nama: '', wind: 0, gust: 0, visibility: 0, temperature: 0, rain: 0, altitude: 0, helium: 0, payload: 0, duration: 0 });
      setResult(null);
      loadHistory();
    } catch {
      pushToast({
        tone: 'error',
        title: t('Gagal menyimpan simulasi'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
      });
      notify({
        title: t('Gagal menyimpan simulasi'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Flight Simulation',
        page: 'simulation',
        silent: true,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <LicenseGate moduleCode="1.3f" moduleName="Simulation Plan Skenario Flight Balloon">
      <div className="animate-fade-in">
        <PageHead
          icon={<FlaskConical size={22} />}
          title={t('Flight Simulation & GO/NO-GO')}
          code="1.3f"
          description={t('Kelayakan terbang dari cuaca, helium, bobot payload, dan durasi misi.')}
          actions={
            <button className="btn btn-primary" onClick={run} disabled={running}>
              {running ? <><RefreshCw size={15} className="spin" /> {t('Menghitung…')}</> : <><Play size={15} /> {t('Jalankan Simulasi')}</>}
            </button>
          }
        />

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 380px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead icon={<FlaskConical size={15} />} title={t('Parameter Skenario')} sub={t('Isi berdasarkan perkiraan cuaca dan rencana misi')} />
              <Field label={t('Nama Simulasi')} type="text" value={input.nama} onChange={setNama} />

              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '4px 0 10px' }}>
                {t('Kondisi Meteorologi')}
              </div>
              <div className="grid-4">
                <Field label={t('Angin (km/h)')} value={input.wind} onChange={set('wind')} />
                <Field label={t('Hembusan (km/h)')} value={input.gust} onChange={set('gust')} />
                <Field label={t('Jarak Pandang (km)')} value={input.visibility} onChange={set('visibility')} />
                <Field label={t('Suhu (°C)')} value={input.temperature} onChange={set('temperature')} />
              </div>
              <div className="grid-4">
                <Field label={t('Curah Hujan (mm/j)')} value={input.rain} onChange={set('rain')} />
              </div>

              <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '16px 0 10px' }}>
                {t('Rencana Penerbangan')}
              </div>
              <div className="grid-4">
                <Field label={t('Ketinggian (m AGL)')} value={input.altitude} onChange={set('altitude')} />
                <Field label={t('Helium (bar)')} value={input.helium} onChange={set('helium')} />
                <Field label={t('Payload (kg)')} value={input.payload} onChange={set('payload')} />
                <Field label={t('Durasi (menit)')} value={input.duration} onChange={set('duration')} />
              </div>

              <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                <button className="btn btn-primary" onClick={run} disabled={running}>
                  {running ? <><RefreshCw size={14} className="spin" /> {t('Menghitung…')}</> : <><Play size={14} /> {t('Jalankan Simulasi')}</>}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => { setInput({ nama: '', wind: 0, gust: 0, visibility: 0, temperature: 0, rain: 0, altitude: 0, helium: 0, payload: 0, duration: 0 }); setResult(null); }}
                >
                  <RefreshCw size={14} /> Kembalikan Nilai Awal
                </button>
                {result && (
                  <button
                    className="btn btn-success"
                    onClick={saveSimulation}
                    disabled={saving}
                  >
                    {saving
                      ? <><Loader2 size={14} className="spin" /> {t('Menyimpan…')}</>
                      : <><Save size={14} /> {t('Simpan')}</>}
                  </button>
                )}
              </div>
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead icon={<History size={15} />} title={t('Riwayat Simulasi Saya')} sub={t('Hasil simulasi yang pernah kamu simpan')} />
              {historyLoading ? (
                <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                  {t('Memuat riwayat…')}
                </div>
              ) : history.length === 0 ? (
                <EmptyState
                  icon={<History size={22} />}
                  title={t('Belum ada riwayat')}
                  description={t('Simulasi yang kamu simpan akan muncul di sini.')}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 320, overflowY: 'auto' }}>
                  {history.map(item => {
                    const go = item.go_no_go !== false;
                    const color = go ? 'var(--success-400)' : 'var(--danger-400)';
                    return (
                      <div key={String(item.id)} className="lic-feature" style={{ alignItems: 'center' }}>
                        <span
                          className="fcode"
                          style={{
                            background: `color-mix(in srgb, ${color} 12%, transparent)`,
                            color,
                            borderColor: `color-mix(in srgb, ${color} 24%, transparent)`,
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {go ? t('LAYAK') : t('TIDAK LAYAK')}
                        </span>
                        <span style={{ minWidth: 0 }}>
                          <span className="fname">{item.simulation_name}</span>
                          <span className="fdesc">
                            {item.created_at ? fullTimestamp(new Date(item.created_at).getTime(), lang) : ''}
                            {item.remarks ? ` — ${item.remarks}` : ''}
                          </span>
                        </span>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ flexShrink: 0 }}
                          onClick={() => setDetailId(item.id)}
                        >
                          <Eye size={13} /> {t('Detail')}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false} glow={result ? `${VERDICT_META[result.verdict].color}22` : undefined}>
              <SectionHead icon={<ClipboardCheck size={15} />} title={t('Keputusan Kelayakan')} />
              {result ? (
                <div style={{ textAlign: 'center', padding: '10px 0 4px' }}>
                  <span style={{ color: VERDICT_META[result.verdict].color, display: 'block' }}>
                    {VERDICT_META[result.verdict].icon}
                  </span>
                  <div
                    style={{
                      fontFamily: 'var(--font-heading)', fontSize: 40, fontWeight: 900, marginTop: 8,
                      color: VERDICT_META[result.verdict].color,
                      textShadow: `0 0 28px color-mix(in srgb, ${VERDICT_META[result.verdict].color} 34%, transparent)`,
                    }}
                  >
                    {result.verdict}
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.65, textAlign: 'left' }}>
                    {VERDICT_META[result.verdict].note}
                  </p>
                  <div style={{ marginTop: 14, textAlign: 'left' }}>
                    <Bar
                      label={t('Margin keselamatan gabungan')}
                      value={result.margin}
                      color={VERDICT_META[result.verdict].color}
                      foot={`${result.factors.filter(f => f.verdict === 'GO').length} dari ${result.factors.length} faktor berada dalam batas aman`}
                    />
                  </div>
                </div>
              ) : (
                <EmptyState
                  icon={<FlaskConical size={22} />}
                  title={t('Belum ada simulasi dijalankan')}
                  description={t('Isi parameter skenario, lalu jalankan simulasi untuk memperoleh keputusan.')}
                />
              )}
            </GlassCard>

            {result && (
              <GlassCard tilt={false}>
                <SectionHead icon={<Filter size={15} />} title={t('Penilaian per Faktor')} sub={`${result.factors.length} faktor dievaluasi`} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {result.factors.map(f => (
                    <div key={f.name} className="lic-feature" style={{ alignItems: 'center' }}>
                      <span
                        className="fcode"
                        style={{
                          background: `color-mix(in srgb, ${VERDICT_META[f.verdict].color} 12%, transparent)`,
                          color: VERDICT_META[f.verdict].color,
                          borderColor: `color-mix(in srgb, ${VERDICT_META[f.verdict].color} 24%, transparent)`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {f.verdict}
                      </span>
                      <span style={{ minWidth: 0 }}>
                        <span className="fname">{f.name}</span>
                        <span className="fdesc">{f.detail}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </GlassCard>
            )}
          </div>
        </div>

        {/* ----- Detail riwayat simulasi ----- */}
        {detailId != null && (
          <div className="modal-backdrop" onClick={() => setDetailId(null)}>
            <div className="modal lq" style={{ maxWidth: 480 }} onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label={t('Detail Simulasi')}>
              <div className="modal-header">
                <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700 }}>{t('Detail Simulasi')}</h3>
                <button className="modal-x" onClick={() => setDetailId(null)} aria-label={t('Tutup')}>
                  <X size={16} />
                </button>
              </div>

              <div className="modal-body">
                {detailLoading ? (
                  <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('Memuat detail…')}
                  </div>
                ) : detailData ? (
                  <KVList rows={[
                    [t('Nama Simulasi'), detailData.simulation_name ?? '—'],
                    [t('Status'), detailData.go_no_go === false ? t('TIDAK LAYAK') : t('LAYAK')],
                    [t('Bobot Payload (kg)'), String(detailData.payload_weight ?? '—')],
                    [t('Volume Helium (bar)'), String(detailData.helium_volume ?? '—')],
                    [t('Ketinggian (m AGL)'), String(detailData.flight_altitude ?? '—')],
                    [t('Estimasi Durasi (menit)'), String(detailData.estimated_duration ?? '—')],
                    [t('Kecepatan Angin (km/h)'), String(detailData.wind_speed ?? '—')],
                    [t('Kecepatan Hembusan (km/h)'), String(detailData.gust_speed ?? '—')],
                    [t('Jarak Pandang (km)'), String(detailData.visibility ?? '—')],
                    [t('Curah Hujan (mm/j)'), String(detailData.rainfall ?? '—')],
                    [t('Suhu (°C)'), String(detailData.temperature ?? '—')],
                    [t('Catatan'), detailData.remarks ?? '—'],
                    [t('Dibuat pada'), detailData.created_at ? fullTimestamp(new Date(detailData.created_at).getTime(), lang) : '—'],
                  ]} />
                ) : (
                  <div style={{ padding: '18px 0', textAlign: 'center', fontSize: 12, color: 'var(--text-muted)' }}>
                    {t('Data tidak ditemukan.')}
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setDetailId(null)}>{t('Tutup')}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </LicenseGate>
  );
}

function Field({
  label, value, onChange, type = 'number',
}: {
  label: string;
  value: number | string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'number' | 'text';
}) {
  /* Label harus terhubung ke kolomnya, bukan sekadar berdiri di
     sebelahnya — tanpa itu pembaca layar mengumumkan "spin button"
     tanpa menyebut besaran apa yang sedang diisi. */
  const id = useId();
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{label}</label>
      <input id={id} className="form-input font-mono" type={type} value={value} onChange={onChange} />
    </div>
  );
}
