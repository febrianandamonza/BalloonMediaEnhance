'use client';
import React, { useCallback, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '../context';
import { LICENSE_CATALOG } from '../lib/licensing';
import { CountUp, Dots, TypeLine, Magnetic } from './fx';
import {
  ShieldCheck, ShieldAlert, Loader2, Check, Eye, EyeOff,
  User, KeyRound, ArrowRight, Lock, Radar, CircleDot,
  Globe2, ScanEye, FileBadge, WifiOff, Award,UsersRound,Boxes,Sparkles,LibraryBig
} from 'lucide-react';

/* Three.js menyentuh objek window saat dimuat, sehingga adegan 3D hanya
   boleh dirakit di peramban — bukan saat pra-render di server. */
const LoginScene3D = dynamic(() => import('./LoginScene3D'), { ssr: false });

/* Tahapan yang benar-benar dikerjakan saat sesi dibuka. */
const AUTH_STEPS = [
  'Memverifikasi kredensial',
  'Membaca berkas identitas stasiun',
  'Memvalidasi sertifikat lisensi',
  'Memuat modul terlisensi',
];

/* Kemampuan yang ditonjolkan pada kolom kiri — seluruhnya merujuk fitur
   yang memang tersedia di dalam aplikasi, bukan klaim tambahan. */
const CAPABILITIES = [
  { icon: <UsersRound size={16} />, title: 'Crowd Counting', desc: 'Crowd counting dan deteksi objek pada umpan EO/IR' },
  { icon: <Boxes size={16} />, title: 'Analytic and Object Detection', desc: 'Sistem Intelijen Geospasial Balon Tertambat dengan Kemampuan Analitik dan Deteksi Objek' },
  { icon: <Sparkles size={16} />, title: 'Digital Analytic Enhancement', desc: 'Modul Sistem Pemrosesan Peningkatan Analitik Digital' },
  { icon: <LibraryBig size={16} />, title: 'Information & Reporting', desc: 'Modul Sistem Intelijen Geospasial Balon Tambat untuk Informasi dan Pelaporan' },
];

export default function LoginPage() {
  const { loginPhase, setLoginPhase, login, t } = useApp();
  const [form, setForm] = useState({ username: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setError('');
    setSubmitting(true);

    const result = await login(form.username, form.password);

    if (!result.ok) {
      setSubmitting(false);
      setError(result.message ?? 'Kredensial tidak valid. Akses ditolak.');
      return;
    }

    /* Rangkaian transisi menuju ruang kendali. */
    setLoginPhase('authenticating');
    window.setTimeout(() => setLoginPhase('success'), 2400);
    window.setTimeout(() => setLoginPhase('transitioning'), 4000);
    window.setTimeout(() => setLoginPhase('app'), 4900);
  }, [form, login, setLoginPhase, submitting]);

  const detectCaps = (e: React.KeyboardEvent<HTMLInputElement>) => {
    setCapsLock(e.getModifierState?.('CapsLock') ?? false);
  };

  const onLoginScreen = loginPhase === 'login';

  return (
    <div className="auth-root" data-leaving={loginPhase === 'transitioning' ? '1' : '0'}>
      {/* Adegan 3D berdiri sendiri sebagai latar — tanpa lapisan aurora
          tambahan, supaya balon, kabel penambat, dan sapuan sensor
          benar-benar terbaca. */}
      <LoginScene3D phase={loginPhase} />
      <div className="auth-scrim" />

      <div className="auth-stage">
        {onLoginScreen ? (
          <div className="auth-brand">
            <span className="auth-eyebrow">
              <Award size={13} /> Badan Intelijen Negara
            </span>

            <p className="auth-kicker">{t('Ground Control Station')}</p>
            <h1 className="auth-headline">
              Tethered Balloon<br /><em>{t('GeoInt Monitoring')}</em>
            </h1>
            <p className="auth-lede">
              {t('Stasiun kendali darat untuk aerostat tertambat 180 m³ — kendali gimbal, pengolahan umpan EO/IR, dan penerbitan laporan misi.')}
            </p>

            <div className="auth-caps">
              {CAPABILITIES.map(c => (
                <div key={c.title} className="auth-cap">
                  {c.icon}
                  <span style={{ minWidth: 0 }}>
                    <b>{c.title}</b>
                    <span>{c.desc}</span>
                  </span>
                </div>
              ))}
            </div>

            {/* <div className="auth-status">
              <div>
                <span className="pulse-dot" />
                <span>
                  <span className="k">{t('Status Stasiun')}</span>
                  <span className="v">{t('SIAP OPERASI')}</span>
                </span>
              </div>
              <div>
                <span>
                  <span className="k">{t('Sertifikat Terpasang')}</span>
                  <span className="v">{LICENSE_CATALOG.length} lisensi</span>
                </span>
              </div>
              <div>
                <span>
                  <span className="k">{t('Masa Berlaku')}</span>
                  <span className="v">{t('31 Des 2027')}</span>
                </span>
              </div>
            </div> */}
          </div>
        ) : (
          /* Kolom kiri sengaja dikosongkan pada babak lanjutan supaya
             adegan 3D terlihat penuh, sementara kolom kanan tetap di
             tempatnya. */
          <div aria-hidden />
        )}

        {onLoginScreen && (
          <form onSubmit={handleSubmit} className="auth-card lq lq-thick">
            <span className="auth-mark">
              <Radar size={26} />
            </span>

            <h2>{t('Masuk ke Ruang Kendali')}</h2>
            <p className="auth-card-sub">
              {t('Setiap sesi tercatat pada jejak audit.')}
            </p>

            {error && (
              <div role="alert" className="auth-alert">
                <ShieldAlert size={15} /> {error}
              </div>
            )}

            <div className="auth-field">
              <label htmlFor="username">{t('Username Operator')}</label>
              <div className="auth-input">
                <User size={15} />
                <input
                  id="username"
                  name="username"
                  placeholder={t('gcs1')}
                  autoComplete="username"
                  autoFocus
                  spellCheck={false}
                  value={form.username}
                  onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                />
              </div>
            </div>

            <div className="auth-field">
              <label htmlFor="password">{t('Kata Sandi')}</label>
              <div className="auth-input">
                <KeyRound size={15} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  value={form.password}
                  onKeyUp={detectCaps}
                  onKeyDown={detectCaps}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                />
                <button
                  type="button"
                  className="peek"
                  onClick={() => setShowPassword(s => !s)}
                  aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                >
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {capsLock && (
                <p className="auth-hint"><Lock size={11} /> {t('Caps Lock sedang aktif')}</p>
              )}
            </div>

            <Magnetic strength={0.16}>
              <button
                type="submit"
                className="btn btn-primary auth-submit sheen"
                disabled={submitting || !form.username || !form.password}
              >
                {submitting
                  ? <><Loader2 size={16} className="spin" /> {t('Menghubungkan…')}</>
                  : <>Masuk ke Ruang Kendali <ArrowRight size={16} /></>}
              </button>
            </Magnetic>

          </form>
        )}

        {loginPhase === 'authenticating' && <AuthenticatingPanel />}
        {loginPhase === 'success' && <SuccessPanel />}
      </div>
    </div>
  );
}

/**
 * Panel tahap verifikasi. Dipisahkan sebagai komponen tersendiri agar
 * pencacah tahapan dimulai dari nol setiap kali panel dipasang — tanpa
 * perlu menyetel ulang state dari dalam effect.
 */
function AuthenticatingPanel() {
  const { t } = useApp();
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setStepIndex(i => Math.min(i + 1, AUTH_STEPS.length));
    }, 540);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="auth-panel lq lq-thick beam">
      <div className="auth-panel-head">
        <span className="auth-mark" style={{ margin: 0, width: 44, height: 44, borderRadius: 13 }}>
          <ShieldCheck size={21} />
        </span>
        <span>
          <h2>{t('Memverifikasi Akses')}</h2>
          <p>{t('Kredensial operator dan sertifikat lisensi sedang diperiksa')}</p>
        </span>
      </div>

      <div className="auth-steps">
        {AUTH_STEPS.map((step, i) => {
          const done = i < stepIndex;
          const current = i === stepIndex;
          return (
            <div key={step} className={`auth-step ${done ? 'done' : ''} ${current ? 'on' : ''}`}>
              <span className="ic">
                {done
                  ? <Check size={13} style={{ color: 'var(--success-400)' }} />
                  : current
                    ? <Loader2 size={13} className="spin" style={{ color: 'var(--accent-primary)' }} />
                    : <CircleDot size={13} style={{ opacity: 0.4 }} />}
              </span>
              {current || done ? <TypeLine text={step} speed={14} /> : step}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SuccessPanel() {
  const { account, activeLicenseIds, t } = useApp();

  return (
    <div className="auth-panel lq lq-thick">
      <div className="auth-panel-head">
        <span
          className="auth-mark"
          style={{
            margin: 0, width: 44, height: 44, borderRadius: 13,
            color: 'var(--success-400)',
            background: 'linear-gradient(140deg, rgba(52,211,153,0.2), rgba(52,211,153,0.06))',
            borderColor: 'rgba(52,211,153,0.26)',
            boxShadow: '0 0 30px rgba(52,211,153,0.18), 0 1px 0 rgba(255,255,255,0.12) inset',
            animation: 'success-pop 0.6s var(--ease-spring)',
          }}
        >
          <Check size={22} />
        </span>
        <span>
          <h2>{t('Akses Diberikan')}</h2>
          <p>Selamat bertugas, {account?.station ?? 'Operator'}</p>
        </span>
      </div>

      <div className="auth-summary">
        <div>
          <span className="k">{t('Stasiun')}</span>
          <span className="v">{account?.stationCode ?? 'GCS'}</span>
        </div>
        <div>
          <span className="k">{t('Lokasi Penempatan')}</span>
          <span className="v" style={{ fontSize: 11 }}>{account?.siteName ?? '—'}</span>
        </div>
        <div>
          <span className="k">{t('Peran')}</span>
          <span className="v" style={{ fontSize: 11 }}>{account?.role ?? '—'}</span>
        </div>
        <div>
          <span className="k">{t('Lisensi Aktif')}</span>
          <span className="v" style={{ color: 'var(--success-400)' }}>
            <CountUp to={activeLicenseIds.length} duration={800} /> / {LICENSE_CATALOG.length}
          </span>
        </div>
      </div>

      <p className="auth-foot">
        Menyiapkan Mission Dashboard <Dots />
      </p>
    </div>
  );
}
