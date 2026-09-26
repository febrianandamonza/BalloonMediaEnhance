'use client';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import LicenseGate from '../../components/LicenseGate';
import GlassCard from '../../components/GlassCard';
import { useApp, useNavGuard } from '../../context';
import {
  PageHead, Metric, MetricRow, SectionHead, KVList,
  EmptyState,
  OfflineNotice,
} from '../../components/ui';
import { CompareSlider, VideoPlayer } from '../../components/media';
import api, {
  API_BASE_MEDIA, WS_BASE, type FlightMissionRecord, type FlightInformationRecord,
  type DetectImageResult, type DetectedObject, type DetectVideoFrameMessage,
  type CrowdVideoFrameMessage,
} from '../../services/api';
import {
  UsersRound, Play, Pause, Square, Camera, Cpu, Video, Radio,
  ScanSearch, Clapperboard, UploadCloud, Image as ImageIcon, Target,
  Crosshair, SlidersHorizontal, ListFilter, Activity, MapPin,
  Car, PersonStanding, Save, RefreshCw, Loader2, FileVideo,
} from 'lucide-react';

/** Huruf pertama kapital untuk nama kelas objek ("person" → "Person"). */
function capitalize(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

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
/** Ringkasan penyelesaian sesi crowd counting — hanya terisi begitu
    backend menandai sesi selesai lewat pesan WebSocket `finished`. */
interface CrowdSessionResult {
  temp_path?: string;
  processing_type?: string;
  preview_url?: string;
  processing_time?: number;
  summary?: CrowdVideoFrameMessage['summary'];
}

/** Satu frame density-map yang sudah diterima lewat WebSocket — direkam
    ke dalam array `frames` supaya sesi bisa diputar ulang sebagai
    linimasa begitu selesai, sama seperti VideoDetectionPage. Dibatasi ke
    CROWD_FRAME_BUFFER frame terbaru: sesi crowd counting biasanya jauh
    lebih lama daripada deteksi video biasa, jadi linimasa tak terbatas
    berisiko menumpuk memori peramban selama sesi berjalan. */
interface CapturedCrowdFrame {
  image: string;
  count: number;
  /** milidetik sejak sesi dimulai — dipakai label linimasa */
  t: number;
}

const CROWD_FRAME_BUFFER = 400;

type VideoSourceKind = 'upload' | 'udp';

/** Batas tunggu pesan `finished` setelah operator menekan Hentikan pada
    sesi UDP. Backend baru mengirimnya setelah inferensi terakhir selesai
    (dan paling lama ~10 detik kalau sumber masih dibuka); kalau tak kunjung
    datang, socket ditutup paksa supaya tombol tidak terkunci di
    "Menghentikan…". */
const LIVE_STOP_TIMEOUT_MS = 15000;

/** Pesan galat yang dikirim backend lewat api.request() — { status, message }
    untuk BadRequestException, { status, detail } untuk HTTPException. Galat
    tanpa `status` berarti server tidak terjangkau sama sekali, jadi pesan
    bawaan peramban ("Failed to fetch") diganti fallback yang lebih jelas. */
function errorMessage(err: unknown, fallback: string): string {
  if (err && typeof err === 'object' && 'status' in err) {
    const { message, detail } = err as { message?: unknown; detail?: unknown };
    if (typeof message === 'string' && message) return message;
    if (typeof detail === 'string' && detail) return detail;
  }
  return fallback;
}

/* Lebar label angka pada DensityTrendChart diperkirakan dari jumlah
   karakternya (fontnya monospace), supaya bisa dicek muat atau tidak
   sebelum digambar. */
const TREND_PREV_CHAR_PX = 6.4;
const TREND_LATEST_CHAR_PX = 7.6;
const TREND_LABEL_GAP_PX = 6;

function trendLabelStyle(latest: boolean, dimmed: boolean): React.CSSProperties {
  return {
    position: 'absolute', fontFamily: 'var(--font-code)',
    fontSize: latest ? 12 : 10.5, fontWeight: latest ? 700 : 500,
    color: latest ? 'var(--text-primary)' : 'var(--text-muted)',
    lineHeight: 1, whiteSpace: 'nowrap', pointerEvents: 'none',
    opacity: dimmed ? 0.25 : 1, transition: 'opacity 0.15s ease',
  };
}

function trendDotStyle(left: number, top: number, color: string): React.CSSProperties {
  return {
    position: 'absolute', left: `${left}%`, top: `${top}%`,
    width: 8, height: 8, borderRadius: '50%', background: color,
    boxShadow: '0 0 0 2px var(--bg-card-solid)',
    transform: 'translate(-50%, -50%)', pointerEvents: 'none',
  };
}

/** Tren kepadatan dengan angka. `data` dicatat per frame, sedangkan DM-Count
    baru menghasilkan hitungan baru tiap beberapa frame, jadi angka yang sama
    berulang membentuk segmen datar. Yang dilabeli karena itu bukan setiap
    titik, melainkan satu angka per pembacaan: pembacaan terkini di titik
    paling kanan, pembacaan sebelumnya di tengah segmennya. Label sebelumnya
    hanya digambar kalau muat di dalam segmennya sendiri — label yang
    melebar keluar akan tercoret garis naik/turun di sebelahnya — dan tidak
    menabrak label di kanannya. Angka di titik mana pun tetap bisa dibaca
    lewat hover.

    Beda dari Sparkline bersama (dipakai Dashboard): teks dan titik digambar
    sebagai HTML di atas SVG, karena SVG-nya memakai
    preserveAspectRatio="none" — teks/lingkaran di dalamnya akan ikut gepeng. */
function DensityTrendChart({ data, color, height = 130 }: { data: number[]; color: string; height?: number }) {
  const { t } = useApp();
  const plotRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  /* Lebar grafik dalam piksel — dibutuhkan untuk mengecek label muat di
     segmennya. Selama belum terukur, hanya label terkini yang digambar. */
  const [plotWidth, setPlotWidth] = useState(0);

  useEffect(() => {
    const el = plotRef.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setPlotWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const last = data.length - 1;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const x = (i: number) => (last > 0 ? (i / last) * 100 : 100);
  /* 22% ruang atas untuk label angka, 8% bawah supaya garis tidak
     menempel tepi. */
  const y = (v: number) => 100 - 8 - ((v - min) / span) * 70;
  /* Label di dekat tepi dijangkar ke dalam supaya tidak terpotong. */
  const anchor = (i: number) => (x(i) > 88 ? '-100%' : x(i) < 12 ? '0%' : '-50%');

  const pts = data.map((v, i) => `${x(i).toFixed(2)},${y(v).toFixed(2)}`).join(' ');

  const runs: { start: number; end: number }[] = [];
  data.forEach((v, i) => {
    const run = runs[runs.length - 1];
    if (run && data[run.start] === v) run.end = i;
    else runs.push({ start: i, end: i });
  });
  const toPct = (px: number) => (plotWidth > 0 ? (px / plotWidth) * 100 : Infinity);
  const latestText = data[last].toLocaleString('id-ID');
  /* Label terkini dijangkar ke tepi kanan titiknya; setiap label sebelumnya
     harus berakhir sebelum tepi kiri label yang sudah ditempatkan di
     kanannya. */
  let leftBound = x(last) - toPct(latestText.length * TREND_LATEST_CHAR_PX);
  /* Segmen terkini hampir selalu pendek (pembacaan baru tiap beberapa
     frame). Kalau angkanya baru turun, label yang menempel di atas titiknya
     akan tercoret garis turun dari segmen sebelumnya — jadi label diangkat
     di atas titik tertinggi garis sepanjang rentang lebarnya. Segmen yang
     masuk dari kiri rentang ikut dihitung, lalu loop berhenti. */
  let latestLabelValue = data[last];
  for (let i = last - 1; i >= 0; i--) {
    latestLabelValue = Math.max(latestLabelValue, data[i]);
    if (x(i) <= leftBound) break;
  }
  const prevLabels: { start: number; center: number; top: number; text: string }[] = [];
  for (let r = runs.length - 2; r >= 0; r--) {
    const { start, end } = runs[r];
    const text = data[start].toLocaleString('id-ID');
    const width = toPct(text.length * TREND_PREV_CHAR_PX);
    const center = (x(start) + x(end)) / 2;
    const fitsSegment = x(end) - x(start) >= width;
    const clearOfRight = center + width / 2 <= leftBound - toPct(TREND_LABEL_GAP_PX);
    if (!fitsSegment || !clearOfRight) continue;
    prevLabels.push({ start, center, top: y(data[start]), text });
    leftBound = center - width / 2;
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const rect = plotRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || last < 1) return;
    const ratio = Math.min(1, Math.max(0, (e.clientX - rect.left) / rect.width));
    setHover(Math.round(ratio * last));
  };

  /* Data terus bergeser selama sesi live, jadi indeks hover bisa sesaat
     melewati panjang data yang baru. */
  const hoverIndex = hover != null ? Math.min(hover, last) : null;

  return (
    <div
      ref={plotRef}
      role="img"
      aria-label={`${t('Tren kepadatan')}: ${t('terkini')} ${data[last].toLocaleString('id-ID')} ${t('jiwa')}, ${t('tertinggi')} ${max.toLocaleString('id-ID')}.`}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setHover(null)}
      style={{ position: 'relative', height, touchAction: 'pan-y' }}
    >
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block', overflow: 'visible' }}
        aria-hidden
      >
        <polyline points={`0,100 ${pts} 100,100`} fill={`color-mix(in srgb, ${color} 12%, transparent)`} stroke="none" />
        <polyline
          points={pts}
          fill="none"
          stroke={color}
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {hoverIndex != null && (
          <line
            x1={x(hoverIndex)} x2={x(hoverIndex)} y1="0" y2="100"
            stroke="var(--border-strong)" strokeWidth="1" vectorEffect="non-scaling-stroke"
          />
        )}
      </svg>

      {prevLabels.map(l => (
        <span
          key={l.start}
          aria-hidden
          style={{
            ...trendLabelStyle(false, hoverIndex != null),
            left: `${l.center}%`, top: `${l.top}%`,
            transform: 'translate(-50%, calc(-100% - 7px))',
          }}
        >
          {l.text}
        </span>
      ))}
      <span
        aria-hidden
        style={{
          ...trendLabelStyle(true, hoverIndex != null),
          left: `${x(last)}%`, top: `${y(latestLabelValue)}%`,
          transform: `translate(${anchor(last)}, calc(-100% - 7px))`,
        }}
      >
        {latestText}
      </span>

      <span aria-hidden style={trendDotStyle(x(last), y(data[last]), color)} />

      {hoverIndex != null && (
        <>
          <span aria-hidden style={trendDotStyle(x(hoverIndex), y(data[hoverIndex]), color)} />
          <div
            aria-hidden
            style={{
              position: 'absolute', left: `${x(hoverIndex)}%`, top: 0,
              transform: `translateX(${anchor(hoverIndex)})`,
              background: 'var(--bg-elevated)', border: '1px solid var(--border-strong)',
              borderRadius: 6, padding: '4px 8px', fontSize: 11, lineHeight: 1.3,
              whiteSpace: 'nowrap', pointerEvents: 'none', zIndex: 1,
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.18)',
            }}
          >
            <b style={{ fontFamily: 'var(--font-code)', color: 'var(--text-primary)' }}>
              {data[hoverIndex].toLocaleString('id-ID')} {t('jiwa')}
            </b>
            <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
              {hoverIndex === last ? t('terkini') : `${last - hoverIndex} ${t('frame lalu')}`}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

export function CrowdCountingPage() {
  const { pushToast, notify, offline, t } = useApp();
  const [source, setSource] = useState<VideoSourceKind>('upload');
  const [udpUrl, setUdpUrl] = useState('udp://@244.10.10.10:15004');
  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  /* Sesi UDP sudah diminta berhenti, menunggu ringkasan dari backend. */
  const [stopping, setStopping] = useState(false);
  /* Berkas .ts sedang dikonversi ke MP4 di backend supaya bisa dipratinjau
     — sama seperti VideoDetectionPage. */
  const [previewLoading, setPreviewLoading] = useState(false);
  /* Seluruh frame density-map yang sudah diterima sejauh ini — linimasa
     sesi, dibatasi CROWD_FRAME_BUFFER frame terbaru (lihat komentar pada
     CapturedCrowdFrame). */
  const [frames, setFrames] = useState<CapturedCrowdFrame[]>([]);
  /* Indeks frame yang sedang ditampilkan. Mengikuti frame terbaru secara
     otomatis selama liveEdge true (posisi "siaran langsung"); begitu
     operator menggeser linimasa secara manual, liveEdge dimatikan supaya
     tampilan tidak "ditarik paksa" kembali ke ujung. */
  const [playIndex, setPlayIndex] = useState(0);
  const [liveEdge, setLiveEdge] = useState(true);
  /* Putar-ulang otomatis lewat frame yang sudah direkam — hanya berlaku
     setelah sesi selesai. */
  const [replaying, setReplaying] = useState(false);
  const [count, setCount] = useState(0);
  const [peak, setPeak] = useState(0);
  /* Jumlah frame yang sudah diproses backend — angka akumulasi ini
     berbeda dari panjang array `frames`, yang dibatasi buffer. */
  const [frameCount, setFrameCount] = useState(0);
  const [threshold] = useState(500);
  const [history, setHistory] = useState<number[]>([]);
  /* Akumulasi hitungan seluruh frame sejak sesi dimulai — dasar Rata-rata.
     `history` tidak bisa dipakai karena hanya menyimpan 40 frame terakhir. */
  const [countTotal, setCountTotal] = useState({ sum: 0, frames: 0 });
  const [jobResult, setJobResult] = useState<CrowdSessionResult | null>(null);
  const [saving, setSaving] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const startedAtRef = useRef<number | null>(null);
  const stopTimerRef = useRef<number | null>(null);
  const isUdp = source === 'udp';

  useNavGuard(
    starting || running,
    t('Sesi crowd counting sedang berjalan. Meninggalkan halaman ini akan memutus sesi dan hasil yang belum disimpan akan hilang.'),
  );

  const finished = !running && Boolean(jobResult);
  const currentIndex = liveEdge && running ? frames.length - 1 : playIndex;
  const currentFrame = frames[currentIndex];
  /* Jumlah jiwa yang ditampilkan di badge/Statistik Sesi harus mengikuti
     frame yang sedang dilihat lewat scrubber, bukan selalu angka live
     terbaru — kalau tidak, angkanya akan "diam" di nilai lama begitu
     operator menggeser linimasa menjauh dari live edge. */
  const displayCount = currentFrame?.count ?? count;

  /* Putar-ulang otomatis: majukan playIndex mengikuti jarak waktu ASLI
     antar-frame (field `t`), bukan interval tetap — sama seperti
     VideoDetectionPage (lihat catatan lengkap di sana). Sebelumnya
     window.setInterval(..., 130) membuat playback ~4x lebih lambat dari
     video asli dan mengabaikan jarak antar-frame yang sesungguhnya.
     `frames` aman dibaca langsung dari closure di sini (bukan lewat ref)
     karena replay cuma berjalan setelah sesi selesai, saat frames sudah
     berhenti bertambah. */
  useEffect(() => {
    if (!replaying) return;

    let cancelled = false;
    let idx = playIndex;
    let timeoutId: number | undefined;

    const step = () => {
      const nextIdx = idx + 1;

      if (nextIdx >= frames.length) {
        setReplaying(false);
        return;
      }

      const delay = Math.max(16, (frames[nextIdx]?.t ?? 0) - (frames[idx]?.t ?? 0));

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        idx = nextIdx;
        setPlayIndex(idx);
        step();
      }, delay);
    };

    step();

    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [replaying, frames]);

  /* Sama seperti ImageDetectionPage/VideoDetectionPage — analisis harus
     dikaitkan ke satu flight mission (yang mission_status.name "Flight"
     atau "Done"), dan flight-information dimuat sekalian untuk resolusi
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

  /* Dibulatkan ke atas, sama seperti average_count di ringkasan backend.
     Begitu sesi selesai, angka backend dipakai langsung supaya persis sama
     dengan yang tertulis di toast penyelesaian. */
  const average = jobResult?.summary?.average_count
    ?? (countTotal.frames ? Math.ceil(countTotal.sum / countTotal.frames) : 0);
  const overThreshold = displayCount > threshold;

  const clearStopTimer = () => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const closeSocket = () => {
    clearStopTimer();
    wsRef.current?.close();
    wsRef.current = null;
    setRunning(false);
    setStopping(false);
  };

  /* Socket ditutup otomatis kalau operator berpindah halaman di
     tengah-tengah sesi berjalan — pada sesi UDP, backend menganggap socket
     yang putus sebagai permintaan berhenti. */
  useEffect(() => () => {
    wsRef.current?.close();
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
  }, []);

  const openSocket = (jobId: string) => {
    const socket = new WebSocket(`${WS_BASE}/crowd/ws/${jobId}`);
    wsRef.current = socket;
    startedAtRef.current = Date.now();

    socket.onopen = () => setRunning(true);

    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as CrowdVideoFrameMessage;

        if (data.error) {
          pushToast({ tone: 'error', title: t('Sesi crowd counting gagal'), detail: data.error });
          notify({
            title: t('Sesi crowd counting gagal'),
            detail: data.error,
            severity: 'peringatan',
            category: 'Ambang Batas',
            source: 'Crowd Counting',
            page: 'crowd',
            silent: true,
          });
          closeSocket();
          return;
        }

        if (data.frame) {
          const next = data.count ?? 0;
          const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
          setFrames(prev => {
            const appended = [...prev, { image: `data:image/jpeg;base64,${data.frame}`, count: next, t: elapsed }];
            return appended.length > CROWD_FRAME_BUFFER ? appended.slice(-CROWD_FRAME_BUFFER) : appended;
          });
          setCount(next);
          setPeak(p => Math.max(p, next));
          setFrameCount(f => (data.frame_number != null ? data.frame_number + 1 : f + 1));
          setHistory(h => [...h.slice(-39), next]);
          setCountTotal(c => ({ sum: c.sum + next, frames: c.frames + 1 }));
        }

        /* Sesi selesai — backend menyertakan medan penyelesaian di pesan
           terakhir, jadi digabung apa adanya begitu muncul. */
        if (data.finished) {
          setJobResult({
            temp_path: data.temp_path,
            processing_type: data.processing_type,
            preview_url: data.preview_url,
            processing_time: data.processing_time,
            summary: data.summary,
          });
          const summaryDetail = data.summary
            ? `Puncak ${data.summary.max_count.toLocaleString('id-ID')} jiwa · rata-rata ${data.summary.average_count.toLocaleString('id-ID')} jiwa.`
            : undefined;
          /* Sesi live berakhir karena operator menekan Hentikan, atau
             otomatis karena sumber UDP diam terlalu lama. */
          const sourceLost = data.live && data.reason === 'source_lost';
          const title = sourceLost
            ? t('Sumber UDP terputus')
            : data.live ? t('Sesi live dihentikan') : t('Sesi crowd counting selesai');
          const detail = sourceLost
            ? [t('Tidak ada frame baru dari sumber — sesi diakhiri otomatis.'), summaryDetail].filter(Boolean).join(' ')
            : summaryDetail;
          pushToast({ tone: sourceLost ? 'warning' : 'success', title, detail });
          notify({
            title,
            detail: detail ?? title,
            severity: sourceLost ? 'peringatan' : 'informasi',
            category: 'Ambang Batas',
            source: 'Crowd Counting',
            page: 'crowd',
            silent: true,
          });
          /* Backend masih melepas pembaca stream setelah mengirim ringkasan
             (bisa beberapa detik kalau sumber diam) — socket ditutup dari
             sini supaya tampilan langsung berpindah ke "Sesi Selesai". */
          if (data.live) closeSocket();
        }
      } catch {
        /* pesan bukan JSON — diabaikan */
      }
    };

    socket.onerror = () => {
      pushToast({ tone: 'error', title: t('Koneksi crowd counting terputus'), detail: t('WebSocket ke server crowd counting gagal.') });
      notify({
        title: t('Koneksi crowd counting terputus'),
        detail: t('WebSocket ke server crowd counting gagal.'),
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
    };

    socket.onclose = () => {
      clearStopTimer();
      setRunning(false);
      setStopping(false);
    };
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(mp4|avi|mov|mkv|ts)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: t('Format tidak didukung'), detail: t('Gunakan berkas MP4, AVI, MOV, MKV, atau TS.') });
      notify({
        title: t('Format tidak didukung'),
        detail: t('Gunakan berkas MP4, AVI, MOV, MKV, atau TS.'),
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
      return;
    }

    const accept = (url: string) => {
      closeSocket();
      setFile({ name: f.name, url, raw: f });
      setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false);
      setCount(0); setPeak(0); setFrameCount(0); setHistory([]); setCountTotal({ sum: 0, frames: 0 }); setJobResult(null);
    };

    const rejectResolution = (width: number, height: number) => {
      const detail = t(
        `Resolusi video ${width}x${height} melebihi batas maksimum ${MAX_VIDEO_WIDTH}x${MAX_VIDEO_HEIGHT} (Full HD). Gunakan video Full HD ke bawah.`,
      );
      pushToast({ tone: 'error', title: t('Resolusi video terlalu tinggi'), detail });
      notify({
        title: t('Resolusi video terlalu tinggi'),
        detail,
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
    };

    // Browser tidak bisa memutar MPEG-TS mentah lewat <video> sama sekali
    // — backend diminta remux cepat ke MP4 dulu (lihat getCrowdPreview,
    // sama seperti VideoDetectionPage.pick()). Endpoint yang sama juga
    // menjalankan check_video_resolution di server, jadi .ts di atas Full
    // HD ditolak di sini juga.
    if (/\.ts$/i.test(f.name)) {
      setPreviewLoading(true);
      api.getCrowdPreview(f)
        .then(res => {
          const url = res.preview_url.startsWith('http')
            ? res.preview_url
            : `${API_BASE_MEDIA}${res.preview_url}`;
          accept(url);
        })
        .catch(err => {
          const detail = errorMessage(err, t('Tidak bisa membuat pratinjau video ini.'));
          pushToast({ tone: 'error', title: t('Gagal memuat video'), detail });
          notify({
            title: t('Gagal memuat video'),
            detail,
            severity: 'peringatan',
            category: 'Ambang Batas',
            source: 'Crowd Counting',
            page: 'crowd',
            silent: true,
          });
        })
        .finally(() => setPreviewLoading(false));
      return;
    }

    const probeUrl = URL.createObjectURL(f);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = probe;
      URL.revokeObjectURL(probeUrl);
      if (videoWidth > MAX_VIDEO_WIDTH || videoHeight > MAX_VIDEO_HEIGHT) {
        rejectResolution(videoWidth, videoHeight);
        return;
      }
      accept(URL.createObjectURL(f));
    };
    probe.onerror = () => {
      URL.revokeObjectURL(probeUrl);
      accept(URL.createObjectURL(f));
    };
    probe.src = probeUrl;
  };

  /* Berganti sumber membuang sesi sebelumnya — linimasa & statistik milik
     sumber lama tidak relevan untuk sumber yang baru dipilih. */
  const changeSource = (next: VideoSourceKind) => {
    if (next === source) return;
    closeSocket();
    setSource(next);
    setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false);
    setCount(0); setPeak(0); setFrameCount(0); setHistory([]); setCountTotal({ sum: 0, frames: 0 }); setJobResult(null);
  };

  const start = async () => {
    if (starting || running) return;
    if (!missionId) {
      pushToast({ tone: 'error', title: t('Pilih flight mission dahulu'), detail: t('Flight mission wajib dipilih sebelum menjalankan analisis.') });
      notify({
        title: t('Pilih flight mission dahulu'),
        detail: t('Flight mission wajib dipilih sebelum menjalankan analisis.'),
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
      return;
    }
    if (source === 'udp' && !udpUrl.trim()) {
      pushToast({ tone: 'error', title: t('Isi alamat UDP dahulu'), detail: t('Masukkan URL sumber UDP, mis. udp://@244.10.10.10:15004.') });
      notify({
        title: t('Isi alamat UDP dahulu'),
        detail: t('Masukkan URL sumber UDP, mis. udp://@244.10.10.10:15004.'),
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
      return;
    }
    if (source === 'upload' && !file) {
      pushToast({ tone: 'error', title: t('Unggah berkas video dahulu'), detail: t('Pilih atau seret berkas video sebelum menjalankan analisis.') });
      notify({
        title: t('Unggah berkas video dahulu'),
        detail: t('Pilih atau seret berkas video sebelum menjalankan analisis.'),
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
      return;
    }
    setStarting(true);
    setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false);
    setCount(0); setPeak(0); setFrameCount(0); setHistory([]); setCountTotal({ sum: 0, frames: 0 }); setJobResult(null);
    try {
      /* Sumber upload tanpa berkas sudah ditolak di atas, jadi cabang kedua
         hanya tercapai untuk sumber UDP. */
      const job = source === 'upload' && file
        ? await api.detectCrowdVideo(file.raw)
        : await api.startCrowdStream(udpUrl.trim());
      openSocket(job.job_id);
      const startedDetail = source === 'udp'
        ? `${t('Menghubungkan ke')} ${udpUrl.trim()}.`
        : t('Model DM-Count dimuat — inferensi berjalan.');
      pushToast({ tone: 'info', title: t('Sesi crowd counting dimulai'), detail: startedDetail });
      notify({
        title: t('Sesi crowd counting dimulai'),
        detail: startedDetail,
        severity: 'informasi',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
    } catch (err) {
      const detail = errorMessage(err, t('Tidak bisa terhubung ke server. Coba lagi.'));
      pushToast({ tone: 'error', title: t('Gagal memulai analisis'), detail });
      notify({
        title: t('Gagal memulai analisis'),
        detail,
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    const socket = wsRef.current;
    /* Kedua jenis sesi diakhiri lewat pesan ke backend, bukan dengan
       langsung memutus socket dari sini — backend (predict_video_stream /
       predict_live_stream) baru berhenti membaca frame berikutnya begitu
       menerima ini, menuntaskan ffmpeg yang sedang berjalan, lalu server
       sendiri yang menutup socket (memicu socket.onclose di bawah).
       Toast konfirmasi dikirim dari handler pesan `finished` (sudah
       menangani baik sesi live maupun berkas), bukan di sini — sebelumnya
       sesi berkas langsung menampilkan toast "Sesi dihentikan" seketika
       walau backend-nya sendiri belum benar-benar berhenti memproses
       (bug yang sama seperti di VideoDetectionPage — lihat catatan di
       sana). */
    if (socket?.readyState === WebSocket.OPEN) {
      if (stopping) return;
      socket.send(JSON.stringify({ action: 'stop' }));
      setStopping(true);
      stopTimerRef.current = window.setTimeout(closeSocket, LIVE_STOP_TIMEOUT_MS);
      return;
    }
    closeSocket();
  };

  const saveMedia = async () => {
    if (!jobResult?.temp_path || !jobResult?.processing_type || !missionId) return;
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
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
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
        title: t('Video hasil crowd counting disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; video asli tetap utuh.'),
      });
      notify({
        title: t('Video hasil crowd counting disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; video asli tetap utuh.'),
        severity: 'informasi',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
      closeSocket();
      setFile(null); setFrames([]); setPlayIndex(0); setLiveEdge(true); setReplaying(false);
      setCount(0); setPeak(0); setFrameCount(0); setHistory([]); setCountTotal({ sum: 0, frames: 0 }); setJobResult(null); setMissionId('');
    } catch {
      pushToast({ tone: 'error', title: t('Gagal menyimpan media'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
      notify({
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Ambang Batas',
        source: 'Crowd Counting',
        page: 'crowd',
        silent: true,
      });
    } finally {
      setSaving(false);
    }
  };

  const canSave = Boolean(jobResult?.temp_path && jobResult?.processing_type);

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
              <button className="btn btn-secondary" disabled={!canSave} onClick={saveMedia}>
                {saving
                  ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan…')}</>
                  : <><Save size={15} /> {t('Simpan Media')}</>}
              </button>
              {running ? (
                <button className="btn btn-danger" onClick={stop} disabled={stopping}>
                  {stopping
                    ? <><Loader2 size={15} className="spin" /> {t('Menghentikan…')}</>
                    : <><Square size={15} /> {t('Hentikan')}</>}
                </button>
              ) : (
                <button className="btn btn-primary sheen" onClick={start} disabled={starting || offline}>
                  {starting
                    ? <><Loader2 size={15} className="spin" /> {t('Memulai…')}</>
                    : <><Play size={15} /> {t('Mulai Analisis')}</>}
                </button>
              )}
            </>
          }
        />

        <input
          ref={inputRef}
          type="file"
          accept=".mp4,.avi,.mov,.mkv,.ts"
          hidden
          onChange={e => { pick(e.target.files?.[0]); if (inputRef.current) inputRef.current.value = ''; }}
        />

        <GlassCard tilt={false} style={{ marginBottom: 14 }}>
          <SectionHead icon={<UsersRound size={15} />} title={t('Flight Mission')} sub={t('Wajib dipilih sebelum analisis dapat dijalankan')} />
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

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 433px', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard tilt={false}>
              <SectionHead
                icon={<Video size={15} />}
                title={finished ? t('Sesi Selesai') : t('Video Zona')}
                sub={
                  running ? (isUdp ? `${t('Umpan langsung dari')} ${udpUrl.trim()}` : t('Aliran langsung dari sesi berjalan'))
                    : finished ? (isUdp ? t('Sesi live selesai — hasil sesi UDP tidak disimpan') : t('Sesi selesai — simpan hasil atau mulai sesi baru'))
                      : isUdp ? udpUrl.trim()
                        : file ? file.name : t('Rekaman gimbal Epsilon dengan keluaran density map')
                }
                right={
                  running
                    ? <span className={`badge ${overThreshold ? 'badge-danger' : 'badge-success'}`}>{`${displayCount.toLocaleString('id-ID')} Orang`}</span>
                    : finished ? <span className="badge badge-info">{t('SELESAI')}</span> : undefined
                }
              />
              {offline ? (
                <OfflineNotice
                  title={t('Modul ini memerlukan umpan langsung dari platform.')}
                  detail={t('Daya platform sedang diputus. Pulihkan daya melalui prosedur reset teknisi untuk melanjutkan.')}
                  last={[
                    [t('Puncak'), peak ? peak.toLocaleString('id-ID') : '—'],
                    [t('Frame Diproses'), frameCount ? frameCount.toLocaleString('id-ID') : '—'],
                  ]}
                />
              ) : currentFrame ? (
                <div className="cmp" style={{ aspectRatio: '16 / 9' }}>
                  <div className="cmp-layer">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={currentFrame.image} alt="Density map crowd counting" />
                  </div>
                </div>
              ) : isUdp && (starting || running) ? (
                <EmptyState
                  icon={<Loader2 size={22} className="spin" />}
                  title={t('Menunggu stream UDP…')}
                  description={`${t('Backend sedang membuka')} ${udpUrl.trim()}. ${t('Frame pertama muncul begitu paket video diterima.')}`}
                />
              ) : isUdp ? (
                <EmptyState
                  icon={<Radio size={22} />}
                  title={t('Sumber UDP belum dijalankan')}
                  description={t('Isi alamat UDP di panel kanan, lalu tekan Mulai Analisis.')}
                />
              ) : previewLoading ? (
                <EmptyState
                  icon={<Loader2 size={22} className="spin" />}
                  title={t('Menyiapkan pratinjau…')}
                  description={t('Mengonversi video ke format yang bisa diputar browser.')}
                />
              ) : file ? (
                <VideoPlayer src={file.url} label={file.name} sublabel={t('Menunggu analisis dimulai')} aspect="16 / 9" />
              ) : (
                <EmptyState
                  icon={<UsersRound size={22} />}
                  title={t('Belum ada video dimuat')}
                  description={t('Pilih sumber video di panel kanan, lalu jalankan analisis untuk melihat umpan langsung.')}
                />
              )}

              {!offline && frames.length > 0 && (
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
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', minWidth: 64 }}>
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
                    {running && !liveEdge && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setLiveEdge(true); setReplaying(false); }}>
                        {t('Ke Live')}
                      </button>
                    )}
                  </div>
                </div>
              )}
              {overThreshold && running && (
                <p className="alert-line danger">
                  Kepadatan melewati ambang {threshold.toLocaleString('id-ID')} jiwa — peringatan
                  dikirim ke modul Smart Notification.
                </p>
              )}
            </GlassCard>


          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Radio size={15} />} title={t('Sumber Video')} />
              <div className="form-group">
                <label className="form-label" htmlFor="crowd-source">{t('Jenis Sumber')}</label>
                <select
                  id="crowd-source"
                  className="form-input"
                  value={source}
                  onChange={e => changeSource(e.target.value as VideoSourceKind)}
                  disabled={starting || running}
                >
                  <option value="upload">{t('Unggah Berkas')}</option>
                  <option value="udp">{t('Stream UDP')}</option>
                </select>
              </div>

              {source === 'udp' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="crowd-udp">{t('Alamat UDP')}</label>
                  <input
                    id="crowd-udp"
                    className="form-input font-mono"
                    value={udpUrl}
                    onChange={e => setUdpUrl(e.target.value)}
                    placeholder="udp://@244.10.10.10:15004"
                    spellCheck={false}
                    disabled={starting || running}
                  />
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
                    <span className="uploader-sub">{t('MP4, AVI, MOV, TS, atau MKV')}</span>
                  </span>
                  <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
                </div>
              )}
            </GlassCard>
            <GlassCard tilt={false}>
              <SectionHead icon={<Activity size={15} />} title={t('Statistik Sesi')} sub={t('Diperbarui tiap frame diproses')} />
              <MetricRow cols={3}>
                <Metric label={t('Saat Ini')} value={running || finished ? displayCount.toLocaleString('id-ID') : '—'} color="var(--accent-cyan)" foot={t('Orang')} />
                <Metric label={t('Rata-rata')} value={running || finished ? average.toLocaleString('id-ID') : '—'} color="var(--accent-primary)" foot={t('sepanjang sesi')} />
                <Metric label={t('Puncak')} value={running || finished ? peak.toLocaleString('id-ID') : '—'} color="var(--accent-tertiary)" foot={t('tertinggi')} />
                {/* Tidak ada sumber data GPU/latensi asli dari backend saat
                    ini — disembunyikan sampai backend melaporkannya. */}
                {/* <Metric label={t('Utilisasi GPU')} value={running ? '78%' : '—'} color="var(--accent-emerald)" foot={t('RTX 4090 Laptop')} /> */}
                {/* <Metric label={t('Waktu Inferensi')} value={running ? '23 ms' : '—'} color="var(--accent-amber)" foot={t('target ≤ 35 ms')} /> */}
              </MetricRow>
            </GlassCard>

            <GlassCard tilt={false}>
              <SectionHead icon={<Activity size={15} />} title={t('Tren Kepadatan')} sub={t('40 pembacaan terakhir')} />
              {history.length > 2 ? (
                <DensityTrendChart data={history} color={overThreshold ? 'var(--danger-400)' : 'var(--accent-cyan)'} />
              ) : (
                <EmptyState
                  icon={<Activity size={22} />}
                  title={t('Belum ada data tren')}
                  description={t('Mulai analisis untuk merekam perubahan kepadatan sepanjang sesi pengawasan.')}
                />
              )}
            </GlassCard>

            {/*        <GlassCard>
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
 */}
            {/*             <GlassCard>
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
            </GlassCard> */}
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
  const { pushToast, notify, t } = useApp();
  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [detectResult, setDetectResult] = useState<DetectImageResult | null>(null);
  const [drag, setDrag] = useState(false);
  const [confidence, setConfidence] = useState(10);
  const [analyzing, setAnalyzing] = useState(false);
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useNavGuard(
    analyzing,
    t('Deteksi citra sedang berjalan. Meninggalkan halaman ini akan membatalkan proses dan hasil yang belum disimpan akan hilang.'),
  );

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  /* Sama seperti ImageEnhancementPage — deteksi harus dikaitkan ke satu
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

  /* Hasil Deteksi disaring lewat ambang kepercayaan — confidence dari API
     berskala 0–1, jadi dibandingkan sebagai persen. */
  const visible = useMemo(
    () => (detectResult?.objects ?? []).filter(o => o.confidence * 100 >= confidence),
    [detectResult, confidence],
  );

  /* Rincian Deteksi dikelompokkan per kelas objek dan diurutkan
     berdasarkan jumlah kemunculannya — bukan lagi daftar per-objek
     berdasarkan confidence (pola sama seperti classCounts di
     VideoDetectionPage). */
  const classCounts = useMemo(() => {
    const counts = new globalThis.Map<string, { count: number; color?: string }>();
    for (const o of visible) {
      const entry = counts.get(o.class);
      if (entry) entry.count += 1;
      else counts.set(o.class, { count: 1, color: o.color });
    }
    return Array.from(counts, ([cls, v]) => ({ cls, count: v.count, color: v.color }))
      .sort((a, b) => b.count - a.count);
  }, [visible]);

  const previewUrl = detectResult
    ? (detectResult.preview_url.startsWith('http') ? detectResult.preview_url : `${API_BASE_MEDIA}${detectResult.preview_url}`)
    : '';

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(jpe?g|png|tiff?)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: 'Format tidak didukung', detail: 'Gunakan berkas JPG, PNG, atau TIFF.' });
      notify({
        title: 'Format tidak didukung',
        detail: 'Gunakan berkas JPG, PNG, atau TIFF.',
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
      });
      return;
    }

    const probeUrl = URL.createObjectURL(f);
    const probe = new Image();
    probe.onload = () => {
      const { naturalWidth, naturalHeight } = probe;
      if (naturalWidth > MAX_VIDEO_WIDTH || naturalHeight > MAX_VIDEO_HEIGHT) {
        URL.revokeObjectURL(probeUrl);
        const detail = t(
          `Resolusi gambar ${naturalWidth}x${naturalHeight} melebihi batas maksimum ${MAX_VIDEO_WIDTH}x${MAX_VIDEO_HEIGHT} (Full HD). Gunakan gambar Full HD ke bawah.`,
        );
        pushToast({ tone: 'error', title: t('Resolusi gambar terlalu tinggi'), detail });
        notify({
          title: t('Resolusi gambar terlalu tinggi'),
          detail,
          severity: 'peringatan',
          category: 'Deteksi Objek',
          source: 'Imaging Analytic',
          page: 'detection-image',
          silent: true,
        });
        return;
      }
      setFile({ name: f.name, url: probeUrl, raw: f });
      /* Upload citra baru membatalkan hasil deteksi sebelumnya. */
      setDetectResult(null);
    };
    probe.onerror = () => {
      URL.revokeObjectURL(probeUrl);
      // Gagal dibaca browser — biarkan lolos, backend tetap jadi penjaga
      // akhir saat "Jalankan Deteksi" ditekan (check_image_resolution di
      // api/detection.py).
      setFile({ name: f.name, url: URL.createObjectURL(f), raw: f });
      setDetectResult(null);
    };
    probe.src = probeUrl;
  };

  const analyze = async () => {
    if (analyzing) return;
    /* Tombol tetap bisa diklik walau syarat belum lengkap — tanpa ini,
       atribut disabled bisu (tidak ada gaya CSS pembeda) membuat klik
       terlihat tidak berefek sama sekali. */
    if (!missionId) {
      pushToast({ tone: 'error', title: t('Pilih flight mission dahulu'), detail: t('Flight mission wajib dipilih sebelum menjalankan deteksi.') });
      notify({
        title: t('Pilih flight mission dahulu'),
        detail: t('Flight mission wajib dipilih sebelum menjalankan deteksi.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
      });
      return;
    }
    if (!file) {
      pushToast({ tone: 'error', title: t('Unggah citra dahulu'), detail: t('Pilih atau seret berkas citra sebelum menjalankan deteksi.') });
      notify({
        title: t('Unggah citra dahulu'),
        detail: t('Pilih atau seret berkas citra sebelum menjalankan deteksi.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
      });
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
      notify({
        title: t('Deteksi selesai'),
        detail: `${result.objects.length} objek ditemukan · ${result.processing_time} ms.`,
        severity: 'informasi',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
      });
    } catch (err) {
      const detail = errorMessage(err, t('Tidak bisa terhubung ke server. Coba lagi.'));
      pushToast({
        tone: 'error',
        title: t('Gagal menjalankan deteksi'),
        detail,
      });
      notify({
        title: t('Gagal menjalankan deteksi'),
        detail,
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
      });
    } finally {
      setAnalyzing(false);
    }
  };

  const saveMedia = async () => {
    if (!detectResult || !missionId) return;
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
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
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
      notify({
        title: t('Citra hasil deteksi disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; citra asli tetap utuh.'),
        severity: 'informasi',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
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
      notify({
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Imaging Analytic',
        page: 'detection-image',
        silent: true,
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
              <button className="btn btn-secondary" disabled={!detectResult} onClick={saveMedia}>
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



              {classCounts.length === 0 ? (
                <EmptyState
                  icon={<Crosshair size={22} />}
                  title={t('Tidak ada objek di atas ambang')}
                  description={t('Jalankan deteksi, atau turunkan ambang kepercayaan untuk menampilkan hasil berkeyakinan lebih rendah.')}
                />
              ) : (
                <div className="table-container">
                  <table style={{ fontSize: '10px' }}>
                    <thead>
                      <tr>
                        <th>{t('Kelas Objek')}</th>
                        <th>{t('Jumlah')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {classCounts.map(({ cls, count, color: classColor }) => {
                        const pct = Math.round((count / classCounts[0].count) * 100);
                        const color = classColor || (cls === 'person' ? 'var(--accent-emerald)' : 'var(--accent-primary)');
                        return (
                          <tr key={cls}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14 }}>
                                {cls === 'person' ? <PersonStanding size={13} /> : <Car size={13} />}
                                {capitalize(cls)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden', minWidth: 90 }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                                </div>
                                <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color }}>
                                  {count}
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
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* Batas linimasa sesi live (UDP): sesi tanpa ujung akan menumpuk frame di
   memori peramban tanpa batas. Sesi berkas tidak dibatasi supaya seluruh
   video tetap bisa diputar ulang. */
const DETECT_LIVE_FRAME_BUFFER = 400;

/* Batas resolusi unggahan — video di atas Full HD (mis. drone 4K) terbukti
   jauh lebih berat diproses real-time. Nilai ini HARUS sama dengan
   MAX_VIDEO_WIDTH/HEIGHT di Backend/api/detection.py, yang jadi penjaga
   utama (browser tidak selalu bisa membaca metadata video, khususnya
   .ts — lihat pengecekan isTs di pick() — jadi cek di sini murni supaya
   pengguna dapat penolakan cepat sebelum sempat mengunggah, bukan
   pengganti validasi backend). */
const MAX_VIDEO_WIDTH = 1920;
const MAX_VIDEO_HEIGHT = 1080;

export function VideoDetectionPage() {
  const { pushToast, notify, t } = useApp();
  const [source, setSource] = useState<VideoSourceKind>('upload');
  const [udpUrl, setUdpUrl] = useState('udp://@244.10.10.10:15004');
  const [file, setFile] = useState<{ name: string; url: string; raw: File } | null>(null);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [missionsLoading, setMissionsLoading] = useState(true);
  const [missionId, setMissionId] = useState('');
  const [flightInfoRecords, setFlightInfoRecords] = useState<FlightInformationRecord[]>([]);

  const [starting, setStarting] = useState(false);
  const [running, setRunning] = useState(false);
  /* Sesi UDP sudah diminta berhenti, menunggu pesan `finished` backend. */
  const [stopping, setStopping] = useState(false);
  /* Berkas .ts sedang dikonversi ke MP4 di backend supaya bisa dipratinjau
     (lihat pick()) — browser tidak bisa memutar MPEG-TS mentah sama
     sekali. */
  const [previewLoading, setPreviewLoading] = useState(false);
  /* Seluruh frame yang sudah diterima sejauh ini — linimasa proses.

     Disimpan di ref (bukan state) supaya frame baru cukup di-push (O(1))
     tanpa menyalin seluruh array setiap kali — sesi berkas sengaja tidak
     dibatasi panjangnya (lihat DETECT_LIVE_FRAME_BUFFER, hanya berlaku utk
     live) supaya video panjang tetap bisa diputar ulang penuh, jadi kalau
     disimpan lewat setState([...prev, x]) biaya penyalinannya tumbuh makin
     berat seiring job berjalan dan bikin umpan tampak melambat/patah-patah.
     `frameTick` hanya pemicu render ulang, nilainya sendiri tidak dipakai. */
  const framesRef = useRef<CapturedFrame[]>([]);
  const [, setFrameTick] = useState(0);
  const resetFrames = () => {
    framesRef.current = [];
    setFrameTick(v => v + 1);
  };
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
  const stopTimerRef = useRef<number | null>(null);
  const isUdp = source === 'udp';

  useNavGuard(
    starting || running,
    t('Sesi deteksi video sedang berjalan. Meninggalkan halaman ini akan memutus sesi dan hasil yang belum disimpan akan hilang.'),
  );

  const currentIndex = liveEdge && running ? framesRef.current.length - 1 : playIndex;
  const currentFrame = framesRef.current[currentIndex];
  const finished = !running && framesRef.current.length > 0;

  /* Putar-ulang otomatis: majukan playIndex mengikuti jarak waktu ASLI
     antar-frame (field `t`, milidetik sejak sesi mulai), bukan interval
     tetap. Sebelumnya ini window.setInterval(..., 130) — tiap frame
     ditampilkan 130ms rata kanan-kiri, padahal frame aslinya terekam
     ~33ms sekali (30fps). Hasilnya playback jadi ~4x lebih lambat dari
     video asli dan tidak mengikuti jarak antar-frame yang sesungguhnya
     (yang sedikit tidak rata karena jitter jaringan/YOLO) — makanya
     "putar ulang" terasa tidak semulus video mentahnya walau semua frame
     sudah lengkap diterima. setTimeout dijadwalkan ulang tiap langkah
     (bukan setInterval tetap) supaya delay bisa beda-beda per pasangan
     frame sesuai `t` yang sungguh tercatat. */
  useEffect(() => {
    if (!replaying) return;

    let cancelled = false;
    let idx = playIndex;
    let timeoutId: number | undefined;

    const step = () => {
      const frames = framesRef.current;
      const nextIdx = idx + 1;

      if (nextIdx >= frames.length) {
        setReplaying(false);
        return;
      }

      const delay = Math.max(16, (frames[nextIdx]?.t ?? 0) - (frames[idx]?.t ?? 0));

      timeoutId = window.setTimeout(() => {
        if (cancelled) return;
        idx = nextIdx;
        setPlayIndex(idx);
        step();
      }, delay);
    };

    step();

    return () => {
      cancelled = true;
      if (timeoutId != null) window.clearTimeout(timeoutId);
    };
  }, [replaying]);

  /* Sama seperti ImageEnhancementPage/ImageDetectionPage — deteksi harus
     dikaitkan ke satu flight mission (yang mission_status.name "Flight"
     atau "Done"), dan flight-information dimuat sekalian untuk resolusi
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

  const visible = useMemo(
    () => (currentFrame?.objects ?? []).filter(o => o.confidence * 100 >= confidence),
    [currentFrame, confidence],
  );

  /* Hasil Deteksi dikelompokkan per kelas objek dan diurutkan berdasarkan
     jumlah kemunculannya pada frame ini — bukan lagi daftar per-objek
     yang diurutkan/ditampilkan berdasarkan confidence. */
  const classCounts = useMemo(() => {
    /* Warna diambil dari objek pertama tiap kelas — backend menetapkan
       satu warna tetap per kelas (mis. person → #00FF00), jadi objek
       manapun dalam kelas yang sama sudah cukup mewakilinya. */
    const counts = new globalThis.Map<string, { count: number; color?: string }>();
    for (const o of visible) {
      const entry = counts.get(o.class);
      if (entry) entry.count += 1;
      else counts.set(o.class, { count: 1, color: o.color });
    }
    return Array.from(counts, ([cls, v]) => ({ cls, count: v.count, color: v.color }))
      .sort((a, b) => b.count - a.count);
  }, [visible]);

  const clearStopTimer = () => {
    if (stopTimerRef.current != null) {
      window.clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
  };

  const closeSocket = () => {
    clearStopTimer();
    wsRef.current?.close();
    wsRef.current = null;
    setRunning(false);
    setStopping(false);
  };

  /* Socket ditutup otomatis kalau operator berpindah halaman di
     tengah-tengah job berjalan — pada sesi UDP, backend menganggap socket
     yang putus sebagai permintaan berhenti. */
  useEffect(() => () => {
    wsRef.current?.close();
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
  }, []);

  const openSocket = (jobId: string) => {
    const socket = new WebSocket(`${WS_BASE}/detect/ws/${jobId}`);
    wsRef.current = socket;
    startedAtRef.current = Date.now();

    socket.onopen = () => setRunning(true);

    socket.onmessage = (ev) => {
      try {
        const data = JSON.parse(ev.data) as DetectVideoFrameMessage;
        if (data.error) {
          pushToast({ tone: 'error', title: t('Sesi deteksi gagal'), detail: data.error });
          notify({
            title: t('Sesi deteksi gagal'),
            detail: data.error,
            severity: 'peringatan',
            category: 'Deteksi Objek',
            source: 'Video Analytic',
            page: 'detection-video',
            silent: true,
          });
          closeSocket();
          return;
        }
        if (data.frame) {
          const elapsed = startedAtRef.current ? Date.now() - startedAtRef.current : 0;
          framesRef.current.push({ image: `data:image/jpeg;base64,${data.frame}`, objects: data.objects ?? [], t: elapsed });
          if (data.live && framesRef.current.length > DETECT_LIVE_FRAME_BUFFER) {
            framesRef.current.splice(0, framesRef.current.length - DETECT_LIVE_FRAME_BUFFER);
          }
          setFrameTick(v => v + 1);
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
        /* Sesi live berakhir karena operator menekan Hentikan, atau otomatis
           karena sumber UDP diam terlalu lama. Socket ditutup dari sini:
           backend masih melepas pembaca stream setelah mengirim pesan ini. */
        if (data.finished && data.live) {
          const sourceLost = data.reason === 'source_lost';
          const title = sourceLost ? t('Sumber UDP terputus') : t('Sesi live dihentikan');
          const detail = sourceLost ? t('Tidak ada frame baru dari sumber — sesi diakhiri otomatis.') : undefined;
          pushToast({ tone: sourceLost ? 'warning' : 'success', title, detail });
          notify({
            title,
            detail: detail ?? title,
            severity: sourceLost ? 'peringatan' : 'informasi',
            category: 'Deteksi Objek',
            source: 'Video Analytic',
            page: 'detection-video',
            silent: true,
          });
          closeSocket();
        }
      } catch {
        /* pesan bukan JSON — diabaikan */
      }
    };

    socket.onerror = () => {
      pushToast({ tone: 'error', title: t('Koneksi deteksi terputus'), detail: t('WebSocket ke server deteksi video gagal.') });
      notify({
        title: t('Koneksi deteksi terputus'),
        detail: t('WebSocket ke server deteksi video gagal.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
    };

    socket.onclose = () => {
      clearStopTimer();
      setRunning(false);
      setStopping(false);
    };
  };

  const pick = (f: File | undefined) => {
    if (!f) return;
    if (!/\.(mp4|avi|mov|mkv|ts)$/i.test(f.name)) {
      pushToast({ tone: 'error', title: t('Format tidak didukung'), detail: t('Gunakan berkas MP4, AVI, MOV, MKV, atau TS.') });
      notify({
        title: t('Format tidak didukung'),
        detail: t('Gunakan berkas MP4, AVI, MOV, MKV, atau TS.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
      return;
    }

    const accept = () => {
      closeSocket();
      setFile({ name: f.name, url: URL.createObjectURL(f), raw: f });
      resetFrames(); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null);
    };

    const rejectResolution = (width: number, height: number) => {
      const detail = t(
        `Resolusi video ${width}x${height} melebihi batas maksimum ${MAX_VIDEO_WIDTH}x${MAX_VIDEO_HEIGHT} (Full HD). Gunakan video Full HD ke bawah.`,
      );
      pushToast({ tone: 'error', title: t('Resolusi video terlalu tinggi'), detail });
      notify({
        title: t('Resolusi video terlalu tinggi'),
        detail,
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
    };

    // Browser tidak bisa memutar MPEG-TS mentah lewat <video> sama sekali
    // (bukan cuma tidak bisa baca metadatanya) — jadi utk .ts, backend
    // diminta remux cepat (tanpa re-encode) ke MP4 lebih dulu supaya ada
    // sesuatu yang benar-benar bisa dipratinjau. Endpoint yang sama juga
    // sudah menjalankan check_video_resolution di sisi server (lihat
    // utils/video_preview.py) — jadi kalau .ts-nya di atas Full HD,
    // panggilan ini sendiri yang menolaknya, sebelum sempat dikonversi.
    if (/\.ts$/i.test(f.name)) {
      setPreviewLoading(true);
      api.getDetectionPreview(f)
        .then(res => {
          const url = res.preview_url.startsWith('http')
            ? res.preview_url
            : `${API_BASE_MEDIA}${res.preview_url}`;
          closeSocket();
          setFile({ name: f.name, url, raw: f });
          resetFrames(); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null);
        })
        .catch(err => {
          const detail = errorMessage(err, t('Tidak bisa membuat pratinjau video ini.'));
          pushToast({ tone: 'error', title: t('Gagal memuat video'), detail });
          notify({
            title: t('Gagal memuat video'),
            detail,
            severity: 'peringatan',
            category: 'Deteksi Objek',
            source: 'Video Analytic',
            page: 'detection-video',
            silent: true,
          });
        })
        .finally(() => setPreviewLoading(false));
      return;
    }

    const probeUrl = URL.createObjectURL(f);
    const probe = document.createElement('video');
    probe.preload = 'metadata';
    probe.onloadedmetadata = () => {
      const { videoWidth, videoHeight } = probe;
      URL.revokeObjectURL(probeUrl);
      if (videoWidth > MAX_VIDEO_WIDTH || videoHeight > MAX_VIDEO_HEIGHT) {
        rejectResolution(videoWidth, videoHeight);
        return;
      }
      accept();
    };
    probe.onerror = () => {
      URL.revokeObjectURL(probeUrl);
      // Gagal dibaca browser (mis. codec tidak didukung) — biarkan lolos,
      // backend tetap jadi penjaga akhir saat deteksi dimulai.
      accept();
    };
    probe.src = probeUrl;
  };

  /* Berganti sumber membuang sesi sebelumnya — linimasa & hasil deteksi
     milik sumber lama tidak relevan untuk sumber yang baru dipilih. */
  const changeSource = (next: VideoSourceKind) => {
    if (next === source) return;
    closeSocket();
    setSource(next);
    resetFrames(); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null);
  };

  const startDetection = async () => {
    if (starting || running) return;
    if (!missionId) {
      pushToast({ tone: 'error', title: t('Pilih flight mission dahulu'), detail: t('Flight mission wajib dipilih sebelum menjalankan deteksi.') });
      notify({
        title: t('Pilih flight mission dahulu'),
        detail: t('Flight mission wajib dipilih sebelum menjalankan deteksi.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
      return;
    }
    if (source === 'udp' && !udpUrl.trim()) {
      pushToast({ tone: 'error', title: t('Isi alamat UDP dahulu'), detail: t('Masukkan URL sumber UDP, mis. udp://@244.10.10.10:15004.') });
      notify({
        title: t('Isi alamat UDP dahulu'),
        detail: t('Masukkan URL sumber UDP, mis. udp://@244.10.10.10:15004.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
      return;
    }
    if (source === 'upload' && !file) {
      pushToast({ tone: 'error', title: t('Unggah berkas video dahulu'), detail: t('Pilih atau seret berkas video sebelum menjalankan deteksi.') });
      notify({
        title: t('Unggah berkas video dahulu'),
        detail: t('Pilih atau seret berkas video sebelum menjalankan deteksi.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
      return;
    }
    setStarting(true);
    resetFrames(); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null);
    try {
      /* Sumber upload tanpa berkas sudah ditolak di atas, jadi cabang kedua
         hanya tercapai untuk sumber UDP. */
      const job = source === 'upload' && file
        ? await api.detectVideo(file.raw)
        : await api.startDetectionStream(udpUrl.trim());
      openSocket(job.job_id);
      if (source === 'udp') {
        const detail = `${t('Menghubungkan ke')} ${udpUrl.trim()}.`;
        pushToast({ tone: 'info', title: t('Sesi deteksi dimulai'), detail });
        notify({
          title: t('Sesi deteksi dimulai'),
          detail,
          severity: 'informasi',
          category: 'Deteksi Objek',
          source: 'Video Analytic',
          page: 'detection-video',
          silent: true,
        });
      }
    } catch (err) {
      const detail = errorMessage(err, t('Tidak bisa terhubung ke server. Coba lagi.'));
      pushToast({ tone: 'error', title: t('Gagal memulai deteksi'), detail });
      notify({
        title: t('Gagal memulai deteksi'),
        detail,
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
    } finally {
      setStarting(false);
    }
  };

  const stop = () => {
    const socket = wsRef.current;
    /* Kedua jenis sesi diakhiri lewat pesan ke backend, bukan dengan
       langsung memutus socket dari sini. Backend (detect_video_stream /
       detect_live_stream) baru berhenti membaca frame berikutnya begitu
       menerima ini, menuntaskan penulisan/ffmpeg yang sedang berjalan,
       lalu server sendiri yang menutup socket — itu yang memicu
       socket.onclose di bawah utk membereskan state `running`/`stopping`.
       Sebelumnya sesi berkas (non-UDP) langsung close socket dari sini
       tanpa memberi tahu backend sama sekali, jadi detect_video_stream
       tetap memproses SISA SELURUH video sampai habis walau tombol
       Hentikan sudah ditekan. */
    if (socket?.readyState === WebSocket.OPEN) {
      if (stopping) return;
      socket.send(JSON.stringify({ action: 'stop' }));
      setStopping(true);
      stopTimerRef.current = window.setTimeout(closeSocket, LIVE_STOP_TIMEOUT_MS);
      return;
    }
    closeSocket();
  };

  const saveMedia = async () => {
    if (!jobResult?.temp_path || !jobResult?.processing_type || !missionId) return;
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
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
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
      notify({
        title: t('Video hasil deteksi disimpan'),
        detail: t('Berkas baru ditambahkan ke katalog Surveillance Media; video asli tetap utuh.'),
        severity: 'informasi',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
      closeSocket();
      setFile(null); resetFrames(); setPlayIndex(0); setLiveEdge(true); setReplaying(false); setJobResult(null); setMissionId('');
    } catch {
      pushToast({ tone: 'error', title: t('Gagal menyimpan media'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
      notify({
        title: t('Gagal menyimpan media'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Deteksi Objek',
        source: 'Video Analytic',
        page: 'detection-video',
        silent: true,
      });
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
              <button className="btn btn-secondary" disabled={!canSave} onClick={saveMedia}>
                {saving
                  ? <><RefreshCw size={15} className="spin" /> {t('Menyimpan…')}</>
                  : <><Save size={15} /> {t('Simpan Media')}</>}
              </button>
              {running ? (
                <button className="btn btn-danger" onClick={stop} disabled={stopping}>
                  {stopping
                    ? <><Loader2 size={15} className="spin" /> {t('Menghentikan…')}</>
                    : <><Square size={15} /> {t('Hentikan')}</>}
                </button>
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
          accept=".mp4,.avi,.mov,.mkv,.ts"
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
                  running ? (isUdp ? `${t('Umpan langsung dari')} ${udpUrl.trim()}` : t('Aliran langsung dari job berjalan'))
                    : finished ? (isUdp ? t('Sesi live selesai — hasil sesi UDP tidak disimpan') : t('Job selesai — geser linimasa untuk meninjau ulang'))
                      : isUdp ? udpUrl.trim()
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
              ) : isUdp && (starting || running) ? (
                <EmptyState
                  icon={<Loader2 size={22} className="spin" />}
                  title={t('Menunggu stream UDP…')}
                  description={`${t('Backend sedang membuka')} ${udpUrl.trim()}. ${t('Frame pertama muncul begitu paket video diterima.')}`}
                />
              ) : isUdp ? (
                <EmptyState
                  icon={<Radio size={22} />}
                  title={t('Sumber UDP belum dijalankan')}
                  description={t('Isi alamat UDP di panel kanan, lalu tekan Jalankan Deteksi.')}
                />
              ) : previewLoading ? (
                // Browser tidak bisa memutar MPEG-TS mentah lewat <video>
                // sama sekali — backend diminta remux cepat ke MP4 dulu
                // (lihat getDetectionPreview di pick()) supaya ada
                // pratinjau yang sungguh bisa diputar, bukan cuma kartu
                // info seperti sebelumnya.
                <EmptyState
                  icon={<Loader2 size={22} className="spin" />}
                  title={t('Menyiapkan pratinjau…')}
                  description={t('Mengonversi video ke format yang bisa diputar browser.')}
                />
              ) : file ? (
                <VideoPlayer src={file.url} label={file.name} sublabel={t('Menunggu deteksi dimulai')} aspect="16 / 9" />
              ) : (
                <EmptyState
                  icon={<FileVideo size={22} />}
                  title={t('Belum ada video dimuat')}
                  description={t('Pilih sumber video di panel kanan, lalu jalankan deteksi untuk melihat umpan langsung.')}
                />
              )}

              {framesRef.current.length > 0 && (
                <div style={{ marginTop: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    {finished && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => {
                          if (!replaying && currentIndex >= framesRef.current.length - 1) setPlayIndex(0);
                          setReplaying(r => !r);
                        }}
                      >
                        {replaying ? <Pause size={13} /> : <Play size={13} />}
                      </button>
                    )}
                    <span className="font-mono text-xs" style={{ color: 'var(--text-muted)', minWidth: 64 }}>
                      {formatElapsed(currentFrame?.t ?? 0)}
                    </span>
                    <input
                      type="range"
                      min={0}
                      max={Math.max(0, framesRef.current.length - 1)}
                      value={currentIndex}
                      onChange={e => { setLiveEdge(false); setReplaying(false); setPlayIndex(Number(e.target.value)); }}
                      style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
                    />
                    {running && !liveEdge && (
                      <button className="btn btn-secondary btn-sm" onClick={() => { setLiveEdge(true); setReplaying(false); }}>
                        {t('Ke Live')}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </GlassCard>


          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <GlassCard>
              <SectionHead icon={<Radio size={15} />} title={t('Sumber Video')} />
              <div className="form-group">
                <label className="form-label" htmlFor="vid-source">{t('Jenis Sumber')}</label>
                <select
                  id="vid-source"
                  className="form-input"
                  value={source}
                  onChange={e => changeSource(e.target.value as VideoSourceKind)}
                  disabled={starting || running}
                >
                  <option value="upload">{t('Unggah Berkas')}</option>
                  <option value="udp">{t('Stream UDP')}</option>
                </select>
              </div>

              {source === 'udp' ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" htmlFor="vid-udp">{t('Alamat UDP')}</label>
                  <input
                    id="vid-udp"
                    className="form-input font-mono"
                    value={udpUrl}
                    onChange={e => setUdpUrl(e.target.value)}
                    placeholder="udp://@244.10.10.10:15004"
                    spellCheck={false}
                    disabled={starting || running}
                  />
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
                    <span className="uploader-sub">{t('MP4, AVI, MOV, TS, atau MKV')}</span>
                  </span>
                  <span className="btn btn-secondary btn-sm" aria-hidden>{t('Telusuri Berkas')}</span>
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
                      {classCounts.map(({ cls, count, color: classColor }) => {
                        const pct = Math.round((count / classCounts[0].count) * 100);
                        /* Fallback ke warna baku hanya bila backend belum
                           mengirim `color` untuk kelas ini. */
                        const color = classColor || (cls === 'person' ? 'var(--accent-emerald)' : 'var(--accent-primary)');
                        return (
                          <tr key={cls}>
                            <td style={{ fontWeight: 600 }}>
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 14 }}>
                                {cls === 'person' ? <PersonStanding size={13} /> : <Car size={13} />}
                                {capitalize(cls)}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ flex: 1, height: 4, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden', minWidth: 90 }}>
                                  <div style={{ width: `${pct}%`, height: '100%', background: color }} />
                                </div>
                                <span className="font-mono" style={{ fontSize: 14, fontWeight: 700, color }}>{count}</span>
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
