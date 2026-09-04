'use client';
import React, { useEffect, useId, useRef, useState } from 'react';
import Hls from 'hls.js';
import { useApp, useNavGuard } from '../context';
import api, { API_BASE_MEDIA } from '../services/api';
import GlassCard from '../components/GlassCard';
import { PageHead, SectionHead, VideoStage } from '../components/ui';
import {
  Radio, Wifi, Play, Pause, Square, AlertTriangle, Video,
} from 'lucide-react';

/* =====================================================================
   LIVE STREAM
   ---------------------------------------------------------------------
   Kamera/Source (UDP/RTSP/RTMP) → backend (FFmpeg → HLS) → browser.
   POST /network-stream/start {network_url} membuat backend menjalankan
   FFmpeg yang menulis segmen HLS; respons berisi stream_id + playlist_url
   (path statis, diresolusi lewat API_BASE_MEDIA, bukan API_BASE — sama
   seperti berkas media di GCSPage). Playlist di-poll dulu (FFmpeg butuh
   beberapa detik generate segmen pertama) sebelum hls.js dipasang ke
   <video>. POST /network-stream/stop/{stream_id} menghentikan FFmpeg di
   sisi backend.

   HLS punya buffer segmen tersimpan secara alami di sisi backend, jadi
   Jeda/Putar-Ulang/Kembali-ke-Live didapat dari kemampuan seek bawaan
   <video>+hls.js (hls.liveSyncPosition, video.seekable) — tanpa hack
   canvas-capture.
   ===================================================================== */

type Phase = 'setup' | 'live' | 'paused';

async function waitForPlaylist(url: string, maxAttempts = 20, intervalMs = 1000): Promise<boolean> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const body = await res.text();
        if (body.includes('.ts')) return true;
      }
    } catch {
      // backend/jaringan belum siap, coba lagi
    }
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
  return false;
}

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
        placeholder="udp://@0.0.0.0:5600"
        spellCheck={false}
        disabled={disabled}
      />
    </div>
  );
}

export default function LiveStreamPage() {
  const { t, pushToast, notify } = useApp();

  const [networkUrl, setNetworkUrl] = useState('');
  const [streamId, setStreamId] = useState<string | null>(null);
  const [hlsUrl, setHlsUrl] = useState<string | null>(null);
  const [phase, setPhase] = useState<Phase>('setup');
  const [loading, setLoading] = useState(false);
  const [connectError, setConnectError] = useState(false);

  const [currentTime, setCurrentTime] = useState(0);
  const [seekableStart, setSeekableStart] = useState(0);
  const [seekableEnd, setSeekableEnd] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useNavGuard(
    phase !== 'setup',
    t('Live stream sedang berjalan. Tekan Stop dulu sebelum meninggalkan halaman ini, supaya proses FFmpeg di backend ikut dihentikan.'),
  );

  const goLive = async () => {
    if (!networkUrl.trim()) return;
    setLoading(true);
    setConnectError(false);
    try {
      const data = await api.startNetworkStream(networkUrl.trim());
      console.log(data);
      setStreamId(data.stream_id);
      const url = `${API_BASE_MEDIA}${data.playlist_url}`;
      const ready = await waitForPlaylist(url);
      if (!ready) throw new Error(t('Timeout menunggu FFmpeg menyiapkan stream. Periksa URL dan pastikan sumbernya aktif.'));
      setHlsUrl(url);
      setCurrentTime(0);
      setSeekableStart(0);
      setSeekableEnd(0);
      setPhase('live');
      pushToast({ tone: 'success', title: t('Live stream dimulai'), detail: networkUrl.trim() });
      notify({
        title: t('Live stream dimulai'),
        detail: `${t('Menerima umpan dari')} ${networkUrl.trim()}.`,
        severity: 'informasi',
        category: 'Operasional',
        source: 'Live Stream',
        silent: true,
      });
    } catch (err) {
      setConnectError(true);
      pushToast({
        tone: 'error',
        title: t('Gagal memulai live stream'),
        detail: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setLoading(false);
    }
  };

  const pause = () => {
    videoRef.current?.pause();
    setPhase('paused');
  };

  const resumeLive = () => {
    const video = videoRef.current;
    const hls = hlsRef.current;
    if (video) {
      if (hls?.liveSyncPosition != null) video.currentTime = hls.liveSyncPosition;
      else if (video.seekable.length > 0) video.currentTime = video.seekable.end(video.seekable.length - 1);
      video.play();
    }
    setPhase('live');
  };

  const stop = async () => {
    hlsRef.current?.destroy();
    hlsRef.current = null;
    if (streamId) await api.stopNetworkStream(streamId).catch(() => { });
    setPhase('setup');
    setStreamId(null);
    setHlsUrl(null);
    setConnectError(false);
    pushToast({ tone: 'info', title: t('Live stream dihentikan') });
  };

  useEffect(() => {
    if (!hlsUrl) return;
    const video = videoRef.current;
    if (!video) return;

    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls({
        liveSyncDuration: 2,
        liveMaxLatencyDuration: 5,
        // FFmpeg butuh beberapa detik generate playlist/segmen pertama,
        // jadi retry manifest yang lebih gigih daripada default.
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 10,
        levelLoadingRetryDelay: 1000,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.on(Hls.Events.ERROR, (_evt, data) => {
        if (!data.fatal) return;
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            // mis. segmen/playlist belum ada / sempat 404, coba lagi
            hls.startLoad();
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            hls.recoverMediaError();
            break;
          default:
            setConnectError(true);
            hls.destroy();
            hlsRef.current = null;
            break;
        }
      });
      hls.loadSource(hlsUrl);
      hls.attachMedia(video);
    } else {
      setConnectError(true);
    }

    return () => {
      hlsRef.current?.destroy();
      hlsRef.current = null;
      video.removeAttribute('src');
    };
  }, [hlsUrl]);

  const onTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);
    if (video.seekable.length > 0) {
      setSeekableStart(video.seekable.start(0));
      setSeekableEnd(video.seekable.end(video.seekable.length - 1));
    }
  };

  return (
    <div className="animate-fade-in">
      <PageHead
        icon={<Radio size={22} />}
        title={t('Live Stream')}
        description={t('Masukkan URL sumber jaringan (UDP/RTSP/RTMP) untuk memulai umpan live.')}
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
              {phase === 'live' ? (
                <button className="btn btn-secondary" onClick={pause}>
                  <Pause size={15} /> {t('Jeda')}
                </button>
              ) : (
                <button className="btn btn-primary sheen" onClick={resumeLive}>
                  <Play size={15} /> {t('Kembali ke Live')}
                </button>
              )}
              <button className="btn btn-danger" onClick={stop}>
                <Square size={15} /> {t('Stop')}
              </button>
            </>
          )}
        </div>
      </GlassCard>

      {phase !== 'setup' && (
        <GlassCard tilt={false} style={{ marginTop: 16 }}>
          <SectionHead
            icon={<Video size={15} />}
            title={t('Umpan Live')}
            sub={networkUrl}
            right={
              phase === 'live'
                ? <span className="badge badge-success">{t('LIVE')}</span>
                : <span className="badge badge-neutral">{t('DIJEDA')}</span>
            }
          />

          <VideoStage
            label={t('Live Stream')}
            running={phase === 'live'}
            scene={
              <video
                ref={videoRef}
                muted
                autoPlay
                playsInline
                onTimeUpdate={onTimeUpdate}
                onError={() => setConnectError(true)}
                onPlaying={() => setConnectError(false)}
                style={{
                  position: 'absolute', inset: 0, width: '100%', height: '100%',
                  objectFit: 'contain',
                }}
              />
            }
          />

          {connectError && (
            <p className="note-inline" style={{ color: 'var(--danger-400)' }}>
              <AlertTriangle size={13} />{' '}
              {t('Tidak bisa menyambung ke stream. Periksa URL sumber dan pastikan backend/FFmpeg berjalan.')}
            </p>
          )}

          {seekableEnd > seekableStart && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
              <input
                type="range"
                min={seekableStart}
                max={seekableEnd}
                step={0.1}
                value={currentTime}
                onChange={e => {
                  const v = Number(e.target.value);
                  if (videoRef.current) videoRef.current.currentTime = v;
                  setPhase('paused');
                }}
                style={{ flex: 1, accentColor: 'var(--accent-primary)' }}
              />
            </div>
          )}
        </GlassCard>
      )}
    </div>
  );
}
