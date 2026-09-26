'use client';
import React, { useId, useMemo, useState } from 'react';
import { LICENSE_BY_ID, FEATURE_TO_LICENSE } from '../lib/licensing';
import { useApp } from '../context';
import { Video, Radio, Signal, PowerOff } from 'lucide-react';

/* =====================================================================
   Primitif tampilan bersama untuk halaman modul.
   Menjaga bahasa visual tetap konsisten dan menghindari pengulangan gaya
   inline di setiap halaman.
   ===================================================================== */

/* ---------- Kepala halaman ---------- */
export function PageHead({
  icon, title, description, code, actions,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Penanda sub-lisensi. Dipakai hanya untuk menemukan lisensi induk —
      kodenya sendiri tidak lagi ditampilkan di antarmuka. */
  code?: string;
  actions?: React.ReactNode;
}) {
  const licenseId = code ? FEATURE_TO_LICENSE[code] : undefined;
  const def = licenseId ? LICENSE_BY_ID[licenseId] : undefined;

  return (
    <div className="page-header">
      <div style={{ minWidth: 0 }}>
        <h1 className="page-title">{icon} {title}</h1>
        <p className="page-description">{description}</p>
        {def && (
          <p style={{ fontSize: 11, color: 'var(--text-disabled)', marginTop: 5 }}>
            Lisensi induk: {def.title}
          </p>
        )}
      </div>
      {actions && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>{actions}</div>}
    </div>
  );
}

/* ---------- Keadaan luring ----------
   Dipakai modul yang bergantung pada umpan langsung ketika daya platform
   diputus. Nilai terakhir sebelum pemutusan tetap ditampilkan di bawah
   pesan, karena bagi operator angka itu masih berguna sebagai rujukan —
   yang penting jelas bahwa angkanya tidak lagi diperbarui. */
export function OfflineNotice({
  title, detail, last,
}: { title: string; detail: string; last?: [string, React.ReactNode][] }) {
  return (
    <div className="offline-panel">
      <span className="offline-panel-mark">
        <PowerOff size={22} />
      </span>
      <b>{title}</b>
      <span>{detail}</span>
      {last && last.length > 0 && (
        <div className="offline-last">
          {last.map(([k, v]) => (
            <span key={k}>
              <i>{k}</i>
              <b>{v}</b>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------- Kendali konfigurasi mandiri ----------
   Sebagian pilihan pada halaman modul belum memengaruhi perhitungan apa
   pun, tetapi tetap harus berperilaku benar: nilainya berubah saat
   dipilih dan bertahan selama halaman terbuka. Dua komponen di bawah
   menyimpan pilihannya sendiri, sehingga tidak ada lagi kolom yang
   terlihat dapat diubah padahal tidak menyimpan apa-apa. */
export function ConfigSelect({
  label, options, initial, onChange, hint,
}: {
  label: string;
  options: string[];
  initial?: string;
  onChange?: (v: string) => void;
  hint?: string;
}) {
  const { t } = useApp();
  const [value, setValue] = useState(initial ?? options[0]);
  /* Label yang hanya bersebelahan tidak terhubung ke kendalinya: pembaca
     layar akan mengumumkan "daftar pilih" tanpa nama. useId memberi
     pasangan id yang stabil antara server dan klien. */
  const id = useId();

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{t(label)}</label>
      <select
        id={id}
        className="form-select"
        value={value}
        onChange={e => { setValue(e.target.value); onChange?.(e.target.value); }}
      >
        {options.map(o => <option key={o} value={o}>{t(o)}</option>)}
      </select>
      {hint && (
        <span style={{ display: 'block', fontSize: 10.5, color: 'var(--text-muted)', marginTop: 5 }}>
          {hint}
        </span>
      )}
    </div>
  );
}

export function ConfigText({
  label, initial, type = 'text', onChange,
}: { label: string; initial: string; type?: string; onChange?: (v: string) => void }) {
  const { t } = useApp();
  const [value, setValue] = useState(initial);
  const id = useId();

  return (
    <div className="form-group">
      <label className="form-label" htmlFor={id}>{t(label)}</label>
      <input
        id={id}
        className="form-input font-mono"
        type={type}
        value={value}
        spellCheck={false}
        onChange={e => { setValue(e.target.value); onChange?.(e.target.value); }}
      />
    </div>
  );
}

export function ConfigToggle({
  label, initial = true, onChange,
}: { label: string; initial?: boolean; onChange?: (v: boolean) => void }) {
  const { t } = useApp();
  const [on, setOn] = useState(initial);

  return (
    <label className="opt-row">
      <input
        type="checkbox"
        checked={on}
        onChange={e => { setOn(e.target.checked); onChange?.(e.target.checked); }}
      />
      {t(label)}
    </label>
  );
}

/* ---------- Ubin metrik ---------- */
export function Metric({
  label, value, foot, color, icon,
}: {
  label: string;
  value: React.ReactNode;
  foot?: string;
  color?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="metric">
      <div className="metric-label">{icon}{label}</div>
      <div className="metric-value" style={color ? { color } : undefined}>{value}</div>
      {foot && <div className="metric-foot">{foot}</div>}
    </div>
  );
}

export function MetricRow({ cols = 4, children }: { cols?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: 8 }}>
      {children}
    </div>
  );
}

/* ---------- Judul seksi ---------- */
export function SectionHead({
  icon, title, sub, right,
}: {
  icon: React.ReactNode; title: string; sub?: string; right?: React.ReactNode;
}) {
  return (
    <div className="section-head">
      {icon}
      <span>{title}</span>
      {sub && <span className="sh-sub">{sub}</span>}
      {right && <span className="sh-right">{right}</span>}
    </div>
  );
}

/* ---------- Daftar kunci/nilai ---------- */
export function KVList({ rows }: { rows: [string, React.ReactNode][] }) {
  const { t } = useApp();
  return (
    <dl className="kv-list">
      {rows.map(([k, v]) => (
        <div className="kv-row" key={k}>
          <dt>{t(k)}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

/* ---------- Adegan sensor sintetis ----------
   Stasiun tidak sedang tersambung ke gimbal saat aplikasi diperagakan,
   sehingga panggung video perlu isi yang mewakili umpan sungguhan.
   Adegan berikut dilukis dalam skala abu-abu — persis seperti keluaran
   mentah sensor termal — lalu diwarnai ulang oleh filter LUT di bawah.
   Dengan begitu pilihan palet false colour benar-benar mengubah
   tampilan, bukan sekadar mengganti label. */
function hexToUnit(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
  const n = parseInt(full, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

export function SensorScene({
  seed = 'scene', palette, hotspots = 0, animate = false,
}: {
  seed?: string;
  /** Henti warna palet; tanpa ini adegan tampil dalam skala abu-abu */
  palette?: { from: string; mid?: string; to: string };
  /** Jumlah sumber panas bergerak (kendaraan / orang) */
  hotspots?: number;
  animate?: boolean;
}) {
  const uid = useId().replace(/:/g, '');

  const scene = useMemo(() => {
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 2147483647;
    if (s === 0) s = 1;
    const pool = new Array<number>(540);
    for (let i = 0; i < pool.length; i++) {
      s = (s * 16807) % 2147483647;
      pool[i] = s / 2147483647;
    }
    /* Setiap petak punya "suhu" sendiri — nilainya yang nanti dipetakan
       ke warna oleh LUT palet. Petak dibuat kecil dan banyak agar
       menyerupai citra tegak lurus, bukan kotak-kotak besar. */
    const blocks = Array.from({ length: 96 }, (_, i) => {
      const b = 4 + i * 5;
      const w = 1.6 + pool[b] * 6.4;
      const h = 1.2 + pool[b + 1] * 4.6;
      return {
        x: pool[b + 2] * (100 - w),
        y: pool[b + 3] * (100 - h),
        w, h,
        temp: 0.1 + pool[b + 4] * 0.5,
      };
    });
    const spots = Array.from({ length: hotspots }, (_, i) => ({
      x: 12 + pool[500 + i] * 74,
      y: 16 + pool[506 + i] * 66,
      r: 0.7 + pool[512 + i] * 0.7,
      delay: pool[518 + i] * 4,
    }));
    return { blocks, spots, roadY: 30 + pool[0] * 38, roadX: 24 + pool[1] * 48 };
  }, [seed, hotspots]);

  /* Tabel LUT: tiga henti palet diubah menjadi tableValues per kanal. */
  const lut = useMemo(() => {
    if (!palette) return null;
    const from = hexToUnit(palette.from);
    const to = hexToUnit(palette.to);
    const mid = palette.mid ? hexToUnit(palette.mid) : null;
    const chan = (i: number) => (mid
      ? `${from[i]} ${mid[i]} ${to[i]}`
      : `${from[i]} ${to[i]}`);
    return { r: chan(0), g: chan(1), b: chan(2) };
  }, [palette]);

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      aria-hidden
    >
      <defs>
        {lut && (
          <filter id={`lut-${uid}`} colorInterpolationFilters="sRGB">
            {/* Rata-ratakan ke luminansi, lalu petakan lewat tabel palet */}
            <feColorMatrix
              type="matrix"
              values="0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0.33 0.33 0.33 0 0  0 0 0 1 0"
            />
            <feComponentTransfer>
              <feFuncR type="table" tableValues={lut.r} />
              <feFuncG type="table" tableValues={lut.g} />
              <feFuncB type="table" tableValues={lut.b} />
            </feComponentTransfer>
          </filter>
        )}
      </defs>

      <g filter={lut ? `url(#lut-${uid})` : undefined}>
        {/* Latar tanah — bagian paling dingin */}
        <rect width="100" height="100" fill="#141414" />

        {/* Petak bangunan dengan suhu berbeda */}
        {scene.blocks.map((b, i) => (
          <rect
            key={i}
            x={b.x} y={b.y} width={b.w} height={b.h} rx="0.5"
            fill={`rgb(${Math.round(b.temp * 255)},${Math.round(b.temp * 255)},${Math.round(b.temp * 255)})`}
          />
        ))}

        {/* Ruas jalan — beraspal, menyimpan panas lebih lama */}
        <rect x="0" y={scene.roadY} width="100" height="2.4" fill="#4a4a4a" />
        <rect x={scene.roadX} y="0" width="2" height="100" fill="#454545" />

        {/* Sumber panas bergerak */}
        {scene.spots.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r={p.r} fill="#f2f2f2">
            {animate && (
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0 0; 6 -3; 2 4; 0 0"
                dur="9s"
                begin={`${p.delay}s`}
                repeatCount="indefinite"
              />
            )}
          </circle>
        ))}
      </g>
    </svg>
  );
}

/* ---------- Panggung video ----------
   Kanvas bergaya HUD taktis: bingkai sudut, garis pindai, dan indikator
   status yang berubah mengikuti keadaan pemrosesan. */
export function VideoStage({
  label, sublabel, running, overlay, aspect = '16 / 9', tone = 'var(--accent-primary)',
  scene,
}: {
  label: string;
  sublabel?: string;
  running?: boolean;
  /** Konten khusus di tengah panggung — mis. angka hasil hitung */
  overlay?: React.ReactNode;
  /** Umpan sensor sintetis yang dilukis di belakang seluruh overlay */
  scene?: React.ReactNode;
  aspect?: string;
  tone?: string;
}) {
  return (
    <div
      style={{
        position: 'relative', aspectRatio: aspect, overflow: 'hidden',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-default)',
        background:
          'radial-gradient(120% 90% at 50% 0%, rgba(30,58,95,0.35), transparent 62%), linear-gradient(160deg, #060a13, #0b1220 60%, #060a13)',
      }}
    >
      {/* Umpan sensor — dilukis paling belakang bila tersedia */}
      {scene}

      {/* Kisi latar */}
      <div
        aria-hidden
        style={{
          position: 'absolute', inset: 0, opacity: scene ? 0.16 : 0.35,
          backgroundImage:
            'linear-gradient(rgba(148,163,184,0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.055) 1px, transparent 1px)',
          backgroundSize: '38px 38px',
        }}
      />

      {/* Bingkai sudut */}
      {[
        { top: 14, left: 14, borderTop: true, borderLeft: true },
        { top: 14, right: 14, borderTop: true, borderRight: true },
        { bottom: 14, left: 14, borderBottom: true, borderLeft: true },
        { bottom: 14, right: 14, borderBottom: true, borderRight: true },
      ].map((c, i) => (
        <span
          key={i}
          aria-hidden
          style={{
            position: 'absolute', width: 22, height: 22, opacity: 0.5,
            top: c.top, left: c.left, right: c.right, bottom: c.bottom,
            borderTop: c.borderTop ? `2px solid ${tone}` : undefined,
            borderBottom: c.borderBottom ? `2px solid ${tone}` : undefined,
            borderLeft: c.borderLeft ? `2px solid ${tone}` : undefined,
            borderRight: c.borderRight ? `2px solid ${tone}` : undefined,
          }}
        />
      ))}

      {/* Garis pindai saat pemrosesan berjalan */}
      {running && (
        <span
          aria-hidden
          style={{
            position: 'absolute', left: 0, right: 0, height: 2,
            background: `linear-gradient(90deg, transparent, ${tone}, transparent)`,
            animation: 'scan-sweep 3.2s linear infinite',
            opacity: 0.55,
          }}
        />
      )}

      {/* Isi */}
      <div
        style={{
          position: 'absolute', inset: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          gap: 8, textAlign: 'center', padding: 20,
        }}
      >
        {/* Tanpa umpan, panggung menampilkan keterangan di tengah.
            Begitu ada umpan, keterangan pindah ke bawah agar gambar
            tidak tertutup. */}
        {overlay ?? (scene ? null : (
          <>
            <span
              style={{
                width: 54, height: 54, borderRadius: 16, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                background: `color-mix(in srgb, ${tone} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${tone} 22%, transparent)`,
                color: tone,
              }}
            >
              <Video size={24} />
            </span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
            {sublabel && (
              <span style={{ fontSize: 11, fontFamily: 'var(--font-code)', color: 'var(--text-disabled)' }}>
                {sublabel}
              </span>
            )}
          </>
        ))}
      </div>

      {/* Keterangan umpan — hanya saat panggung menampilkan gambar */}
      {scene && !overlay && (
        <span
          style={{
            position: 'absolute', left: 44, top: 12,
            display: 'flex', flexDirection: 'column', gap: 2,
            padding: '5px 10px', borderRadius: 'var(--radius-sm)',
            background: 'rgba(2,6,23,0.6)', backdropFilter: 'blur(8px)',
            border: '1px solid rgba(148,163,184,0.14)',
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</span>
          {sublabel && (
            <span style={{ fontSize: 9.5, fontFamily: 'var(--font-code)', color: 'var(--text-disabled)' }}>
              {sublabel}
            </span>
          )}
        </span>
      )}

      {/* Indikator status */}
      <span
        style={{
          position: 'absolute', top: 12, right: 12,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 999,
          background: 'rgba(2,6,23,0.66)',
          border: `1px solid ${running ? 'rgba(52,211,153,0.3)' : 'rgba(148,163,184,0.16)'}`,
          fontSize: 10, fontFamily: 'var(--font-code)', fontWeight: 700, letterSpacing: 0.6,
          color: running ? 'var(--success-400)' : 'var(--text-disabled)',
        }}
      >
        <span
          style={{
            width: 6, height: 6, borderRadius: '50%',
            background: running ? 'var(--success-400)' : 'var(--text-disabled)',
            animation: running ? 'pulse 1.2s ease-in-out infinite' : undefined,
          }}
        />
        {running ? 'PROCESSING' : 'STANDBY'}
      </span>

      {/* Sumber sinyal */}
      <span
        style={{
          position: 'absolute', bottom: 12, left: 12,
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 10, fontFamily: 'var(--font-code)', color: 'rgba(148,163,184,0.75)',
        }}
      >
        <Radio size={11} /> EPSILON 140Z G2
        <Signal size={11} style={{ marginLeft: 6 }} /> RTSP 1080p
      </span>
    </div>
  );
}

/* ---------- Bilah nilai ---------- */
export function Bar({
  label, value, max = 100, unit = '%', color = 'var(--accent-primary)', foot,
}: {
  label: string; value: number; max?: number; unit?: string; color?: string; foot?: string;
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{label}</span>
        <span style={{ fontSize: 12.5, fontFamily: 'var(--font-code)', fontWeight: 700, color }}>
          {value}{unit}
        </span>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(148,163,184,0.12)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 999, background: color, transition: 'width 0.4s var(--ease-out)' }} />
      </div>
      {foot && <div style={{ fontSize: 10.5, color: 'var(--text-disabled)', marginTop: 4 }}>{foot}</div>}
    </div>
  );
}

/* ---------- Grafik sparkline sederhana (SVG, tanpa pustaka luar) ---------- */
export function Sparkline({
  data, color = 'var(--accent-primary)', height = 64, label, unit = '',
}: {
  data: number[]; color?: string; height?: number; label?: string; unit?: string;
}) {
  const w = 100;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const span = max - min || 1;
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = 100 - ((v - min) / span) * 88 - 6;
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return (
    <div>
      {label && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
          <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>{label}</span>
          <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', fontWeight: 700, color }}>
            {data[data.length - 1]}{unit}
          </span>
        </div>
      )}
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height, display: 'block' }} aria-hidden>
        <polyline
          points={`0,100 ${pts.join(' ')} 100,100`}
          fill={`color-mix(in srgb, ${color} 12%, transparent)`}
          stroke="none"
        />
        <polyline
          points={pts.join(' ')}
          fill="none"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    </div>
  );
}

/* ---------- Keadaan kosong ---------- */
export function EmptyState({
  icon, title, description, action,
}: {
  icon: React.ReactNode; title: string; description: string; action?: React.ReactNode;
}) {
  return (
    <div className="empty-state">
      <span className="empty-state-ico">{icon}</span>
      <h4>{title}</h4>
      <p>{description}</p>
      {action}
    </div>
  );
}

/* ---------- Kontrol tersegmentasi ---------- */
export function Segmented<T extends string>({
  value, options, onChange, full,
}: {
  value: T;
  options: { id: T; label: string; icon?: React.ReactNode }[];
  onChange: (v: T) => void;
  full?: boolean;
}) {
  return (
    <div className="seg" style={full ? { width: '100%' } : undefined}>
      {options.map(o => (
        <button
          key={o.id}
          className={value === o.id ? 'on' : ''}
          onClick={() => onChange(o.id)}
          style={full ? { flex: 1, justifyContent: 'center' } : undefined}
        >
          {o.icon}{o.label}
        </button>
      ))}
    </div>
  );
}
