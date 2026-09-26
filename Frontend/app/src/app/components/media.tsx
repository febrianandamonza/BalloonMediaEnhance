'use client';
/* =====================================================================
   PEMUTAR & PEMBANDING MEDIA
   ---------------------------------------------------------------------
   Komponen di bawah menampilkan rekaman dan citra hasil pengolahan yang
   sesungguhnya — bukan gambar tiruan. Berkasnya disajikan dari folder
   public/samples di dalam repositori, sehingga tetap tersedia meskipun
   stasiun dioperasikan tanpa sambungan keluar.
   ===================================================================== */

import React, {
  useCallback, useEffect, useRef, useState, type ReactNode,
} from 'react';
import { Play, Pause, RotateCcw, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { useApp } from '../context';

/* ---------------------------------------------------------------------
   Katalog berkas sampel — satu tempat rujukan untuk seluruh modul.
   --------------------------------------------------------------------- */
export const SAMPLES = {
  crowdBefore: '/samples/crowd-before.mp4',
  crowdAfter: '/samples/crowd-after.mp4',
  detectionBefore: '/samples/detection-before.png',
  detectionAfter: '/samples/detection-after.png',
  enhanceImageBefore: '/samples/enhance-image-before.png',
  enhanceImageAfter: '/samples/enhance-image-after.png',
  enhanceVideoBefore: '/samples/enhance-video-before.mp4',
  enhanceVideoAfter: '/samples/enhance-video-after.mp4',
} as const;

const fmtTime = (s: number) => {
  if (!Number.isFinite(s)) return '0:00';
  const m = Math.floor(s / 60);
  return `${m}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
};

/* =====================================================================
   Penggeser pembanding — dipakai untuk pasangan sebelum/sesudah.
   Pembagi dapat ditarik dengan tetikus, sentuhan, maupun tombol panah.
   ===================================================================== */
export function CompareSlider({
  children, labelBefore = 'Sebelum', labelAfter = 'Sesudah', initial = 50, aspect,
}: {
  /** Dua anak: [sisi kiri/sebelum, sisi kanan/sesudah] */
  children: [ReactNode, ReactNode];
  labelBefore?: string;
  labelAfter?: string;
  initial?: number;
  aspect?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(initial);
  const dragging = useRef(false);

  const moveTo = useCallback((clientX: number) => {
    const el = hostRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) moveTo(e.clientX); };
    const onTouch = (e: TouchEvent) => {
      if (dragging.current && e.touches[0]) moveTo(e.touches[0].clientX);
    };
    const stop = () => { dragging.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('touchmove', onTouch, { passive: true });
    window.addEventListener('mouseup', stop);
    window.addEventListener('touchend', stop);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('touchmove', onTouch);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('touchend', stop);
    };
  }, [moveTo]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setPos(p => Math.max(0, p - 4));
    if (e.key === 'ArrowRight') setPos(p => Math.min(100, p + 4));
  };

  return (
    <div
      ref={hostRef}
      className="cmp"
      style={aspect ? { aspectRatio: aspect } : undefined}
      onMouseDown={e => { dragging.current = true; moveTo(e.clientX); }}
      onTouchStart={e => { dragging.current = true; if (e.touches[0]) moveTo(e.touches[0].clientX); }}
    >
      {/* Sisi "sesudah" tergelar penuh sebagai dasar */}
      <div className="cmp-layer">{children[1]}</div>

      {/* Sisi "sebelum" dipangkas mengikuti posisi pembagi */}
      <div className="cmp-layer cmp-clip" style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}>
        {children[0]}
      </div>

      <span className="cmp-tag left" style={{ opacity: pos > 12 ? 1 : 0 }}>{labelBefore}</span>
      <span className="cmp-tag right" style={{ opacity: pos < 88 ? 1 : 0 }}>{labelAfter}</span>

      <div className="cmp-bar" style={{ left: `${pos}%` }}>
        <button
          type="button"
          className="cmp-knob"
          aria-label={`Geser pembanding — ${Math.round(pos)}% ${labelBefore}`}
          aria-valuenow={Math.round(pos)}
          aria-valuemin={0}
          aria-valuemax={100}
          role="slider"
          tabIndex={0}
          onKeyDown={onKey}
          onMouseDown={e => { e.stopPropagation(); dragging.current = true; }}
          onTouchStart={e => { e.stopPropagation(); dragging.current = true; }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"
               strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M9 6 3 12l6 6M15 6l6 6-6 6" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
   Pemutar video dengan kendali bergaya HUD.
   ===================================================================== */
export function VideoPlayer({
  src, poster, autoPlay = true, loop = true, label, sublabel, badge, aspect = '16 / 9',
}: {
  src: string;
  poster?: string;
  autoPlay?: boolean;
  loop?: boolean;
  label?: string;
  sublabel?: string;
  badge?: ReactNode;
  aspect?: string;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(autoPlay);
  const [muted, setMuted] = useState(true);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);

  const toggle = () => {
    const v = ref.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); } else { v.pause(); }
  };

  const restart = () => {
    const v = ref.current;
    if (!v) return;
    v.currentTime = 0;
    v.play().catch(() => {});
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = ref.current;
    if (!v || !dur) return;
    v.currentTime = (Number(e.target.value) / 100) * dur;
  };

  const full = () => ref.current?.requestFullscreen?.().catch(() => {});

  return (
    <div className="vp" style={{ aspectRatio: aspect }}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted={muted}
        loop={loop}
        autoPlay={autoPlay}
        playsInline
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onTimeUpdate={e => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={e => setDur(e.currentTarget.duration)}
      />

      {/* Bingkai sudut HUD */}
      <span className="vp-corners" aria-hidden />

      {(label || badge) && (
        <span className="vp-caption">
          {label && <b>{label}</b>}
          {sublabel && <i>{sublabel}</i>}
        </span>
      )}
      {badge && <span className="vp-badge">{badge}</span>}

      <div className="vp-controls">
        <button type="button" onClick={toggle} aria-label={playing ? 'Jeda' : 'Putar'}>
          {playing ? <Pause size={14} /> : <Play size={14} />}
        </button>
        <button type="button" onClick={restart} aria-label="Ulang dari awal">
          <RotateCcw size={13} />
        </button>

        <span className="vp-time">{fmtTime(time)}</span>
        <input
          type="range"
          min={0}
          max={100}
          step={0.1}
          value={dur ? (time / dur) * 100 : 0}
          onChange={seek}
          aria-label="Posisi pemutaran"
        />
        <span className="vp-time">{fmtTime(dur)}</span>

        <button type="button" onClick={() => setMuted(m => !m)} aria-label={muted ? 'Nyalakan suara' : 'Bisukan'}>
          {muted ? <VolumeX size={13} /> : <Volume2 size={13} />}
        </button>
        <button type="button" onClick={full} aria-label="Layar penuh">
          <Maximize2 size={13} />
        </button>
      </div>
    </div>
  );
}

/* =====================================================================
   Pembanding dua rekaman yang diputar serentak.
   Video kanan berperan sebagai penentu waktu; video kiri disamakan
   setiap kali selisihnya melebihi 0,15 detik agar kedua sisi pembagi
   memperlihatkan bingkai yang sama.
   ===================================================================== */
export function VideoCompare({
  before, after, labelBefore = 'Sebelum', labelAfter = 'Sesudah', aspect = '16 / 9',
}: {
  before: string;
  after: string;
  labelBefore?: string;
  labelAfter?: string;
  aspect?: string;
}) {
  const { t } = useApp();
  const aRef = useRef<HTMLVideoElement>(null);
  const bRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const lead = bRef.current;
    const follow = aRef.current;
    if (!lead || !follow) return;

    const sync = () => {
      if (Math.abs(follow.currentTime - lead.currentTime) > 0.15) {
        follow.currentTime = lead.currentTime;
      }
    };

    /* Kedua rekaman berukuran beberapa megabita. Selama masih disangga,
       panggung ditutup penanda pemuatan supaya tidak terbaca sebagai
       panel yang rusak. */
    const check = () => {
      if ((aRef.current?.readyState ?? 0) >= 2 && (bRef.current?.readyState ?? 0) >= 2) {
        setReady(true);
      }
    };

    lead.addEventListener('timeupdate', sync);
    lead.addEventListener('loadeddata', check);
    follow.addEventListener('loadeddata', check);
    check();

    return () => {
      lead.removeEventListener('timeupdate', sync);
      lead.removeEventListener('loadeddata', check);
      follow.removeEventListener('loadeddata', check);
    };
  }, []);

  const toggle = () => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    if (b.paused) {
      a.currentTime = b.currentTime;
      a.play().catch(() => {});
      b.play().catch(() => {});
      setPlaying(true);
    } else {
      a.pause();
      b.pause();
      setPlaying(false);
    }
  };

  const restart = () => {
    const a = aRef.current;
    const b = bRef.current;
    if (!a || !b) return;
    a.currentTime = 0;
    b.currentTime = 0;
    a.play().catch(() => {});
    b.play().catch(() => {});
    setPlaying(true);
  };

  const vid = (ref: React.RefObject<HTMLVideoElement | null>, src: string) => (
    <video ref={ref} src={src} muted loop autoPlay playsInline preload="auto" />
  );

  return (
    <div className="vcmp">
      <div style={{ position: 'relative' }}>
        <CompareSlider labelBefore={labelBefore} labelAfter={labelAfter} aspect={aspect}>
          {vid(aRef, before)}
          {vid(bRef, after)}
        </CompareSlider>

        {!ready && (
          <div className="vcmp-loading">
            <span className="dots"><i /><i /><i /></span>
            {t('Menyangga rekaman…')}
          </div>
        )}
      </div>

      <div className="vcmp-bar">
        <button type="button" className="btn btn-secondary btn-sm" onClick={toggle}>
          {playing ? <><Pause size={13} /> Jeda</> : <><Play size={13} /> Putar</>}
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={restart}>
          <RotateCcw size={13} /> Ulang
        </button>
        <span className="vcmp-hint">Tarik pembagi untuk membandingkan kedua keluaran</span>
      </div>
    </div>
  );
}

/* =====================================================================
   Bingkai kecil untuk katalog — memakai bingkai pertama rekaman
   sebagai gambar sampul, tanpa berkas gambar terpisah.
   ===================================================================== */
export function MediaThumb({ src, kind }: { src: string; kind: 'video' | 'image' }) {
  const ref = useRef<HTMLVideoElement>(null);

  /* Penanda #t= saja tidak selalu cukup: sebagian peramban baru
     menggambar bingkai setelah pencarian posisi benar-benar diminta.
     Karena itu posisi disetel ulang begitu metadata tersedia. */
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onMeta = () => {
      if (v.currentTime < 0.1) v.currentTime = Math.min(0.6, (v.duration || 1) / 2);
    };
    v.addEventListener('loadedmetadata', onMeta);
    if (v.readyState >= 1) onMeta();
    return () => v.removeEventListener('loadedmetadata', onMeta);
  }, [src]);

  if (kind === 'video') {
    return (
      <video
        ref={ref}
        src={`${src}#t=0.6`}
        muted
        playsInline
        preload="metadata"
        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
      />
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
}
