'use client';
/* =====================================================================
   FX KIT — komponen efek yang dipakai ulang di seluruh aplikasi
   ---------------------------------------------------------------------
   Semuanya ditulis dari nol di berkas ini: tidak ada paket animasi,
   tidak ada permintaan jaringan, tidak ada aset eksternal. Cukup React,
   CSS custom property, dan requestAnimationFrame.
   ===================================================================== */

import React, {
  useEffect, useRef, useState, useCallback, useSyncExternalStore,
  type ReactNode, type CSSProperties,
} from 'react';

/* ---------------------------------------------------------------------
   Menghormati preferensi "kurangi gerakan" milik sistem operasi.
   Seluruh komponen di bawah memakai kait ini sebelum menjalankan animasi.
   --------------------------------------------------------------------- */
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';

function subscribeMotion(notify: () => void) {
  const mq = window.matchMedia(MOTION_QUERY);
  mq.addEventListener('change', notify);
  return () => mq.removeEventListener('change', notify);
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(MOTION_QUERY).matches,
    () => false, // saat pra-render di server: anggap animasi diizinkan
  );
}

/* =====================================================================
   Filter pembiasan — dipasang sekali di akar dokumen.
   Memberi efek kaca cair sungguhan pada elemen ber-class `lq-refract`.
   ===================================================================== */
export function LiquidGlassFilter() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <filter id="lq-refraction" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence type="fractalNoise" baseFrequency="0.008 0.012" numOctaves="2" seed="7" result="noise" />
          <feGaussianBlur in="noise" stdDeviation="1.4" result="soft" />
          <feDisplacementMap in="SourceGraphic" in2="soft" scale="14" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}

/* =====================================================================
   GrainGradient — latar hero bergradien dengan butiran halus.
   Menggantikan gambar gradien statis: dilukis sepenuhnya oleh peramban
   sehingga tajam pada resolusi berapa pun dan berukuran nol byte.
   ===================================================================== */
export function GrainGradient({
  children, className = '', tone = 'cool', veil = true, style,
}: {
  children?: ReactNode;
  className?: string;
  tone?: 'cool' | 'warm';
  veil?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div className={`grainient ${className}`} style={style}>
      <div className={`gr-mesh ${tone === 'warm' ? 'warm' : ''}`} />
      <div className="gr-grain" />
      {veil && <div className="gr-veil" />}
      {children && <div className="gr-content">{children}</div>}
    </div>
  );
}

/* =====================================================================
   Aurora — tiga bola cahaya melayang untuk latar layar penuh.
   ===================================================================== */
export function Aurora({ stars = true, grid = false }: { stars?: boolean; grid?: boolean }) {
  return (
    <>
      <div className="aurora" aria-hidden>
        <span /><span /><span />
      </div>
      {stars && <div className="fx-stars" aria-hidden />}
      {grid && <div className="fx-grid-floor" aria-hidden />}
    </>
  );
}

/* =====================================================================
   Spotlight — sorotan lembut mengikuti kursor.
   Posisi dikirim lewat custom property agar animasi ditangani compositor
   dan tidak memicu render ulang React.
   ===================================================================== */
export function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T>(null);

  const onMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--sx', `${e.clientX - r.left}px`);
    el.style.setProperty('--sy', `${e.clientY - r.top}px`);
  }, []);

  const onEnter = useCallback(() => ref.current?.setAttribute('data-hot', '1'), []);
  const onLeave = useCallback(() => ref.current?.setAttribute('data-hot', '0'), []);

  return { ref, spotlightProps: { onMouseMove: onMove, onMouseEnter: onEnter, onMouseLeave: onLeave } };
}

export function SpotlightCard({
  children, className = '', edge = false, as: Tag = 'div', ...rest
}: {
  children: ReactNode;
  className?: string;
  /** Sorot hanya garis tepi — lebih tenang untuk kartu berisi data */
  edge?: boolean;
  as?: 'div' | 'section' | 'article';
} & React.HTMLAttributes<HTMLDivElement>) {
  const { ref, spotlightProps } = useSpotlight<HTMLDivElement>();
  return (
    <Tag
      ref={ref}
      className={`${edge ? 'spot-edge' : 'spotlight'} ${className}`}
      {...spotlightProps}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/* =====================================================================
   Tilt — kartu miring mengikuti kursor dengan perspektif 3D.
   ===================================================================== */
export function TiltCard({
  children, className = '', max = 7, scale = 1.012, glare = true, style,
}: {
  children: ReactNode;
  className?: string;
  /** Sudut kemiringan maksimum dalam derajat */
  max?: number;
  scale?: number;
  glare?: boolean;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const reduced = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      el.style.transform =
        `perspective(900px) rotateX(${(0.5 - py) * max * 2}deg) ` +
        `rotateY(${(px - 0.5) * max * 2}deg) scale(${scale})`;
      el.style.setProperty('--sx', `${px * 100}%`);
      el.style.setProperty('--sy', `${py * 100}%`);
    });
  };

  const reset = () => {
    cancelAnimationFrame(raf.current);
    const el = ref.current;
    if (el) el.style.transform = '';
  };

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return (
    <div
      ref={ref}
      className={`tilt ${glare ? 'spotlight' : ''} ${className}`}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onMouseEnter={() => ref.current?.setAttribute('data-hot', '1')}
      style={style}
    >
      {children}
    </div>
  );
}

/* =====================================================================
   Magnetic — elemen tertarik sedikit ke arah kursor.
   Dipakai pada tombol tindakan utama.
   ===================================================================== */
export function Magnetic({
  children, strength = 0.28, className = '',
}: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();

  const onMove = (e: React.MouseEvent) => {
    if (reduced) return;
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate3d(${dx * strength}px, ${dy * strength}px, 0)`;
  };

  return (
    <span
      ref={ref}
      className={className}
      style={{ display: 'inline-flex', transition: 'transform 320ms cubic-bezier(0.16,1,0.3,1)' }}
      onMouseMove={onMove}
      onMouseLeave={() => { if (ref.current) ref.current.style.transform = ''; }}
    >
      {children}
    </span>
  );
}

/* =====================================================================
   CountUp — angka yang naik dari nol dengan pelambatan di ujung.
   ===================================================================== */
export function CountUp({
  to, duration = 1400, decimals = 0, prefix = '', suffix = '', className = '',
}: {
  to: number;
  duration?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  className?: string;
}) {
  const [val, setVal] = useState(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / duration);
      /* easeOutExpo — cepat di awal, mendarat halus di akhir */
      const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
      setVal(to * e);
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, duration, reduced]);

  const shown = reduced ? to : val;

  return (
    <span className={`tabnum ${className}`}>
      {prefix}
      {shown.toLocaleString('id-ID', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}
      {suffix}
    </span>
  );
}

/* =====================================================================
   ScrambleText — huruf teracak yang mengunci satu per satu.
   Dipakai hemat: hanya pada label status yang berubah.
   ===================================================================== */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/\\<>-_';

export function ScrambleText({
  text, speed = 34, className = '',
}: { text: string; speed?: number; className?: string }) {
  const [out, setOut] = useState(text);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    let raf = 0;
    let last = 0;
    const step = (t: number) => {
      if (t - last >= speed) {
        last = t;
        frame += 1;
        const locked = Math.floor(frame / 2);
        setOut(
          text
            .split('')
            .map((c, i) => (i < locked || c === ' ' ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0]))
            .join(''),
        );
      }
      if (frame / 2 < text.length) raf = requestAnimationFrame(step);
      else setOut(text);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [text, speed, reduced]);

  /* Panjang teks bisa berubah di tengah animasi; potong agar keluaran
     tidak pernah lebih panjang dari teks tujuan. */
  const shown = reduced ? text : out.slice(0, text.length).padEnd(text.length, ' ');

  return <span className={className}>{shown}</span>;
}

/* =====================================================================
   TypeLine — mengetik satu baris teks, dipakai pada layar verifikasi.
   ===================================================================== */
export function TypeLine({
  text, speed = 22, className = '', onDone,
}: { text: string; speed?: number; className?: string; onDone?: () => void }) {
  const [n, setN] = useState(0);
  const reduced = useReducedMotion();
  const doneRef = useRef(onDone);

  useEffect(() => { doneRef.current = onDone; }, [onDone]);

  /* Teks berganti → mulai mengetik dari awal. Penyetelan state saat render
     seperti ini adalah pola resmi React untuk menyesuaikan state terhadap
     perubahan prop, dan lebih tepat daripada menaruhnya di dalam effect. */
  const [prevText, setPrevText] = useState(text);
  if (prevText !== text) {
    setPrevText(text);
    setN(0);
  }

  useEffect(() => {
    if (reduced) return;
    const id = window.setInterval(() => {
      setN(prev => {
        if (prev >= text.length) {
          window.clearInterval(id);
          doneRef.current?.();
          return prev;
        }
        return prev + 1;
      });
    }, speed);
    return () => window.clearInterval(id);
  }, [text, speed, reduced]);

  useEffect(() => {
    if (reduced) doneRef.current?.();
  }, [text, reduced]);

  const shown = reduced ? text : text.slice(0, n);

  return (
    <span className={`${className} ${shown.length < text.length ? 'caret' : ''}`}>{shown}</span>
  );
}

/* =====================================================================
   Reveal — muncul saat masuk ke area pandang.
   ===================================================================== */
export function Reveal({
  children, delay = 0, className = '',
}: {
  children: ReactNode;
  /** Urutan 0–6; setiap tingkat menambah jeda 60 ms */
  delay?: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const show = () => el.classList.add('in');

    if (typeof IntersectionObserver === 'undefined') { show(); return; }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          show();
          io.disconnect();
        }
      },
      { threshold: 0.05, rootMargin: '0px 0px -32px 0px' },
    );
    io.observe(el);

    /* Jaring pengaman: bila elemen tidak pernah memasuki area pandang —
       misalnya berada di dalam panel yang tidak digulir, atau halaman
       sedang ditangkap sebagai satu gambar utuh — isi tetap harus
       terlihat. Animasi hanyalah hiasan, bukan syarat tampil. */
    const failsafe = window.setTimeout(() => { show(); io.disconnect(); }, 1400);

    return () => { io.disconnect(); window.clearTimeout(failsafe); };
  }, []);

  return (
    <div ref={ref} className={`reveal ${className}`} data-d={delay || undefined}>
      {children}
    </div>
  );
}

/* =====================================================================
   Switch — sakelar aksesibel dengan penanda ARIA yang benar.
   ===================================================================== */
export function Switch({
  checked, onChange, label, hint, id,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  hint?: string;
  id?: string;
}) {
  const btn = (
    <button
      type="button"
      id={id}
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className="sw"
      onClick={() => onChange(!checked)}
    />
  );

  if (!label) return btn;

  return (
    <div className="sw-row">
      <span style={{ minWidth: 0 }}>
        <span className="t">{label}</span>
        {hint && <span className="d">{hint}</span>}
      </span>
      {btn}
    </div>
  );
}

/* =====================================================================
   RingProgress — cincin kemajuan untuk unggahan & pemuatan.
   ===================================================================== */
export function RingProgress({
  value, size = 34, stroke = 3, color = 'var(--accent-primary)', label,
}: { value: number; size?: number; stroke?: number; color?: string; label?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, value));

  return (
    <span style={{ position: 'relative', display: 'inline-grid', placeItems: 'center', width: size, height: size }}>
      <svg className="ring-prog" width={size} height={size} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(148,163,184,0.16)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          stroke={color} strokeWidth={stroke}
          strokeDasharray={c} strokeDashoffset={c * (1 - pct / 100)}
        />
      </svg>
      {label !== undefined && (
        <span style={{ position: 'absolute', fontSize: size * 0.26, fontWeight: 600, color: 'var(--text-primary)' }}>
          {label}
        </span>
      )}
    </span>
  );
}

/* =====================================================================
   Dots — indikator "sedang bekerja" yang tidak berisik.
   ===================================================================== */
export function Dots({ className = '' }: { className?: string }) {
  return <span className={`dots ${className}`}><i /><i /><i /></span>;
}

/* =====================================================================
   Sparkline & Bar dipakai lintas halaman — tetap di ui.tsx.
   Di sini hanya grafik area kecil dengan gradien untuk kartu ringkasan.
   ===================================================================== */
export function AreaSpark({
  data, color = 'var(--accent-primary)', height = 40,
}: { data: number[]; color?: string; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => [
    (i / (data.length - 1)) * 100,
    100 - ((v - min) / span) * 84 - 8,
  ]);
  const line = pts.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
  const gid = `sp-${color.replace(/\W/g, '')}`;

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }} aria-hidden>
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.34" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,100 ${line} 100,100`} fill={`url(#${gid})`} />
      <polyline points={line} fill="none" stroke={color} strokeWidth="1.6" vectorEffect="non-scaling-stroke"
        strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={pts[pts.length - 1][0]} cy={pts[pts.length - 1][1]} r="1.8" fill={color} vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
