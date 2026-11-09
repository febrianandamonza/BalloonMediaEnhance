'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useApp, useNavGuard } from '../context';
import api, { WS_BASE, type LiveStreamFrameMessage } from '../services/api';
import GlassCard from '../components/GlassCard';
import { PageHead, SectionHead, VideoStage } from '../components/ui';
import {
  Radio, Wifi, Play, Pause, Square, AlertTriangle, Video, Maximize2, Minimize2,
} from 'lucide-react';

/* =====================================================================
   LIVE STREAM
   ---------------------------------------------------------------------
   Sumber UDP → backend (LatestFrameReader → JPEG) → WebSocket → <img>.
   Jalurnya sama dengan sesi live Crowd Counting / Video Analytic, hanya
   tanpa inferensi AI. POST /network-stream/live {network_url} membuat
   job_id; backend baru membuka sumber saat WebSocket
   /network-stream/ws/{job_id} tersambung, dan sesi diakhiri dengan
   mengirim {"action":"stop"} lewat socket itu.

   Sebelumnya halaman ini memakai FFmpeg → HLS → hls.js; HLS menahan
   beberapa segmen video sebelum diputar sehingga delay-nya beberapa
   detik. Di sini backend selalu mengirim frame TERBARU dan membuang yang
   tertunggak, jadi delay tidak pernah menumpuk.

   Jeda / putar ulang memakai buffer frame di browser (seperti Crowd
   Counting): saat dijeda, frame tetap diterima dan disimpan sehingga
   "Kembali ke Live" langsung ke frame terkini.
   ===================================================================== */

type Phase = 'setup' | 'connecting' | 'live' | 'paused';

/* Jumlah frame yang disimpan untuk putar ulang. Pada ~25 fps ≈ 12 detik;
   satu frame JPEG 1280px ±60–120 KB base64, jadi buffer ini ±30 MB. */
const LIVE_FRAME_BUFFER = 300;
/* Batas tunggu backend menutup sesi setelah pesan stop dikirim — sama
   seperti LIVE_STOP_TIMEOUT_MS di Crowd Counting. */
const LIVE_STOP_TIMEOUT_MS = 15000;
/* Slider & indikator fps tidak perlu di-render ulang di setiap frame. */
const UI_REFRESH_MS = 250;

function NetworkUrlField({ value, onChange, disabled }: { value: string; onChange: (v: string) => void; disabled: boolean }) {
  const { t } = useApp();
  const id = useId();
  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{t('URL Sumber Jaringan')}</label>
      <input
        id={id}
        className="form-input font-mono"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="udp://@0.0.0.0:15004"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  );
}

export default function LiveStreamPage() {
  const { t, pushToast, notify } = useApp();

  const [networkUrl, setNetworkUrl] = useState('');
  const [phase, setPhase] = useState<Phase>('setup');
  const [loading, setLoading] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Hanya untuk tampilan (slider/fps) — diperbarui tiap UI_REFRESH_MS.
  const [bufferLen, setBufferLen] = useState(0);
  const [playIndex, setPlayIndex] = useState(0);
  const [fps, setFps] = useState(0);
  const [resolution, setResolution] = useState<string | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const framesRef = useRef<string[]>([]);
  const playIndexRef = useRef(0);
  // Salinan phase untuk handler WebSocket, yang closure-nya dibuat sekali
  // saat socket dibuka. Selalu diubah lewat changePhase.
  const phaseRef = useRef<Phase>('setup');
  const stopTimerRef = useRef<number | null>(null);
  const uiTimerRef = useRef<number | null>(null);
  const fpsWindowRef = useRef<{ start: number; frames: number }>({ start: 0, frames: 0 });
  // uid log /tether-cable-api — tidak ditampilkan, cukup ref.
  const tetherUidRef = useRef<string | null>(null);

  const changePhase = (next: Phase) => {
    phaseRef.current = next;
    setPhase(next);
  };

  const changeTetherUid = (uid: string | null) => {
    tetherUidRef.current = uid;
  };

  /* ---- Fullscreen panel Umpan Live — pola sama dengan Crowd Counting /
     Video Analytic (class vd-fullscreen di media.css). Yang dibuat layar
     penuh adalah wrapper, bukan <img>, supaya bar kontrol ikut tampil. */
  const stageRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onChange = () => setIsFullscreen(document.fullscreenElement === stageRef.current && stageRef.current != null);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const toggleFullscreen = () => {
    const el = stageRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => { });
    } else {
      document.exitFullscreen?.().catch(() => { });
    }
  };

  useNavGuard(
    phase !== 'setup',
    t('Live stream sedang berjalan. Tekan Stop dulu sebelum meninggalkan halaman ini.'),
  );

  const showFrame = (src: string | undefined) => {
    if (src && imgRef.current) imgRef.current.src = src;
  };

  const clearTimers = () => {
    if (stopTimerRef.current != null) window.clearTimeout(stopTimerRef.current);
    if (uiTimerRef.current != null) window.clearInterval(uiTimerRef.current);
    stopTimerRef.current = null;
    uiTimerRef.current = null;
  };

  /* Menutup socket & kembali ke layar setup. Dipanggil saat backend
     mengirim `finished`, saat error, atau saat batas tunggu stop habis. */
  const endSession = () => {
    clearTimers();
    if (document.fullscreenElement) document.exitFullscreen?.().catch(() => { });
    const socket = wsRef.current;
    wsRef.current = null;
    if (socket) {
      socket.onclose = null;
      socket.close();
    }
    const uid = tetherUidRef.current;
    if (uid) api.stopTetherCableApiLog(uid).catch(() => { });
    framesRef.current = [];
    playIndexRef.current = 0;
    changeTetherUid(null);
    changePhase('setup');
    setStopping(false);
    setBufferLen(0);
    setPlayIndex(0);
    setFps(0);
    setResolution(null);
  };

  /* Pindah halaman / reload di tengah sesi → socket ditutup; backend
     menganggap socket putus sebagai permintaan berhenti dan melepas port
     UDP-nya. */
  useEffect(() => () => {
    clearTimers();
    wsRef.current?.close();
    const uid = tetherUidRef.current;
    if (uid) api.stopTetherCableApiLog(uid).catch(() => { });
  }, []);

  const openSocket = (jobId: string, url: string) => {
    const socket = new WebSocket(`${WS_BASE}/network-stream/ws/${jobId}`);
    wsRef.current = socket;
    fpsWindowRef.current = { start: performance.now(), frames: 0 };

    uiTimerRef.current = window.setInterval(() => {
      setBufferLen(framesRef.current.length);
      setPlayIndex(playIndexRef.current);
      const now = performance.now();
      const w = fpsWindowRef.current;
      if (now - w.start >= 1000) {
        setFps(Math.round((w.frames * 1000) / (now - w.start)));
        fpsWindowRef.current = { start: now, frames: 0 };
      }
    }, UI_REFRESH_MS);

    socket.onmessage = (ev) => {
      let data: LiveStreamFrameMessage;
      try {
        data = JSON.parse(ev.data) as LiveStreamFrameMessage;
      } catch {
        return;
      }

      if (data.error) {
        setConnectError(data.error);
        pushToast({ tone: 'error', title: t('Gagal memulai live stream'), detail: data.error });
        endSession();
        return;
      }

      if (data.frame) {
        const src = `data:image/jpeg;base64,${data.frame}`;
        const frames = framesRef.current;
        frames.push(src);
        if (frames.length > LIVE_FRAME_BUFFER) {
          frames.shift();
          // Frame yang sedang ditonton saat dijeda ikut bergeser indeksnya.
          playIndexRef.current = Math.max(0, playIndexRef.current - 1);
        }
        fpsWindowRef.current.frames += 1;

        if (phaseRef.current === 'connecting') {
          changePhase('live');
          if (data.width && data.height) setResolution(`${data.width}×${data.height}`);
        }
        if (phaseRef.current === 'live') {
          playIndexRef.current = frames.length - 1;
          // Langsung ke DOM, tanpa re-render React di setiap frame.
          showFrame(src);
        }
      }

      if (data.finished) {
        const sourceLost = data.reason === 'source_lost';
        pushToast({
          tone: sourceLost ? 'warning' : 'info',
          title: sourceLost ? t('Sumber UDP terputus') : t('Live stream dihentikan'),
          detail: sourceLost ? t('Tidak ada frame baru dari sumber — sesi diakhiri otomatis.') : undefined,
        });
        if (sourceLost) {
          notify({
            title: t('Sumber UDP terputus'),
            detail: `${t('Tidak ada frame baru dari sumber — sesi diakhiri otomatis.')} (${url})`,
            severity: 'peringatan',
            category: 'Operasional',
            source: 'Live Stream',
            silent: true,
          });
        }
        endSession();
      }
    };

    socket.onerror = () => {
      setConnectError(t('WebSocket ke server live stream gagal.'));
    };

    // Socket ditutup server tanpa pesan `finished` (mis. backend mati).
    socket.onclose = () => {
      if (wsRef.current !== socket) return;
      pushToast({ tone: 'error', title: t('Koneksi live stream terputus') });
      endSession();
    };
  };

  const goLive = async () => {
    const url = networkUrl.trim();
    if (!url) return;
    setLoading(true);
    setConnectError(null);
    framesRef.current = [];
    playIndexRef.current = 0;
    try {
      const job = await api.startLiveStream(url);
      changePhase('connecting');
      openSocket(job.job_id, url);

      /* Pencatatan sesi ke /tether-cable-api — murni log; kegagalannya
         tidak boleh membuat live stream dianggap gagal. */
      try {
        const log = await api.startTetherCableApiLog(url);
        changeTetherUid(log.uid);
      } catch (logErr) {
        console.warn('Gagal mencatat sesi tether-cable-api:', logErr);
      }

      pushToast({ tone: 'success', title: t('Live stream dimulai'), detail: url });
      notify({
        title: t('Live stream dimulai'),
        detail: `${t('Menerima umpan dari')} ${url}.`,
        severity: 'informasi',
        category: 'Operasional',
        source: 'Live Stream',
        silent: true,
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : undefined;
      setConnectError(detail ?? t('Tidak bisa menyambung ke stream. Periksa URL sumber dan pastikan backend berjalan.'));
      pushToast({ tone: 'error', title: t('Gagal memulai live stream'), detail });
      endSession();
    } finally {
      setLoading(false);
    }
  };

  const pause = () => {
    playIndexRef.current = Math.max(0, framesRef.current.length - 1);
    setPlayIndex(playIndexRef.current);
    changePhase('paused');
  };

  const resumeLive = () => {
    const frames = framesRef.current;
    playIndexRef.current = Math.max(0, frames.length - 1);
    showFrame(frames[frames.length - 1]);
    changePhase('live');
  };

  const seek = (index: number) => {
    playIndexRef.current = index;
    setPlayIndex(index);
    showFrame(framesRef.current[index]);
    if (phase !== 'paused') changePhase('paused');
  };

  const stop = () => {
    const socket = wsRef.current;
    /* Sama seperti Crowd Counting: backend yang menutup sesi setelah
       menerima pesan stop (melepas port UDP dengan rapi), lalu mengirim
       `finished`. Batas waktu hanya jaga-jaga kalau balasan tidak datang. */
    if (socket?.readyState === WebSocket.OPEN) {
      if (stopping) return;
      socket.send(JSON.stringify({ action: 'stop' }));
      setStopping(true);
      stopTimerRef.current = window.setTimeout(endSession, LIVE_STOP_TIMEOUT_MS);
      return;
    }
    endSession();
  };

  const receiving = phase === 'live' || phase === 'paused';
  const behindFrames = Math.max(0, bufferLen - 1 - playIndex);

  const statusBadge = phase === 'live'
    ? <span className="badge badge-success">{t('LIVE')}</span>
    : phase === 'paused'
      ? <span className="badge badge-neutral">{t('DIJEDA')}</span>
      : <span className="badge badge-neutral">{t('MENGHUBUNGKAN')}</span>;

  // Dipakai di bawah panel (mode biasa) dan di bar kontrol layar penuh.
  const replaySlider = receiving && bufferLen > 1 ? (
    <>
      <input
        type="range"
        min={0}
        max={bufferLen - 1}
        step={1}
        value={phase === 'live' ? bufferLen - 1 : Math.min(playIndex, bufferLen - 1)}
        onChange={e => seek(Number(e.target.value))}
        aria-label={t('Putar ulang')}
        style={{ flex: 1, minWidth: 0, accentColor: 'var(--accent-primary)' }}
      />
      {phase === 'paused' && behindFrames > 0 && (
        <span className="text-muted font-mono" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
          −{behindFrames} {t('frame')}
        </span>
      )}
    </>
  ) : null;

  return (
    <div className="animate-fade-in">
      <PageHead
        icon={<Radio size={22} />}
        title={t('Live Stream')}
        description={t('Masukkan URL UDP untuk memulai live.')}
      />

      <GlassCard tilt={false}>
        <SectionHead
          icon={<Wifi size={15} />}
          title={t('Sumber Jaringan')}
          sub={t('Wajib diisi sebelum umpan dapat dimulai')}
        />
        <NetworkUrlField value={networkUrl} onChange={setNetworkUrl} disabled={phase !== 'setup'} />

        <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
          {phase === 'setup' ? (
            <button className="btn btn-primary sheen" disabled={!networkUrl.trim() || loading} onClick={goLive}>
              <Radio size={15} /> {loading ? t('Memulai...') : t('Live')}
            </button>
          ) : (
            <>
              {phase === 'paused' ? (
                <button className="btn btn-primary sheen" onClick={resumeLive}>
                  <Play size={15} /> {t('Kembali ke Live')}
                </button>
              ) : (
                <button className="btn btn-secondary" onClick={pause} disabled={phase !== 'live'}>
                  <Pause size={15} /> {t('Jeda')}
                </button>
              )}
              <button className="btn btn-danger" onClick={stop} disabled={stopping}>
                <Square size={15} /> {stopping ? t('Menghentikan...') : t('Stop')}
              </button>
            </>
          )}
        </div>

        {phase === 'setup' && connectError && (
          <p className="note-inline" style={{ color: 'var(--danger-400)', marginTop: 12 }}>
            <AlertTriangle size={13} /> {connectError}
          </p>
        )}
      </GlassCard>

      {phase !== 'setup' && (
        <GlassCard tilt={false} style={{ marginTop: 16 }}>
          <SectionHead
            icon={<Video size={15} />}
            title={t('Umpan Live')}
            sub={[networkUrl, resolution, receiving ? `${fps} fps` : null].filter(Boolean).join(' · ')}
            right={
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {statusBadge}
                <button
                  type="button"
                  className="btn btn-ghost btn-sm vd-fullscreen-btn"
                  onClick={toggleFullscreen}
                  disabled={!receiving}
                  aria-label={t('Layar penuh')}
                  title={t('Layar penuh')}
                >
                  <Maximize2 size={13} />
                </button>
              </div>
            }
          />

          <div
            ref={stageRef}
            className={`live-stage${isFullscreen ? ' vd-fullscreen' : ''}`}
            onDoubleClick={receiving ? toggleFullscreen : undefined}
          >
            <VideoStage
              label={t('Live Stream')}
              running={phase === 'live'}
              aspect={isFullscreen ? 'auto' : '16 / 9'}
              overlay={phase === 'connecting' ? (
                <span className="text-muted">{t('Menunggu frame pertama dari sumber...')}</span>
              ) : undefined}
              scene={
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  ref={imgRef}
                  alt={t('Live Stream')}
                  style={{
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    objectFit: 'contain',
                    visibility: receiving ? 'visible' : 'hidden',
                  }}
                />
              }
            />

            {/* Bar kontrol khusus layar penuh — Jeda/Live & putar ulang
                tetap bisa dipakai tanpa keluar dari layar penuh. */}
            {isFullscreen && (
              <div className="live-fs-bar" onDoubleClick={e => e.stopPropagation()}>
                {statusBadge}
                {phase === 'paused' ? (
                  <button className="btn btn-primary btn-sm" onClick={resumeLive}>
                    <Play size={13} /> {t('Kembali ke Live')}
                  </button>
                ) : (
                  <button className="btn btn-secondary btn-sm" onClick={pause} disabled={phase !== 'live'}>
                    <Pause size={13} /> {t('Jeda')}
                  </button>
                )}
                {replaySlider}
                <span className="font-mono live-fs-meta">
                  {[resolution, `${fps} fps`].filter(Boolean).join(' · ')}
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={toggleFullscreen}
                  aria-label={t('Keluar layar penuh')}
                  title={t('Keluar layar penuh')}
                >
                  <Minimize2 size={13} />
                </button>
              </div>
            )}
          </div>

          {connectError && (
            <p className="note-inline" style={{ color: 'var(--danger-400)' }}>
              <AlertTriangle size={13} /> {connectError}
            </p>
          )}

          {!isFullscreen && replaySlider && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              {replaySlider}
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
