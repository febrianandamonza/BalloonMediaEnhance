'use client';
import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import {
  LICENSE_CATALOG, LICENSE_BY_ID, daysUntilExpiry,
  normalizeKey, type LicenseDef, type LicenseId,
} from '../lib/licensing';
import type { UserLicenseRecord } from '../services/api';
import { Reveal } from '../components/fx';
import {
  KeyRound, ShieldCheck, ShieldAlert, Lock, Unlock, X, Loader2,
  Info, AlertTriangle, CalendarClock, Hash, Layers, BadgeCheck,
  Building2, ScanSearch, Wand2, FileBarChart2, UsersRound,
} from 'lucide-react';

/* Warna aksen per lisensi — konsisten dengan penanda pada sertifikat. */
const ACCENT: Record<LicenseId, string> = {
  CC: 'var(--accent-emerald)',
  AODGIS: 'var(--accent-primary)',
  DAEP: 'var(--accent-secondary)',
  IRGIS: 'var(--accent-tertiary)',
};

const LIC_ICON: Record<LicenseId, React.ReactNode> = {
  CC: <UsersRound size={19} />,
  AODGIS: <ScanSearch size={19} />,
  DAEP: <Wand2 size={19} />,
  IRGIS: <FileBarChart2 size={19} />,
};

const LICENSEE = 'Badan Intelijen Negara';
const LICENSOR = 'TAB Integrated Systems Pte Ltd';
// sortLicenses()

export default function LicensePage() {
  const { licenses, activeLicenseIds, activateLicense, deactivateLicense, account, pushToast, t } = useApp();

  const [target, setTarget] = useState<LicenseDef | null>(null);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [userLicenseData, setUserLicenseData] = useState<UserLicenseRecord | null>(null);



  const activeCount = activeLicenseIds.length;
  const totalCount = LICENSE_CATALOG.length;
  // console.log(LICENSE_CATALOG)

  /* Lisensi terdekat kedaluwarsa — dipakai pada kartu ringkasan. Dihitung
     ulang setiap render (bukan useMemo ber-deps kosong) karena
     refreshLicenseCatalog memutasi objek LICENSE_CATALOG di tempat —
     array-nya sendiri tidak pernah berganti referensi, jadi useMemo([])
     akan membeku di nilai pertama dan tidak pernah terbarui. */
  const nearestExpiry = Math.min(...LICENSE_CATALOG.map(d => daysUntilExpiry(d)));

  const openActivation = (def: LicenseDef) => {
    setTarget(def);
    setKeyInput('');
    setError('');
  };

  const closeActivation = () => {
    if (busy) return;
    setTarget(null);
    setError('');
  };

  const submitActivation = (issuedDate: string, expiredDate: string) => {
    if (!target || busy) return;
    setError('');
    setBusy(true);

    /* Jeda singkat mensimulasikan verifikasi kunci terhadap
       hardware fingerprint stasiun sebelum status diubah. */
    window.setTimeout(async () => {
      const result = await activateLicense(target.id, keyInput, issuedDate, expiredDate);
      setBusy(false);

      if (!result.ok) {
        setError(result.message);
        return;
      }

      pushToast({
        tone: 'success',
        title: `${target.shortTitle} — ACTIVE`,
        detail: `Diaktivasi dengan S/N ${result.serialNumber}. Seluruh fitur dalam lisensi ini telah terbuka.`,
      });
      setTarget(null);
      setKeyInput('');
    }, 900);
  };

  const handleDeactivate = (def: LicenseDef) => {
    deactivateLicense(def.id);
    pushToast({
      tone: 'warning',
      title: `${def.shortTitle} — LOCKED`,
      detail: 'Fitur dalam lisensi ini dikunci. Masukkan kembali license key untuk mengaktifkan.',
    });
  };

  return (
    <div className="animate-fade-in">
      {/* ===== Header ===== */}
      <div className="page-header">
        <div>
          <h1 className="page-title"><KeyRound size={22} /> {t('License Manager')}</h1>
          <p className="page-description">
            Tethered Balloon Geospatial Intelligence System — status lisensi komersial
            dan modul yang diterbitkan untuk stasiun {account?.stationCode ?? 'GCS'}.
          </p>
        </div>
      </div>

      {/* ===== Ringkasan ===== */}
      <div className="lic-summary">
        <SummaryTile
          icon={<Building2 size={19} />}
          accent="var(--accent-primary)"
          label={t('Licensee')}
          value={LICENSEE}
          small
        />
        <SummaryTile
          icon={<BadgeCheck size={19} />}
          accent="var(--accent-emerald)"
          label={t('Lisensi Aktif')}
          value={`${activeCount} / ${totalCount}`}
        />
        <SummaryTile
          icon={<Layers size={19} />}
          accent="var(--accent-secondary)"
          label={t('Fitur Terbuka')}
          value={String(
            LICENSE_CATALOG
              .filter(d => licenses[d.id]?.active)
              .reduce((n, d) => n + d.features.length, 0),
          )}
        />
        <SummaryTile
          icon={<CalendarClock size={19} />}
          accent={nearestExpiry < 90 ? 'var(--warning-400)' : 'var(--accent-tertiary)'}
          label={t('Berakhir Dalam')}
          value={`${nearestExpiry} hari`}
        />
      </div>

      {/* ===== Kartu lisensi ===== */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {LICENSE_CATALOG.map((def, i) => (
          <Reveal key={def.id} delay={Math.min(i, 3) as 0 | 1 | 2 | 3}>
            <LicenseCard
              def={def}
              active={licenses[def.id]?.active ?? false}
              serialNumber={licenses[def.id]?.serialNumber ?? ''}
              hasCertificate={licenses[def.id]?.hasCertificate ?? false}
              onActivate={() => openActivation(def)}
              onDeactivate={() => handleDeactivate(def)}
            />
          </Reveal>
        ))}
      </div>

      {/* ===== Catatan lisensi ===== */}
      <div className="key-hint" style={{ marginTop: 20 }}>
        <Info size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-primary)' }} />
        <span>
          Lisensi ini bersifat <b>{t('non-transferable')}</b> dan tunduk pada syarat serta ketentuan
          yang disepakati kedua belah pihak. Seluruh sertifikat diterbitkan oleh {LICENSOR}{' '}
          dan berlaku sampai 31 Desember 2027.
        </span>
      </div>

      {/* ===== Modal aktivasi ===== */}
      {target && (
        <ActivationModal
          def={target}
          value={keyInput}
          error={error}
          busy={busy}
          onChange={v => { setKeyInput(v); if (error) setError(''); }}
          onClose={closeActivation}
          onSubmit={submitActivation}
        />
      )}
    </div>
  );
}

/* ===================================================================
   Kartu ringkasan
   =================================================================== */
function SummaryTile({
  icon, accent, label, value, small,
}: {
  icon: React.ReactNode; accent: string; label: string; value: string; small?: boolean;
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
        <span
          className="val"
          style={small ? { fontSize: 13, fontFamily: 'var(--font-sans)', fontWeight: 700 } : undefined}
        >
          {value}
        </span>
      </span>
    </div>
  );
}

/* ===================================================================
   Segel sertifikat — stempel emas bergerigi dengan monogram penerbit.
   Digambar sebagai SVG agar tajam pada resolusi berapa pun dan tidak
   memerlukan berkas gambar terpisah.
   =================================================================== */
function CertificateSeal({ kind }: { kind: LicenseDef['kind'] }) {
  const teeth = Array.from({ length: 48 }, (_, i) => i * 7.5);

  return (
    <svg className="lic-seal" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <linearGradient id="seal-foil" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8a6d28" />
          <stop offset="28%" stopColor="#f3e3ac" />
          <stop offset="52%" stopColor="#c8a951" />
          <stop offset="76%" stopColor="#f6ecc4" />
          <stop offset="100%" stopColor="#9c7a2e" />
        </linearGradient>
      </defs>

      {/* Gerigi tepi stempel */}
      <g className="ring" stroke="url(#seal-foil)" strokeWidth="1.1" opacity="0.85">
        {teeth.map(a => (
          <line
            key={a}
            x1={50 + 44 * Math.cos((a * Math.PI) / 180)}
            y1={50 + 44 * Math.sin((a * Math.PI) / 180)}
            x2={50 + 48 * Math.cos((a * Math.PI) / 180)}
            y2={50 + 48 * Math.sin((a * Math.PI) / 180)}
          />
        ))}
      </g>

      <circle cx="50" cy="50" r="42" fill="none" stroke="url(#seal-foil)" strokeWidth="1.6" opacity="0.9" />
      <circle cx="50" cy="50" r="36" fill="none" stroke="url(#seal-foil)" strokeWidth="0.7" opacity="0.6" />

      <text
        x="50" y="46" textAnchor="middle"
        fontFamily="var(--font-heading)" fontSize="17" fontWeight="700"
        fill="url(#seal-foil)" letterSpacing="1"
      >
        TAB
      </text>
      <text
        x="50" y="58" textAnchor="middle"
        fontFamily="var(--font-code)" fontSize="6.6" fill="url(#seal-foil)"
        letterSpacing="0.6" opacity="0.92"
      >
        {kind === 'license' ? 'SOFTWARE' : 'MODULE'}
      </text>
      <text
        x="50" y="67" textAnchor="middle"
        fontFamily="var(--font-code)" fontSize="5.4" fill="url(#seal-foil)"
        letterSpacing="1.2" opacity="0.7"
      >
        LICENSE
      </text>
    </svg>
  );
}

/* ===================================================================
   Kartu lisensi — satu kartu per sertifikat yang diterbitkan
   =================================================================== */
function LicenseCard({
  def, active, serialNumber, hasCertificate, onActivate, onDeactivate,
}: {
  def: LicenseDef;
  active: boolean;
  serialNumber: string;
  hasCertificate: boolean;
  onActivate: () => void;
  onDeactivate: () => void;
}) {
  const { t } = useApp();
  const accent = ACCENT[def.id];
  const remaining = daysUntilExpiry(def);
  const expiringSoon = remaining < 90;

  return (
    <article
      className={`lic-card ${active ? 'is-active' : 'is-locked'}`}
      style={{ ['--lic-accent' as string]: accent }}
    >
      <CertificateSeal kind={def.kind} />
      <div className="lic-card-inner">
        {/* Kepala kartu */}
        <div className="lic-head">
          <span
            style={{
              width: 46, height: 46, borderRadius: 12, flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: `color-mix(in srgb, ${accent} 13%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 26%, transparent)`,
              color: accent,
            }}
          >
            {LIC_ICON[def.id]}
          </span>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="lic-kind">
              Certificate · {def.kind === 'license' ? 'Software License' : 'Module License'}
            </div>
            <h2 className="lic-title">{def.title}</h2>
          </div>

          <span className={`lic-status ${active ? 'on' : 'off'}`}>
            {active ? <ShieldCheck size={12} /> : <ShieldAlert size={12} />}
            {active ? 'ACTIVE' : 'LOCKED'}
          </span>
        </div>

        <div className="lic-rule" />

        {/* Data wajib: S/N dan expiry date */}
        <dl className="lic-meta">
          <div>
            <dt><Hash size={9} style={{ verticalAlign: -1 }} /> {t('License Number (S/N)')}</dt>
            <dd className={active ? '' : 'dim'}>
              {active ? serialNumber || def.serialNumbers[0] : 'BELUM DIAKTIVASI'}
            </dd>
          </div>
          <div>
            <dt><CalendarClock size={9} style={{ verticalAlign: -1 }} /> {t('Expiry Date')}</dt>
            <dd
              className={hasCertificate ? '' : 'dim'}
              style={hasCertificate && expiringSoon ? { color: 'var(--warning-400)' } : undefined}
            >
              {hasCertificate ? def.expiryDate : 'BELUM DIAKTIVASI'}
            </dd>
          </div>
          <div>
            <dt><Building2 size={9} style={{ verticalAlign: -1 }} /> {t('Licensee')}</dt>
            <dd style={{ fontFamily: 'var(--font-sans)', fontWeight: 650, wordBreak: 'normal' }}>
              {LICENSEE}
            </dd>
          </div>
        </dl>

        {/* Fitur yang dibuka lisensi ini */}
        <div className="lic-features">
          {def.features.map(f => (
            <div key={f.code} className="lic-feature">
              <span className="fdot" aria-hidden />
              <span style={{ minWidth: 0 }}>
                <span className="fname">{f.name}</span>
                <span className="fdesc">{f.description}</span>
              </span>
            </div>
          ))}
        </div>

        {/* Aksi */}
        <div className="lic-actions">
          {active ? (
            <>
              {/* <button className="btn btn-secondary btn-sm" onClick={onDeactivate}>
                <Lock size={13} /> Nonaktifkan Lisensi
              </button> */}
              <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                {def.features.length} fitur aktif · berlaku {remaining} hari lagi
              </span>
            </>
          ) : (
            <>
              <button className="btn btn-primary btn-sm" onClick={onActivate}>
                <Unlock size={13} /> Aktivasi License Key
              </button>
              <span style={{ fontSize: 11.5, color: 'var(--danger-400)' }}>
                {def.features.length} fitur terkunci — masukkan license key dari sertifikat
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}

/* ===================================================================
   Modal aktivasi
   =================================================================== */
function ActivationModal({
  def, value, error, busy, onChange, onClose, onSubmit,
}: {
  def: LicenseDef;
  value: string;
  error: string;
  busy: boolean;
  onChange: (v: string) => void;
  onClose: () => void;
  onSubmit: (issuedDate: string, expiredDate: string) => void;
}) {
  const { t } = useApp();
  const accent = ACCENT[def.id];
  const [issuedDate, setIssuedDate] = useState('');
  const [expiredDate, setExpiredDate] = useState('');
  const ready = normalizeKey(value).length >= 12 && !!issuedDate && !!expiredDate;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <div style={{ minWidth: 0 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <KeyRound size={17} style={{ color: accent }} /> Aktivasi Lisensi
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 5, lineHeight: 1.5 }}>
              {def.title}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }} aria-label="Tutup">
            <X size={17} />
          </button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label" htmlFor="lic-key">
              {t('License Number — sesuai sertifikat')}
            </label>
            <input
              id="lic-key"
              className="form-input key-input"
              placeholder={t('TAB-XXXX-2026-000-XXXXXX')}
              value={value}
              autoFocus
              spellCheck={false}
              onChange={e => onChange(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && ready && !busy) onSubmit(issuedDate, expiredDate); }}
            />
          </div>
          <div className="row">
            <div className="col-6">
              <div className="form-group">
                <label className="form-label" htmlFor="lic-issued">
                  {t('Issued Date')}
                </label>
                <input
                  id="lic-issued"
                  type="date"
                  className="form-input key-input"
                  value={issuedDate}
                  onChange={e => {
                    setIssuedDate(e.target.value);
                    setExpiredDate('');
                  }}
                />
              </div>
            </div>
            <div className="col-6">
              <div className="form-group">
                <label className="form-label" htmlFor="lic-expired">
                  {t('Expired Date')}
                </label>
                <input
                  id="lic-expired"
                  type="date"
                  className="form-input key-input"
                  value={expiredDate}
                  disabled={!issuedDate}
                  min={issuedDate ? (() => {
                    const d = new Date(issuedDate);
                    d.setDate(d.getDate() + 1);
                    return d.toISOString().split('T')[0];
                  })() : undefined}
                  onChange={e => setExpiredDate(e.target.value)}
                />
              </div>
            </div>
          </div>

          {error ? (
            <div className="key-error">
              <AlertTriangle size={15} style={{ flexShrink: 0, marginTop: 1 }} />
              <span>{error}</span>
            </div>
          ) : (
            <div className="key-hint">
              <Info size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-primary)' }} />
              <span>
                Masukkan <b>{t('License Number')}</b> yang tercetak pada sertifikat{' '}
                {def.kind === 'license' ? 'Software License' : 'Module License'} yang
                diterbitkan {LICENSOR}. Kunci diverifikasi terhadap hardware fingerprint stasiun
                sebelum lisensi diaktifkan.
              </span>
            </div>
          )}

          <div style={{ marginTop: 14 }}>
            <div style={{
              fontSize: 9, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase',
              color: 'var(--text-muted)', marginBottom: 7,
            }}>
              {t('Fitur yang akan terbuka')}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
              {def.features.map(f => (
                <span
                  key={f.code}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    fontSize: 11, padding: '4px 9px', borderRadius: 999,
                    background: 'rgba(148,163,184,0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <span style={{ width: 5, height: 5, borderRadius: '50%', background: accent, flexShrink: 0 }} />
                  {f.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={busy}>{t('Batal')}</button>
          <button
            className="btn btn-primary"
            onClick={() => onSubmit(issuedDate, expiredDate)}
            disabled={!ready || busy}
            style={{ gap: 6, minWidth: 150, justifyContent: 'center' }}
          >
            {busy
              ? <><Loader2 size={14} className="spin" /> {t('Memverifikasi…')}</>
              : <><ShieldCheck size={14} /> {t('Aktivasi Lisensi')}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

/* Diekspor agar halaman lain dapat menautkan nama resmi lisensi. */
export { LICENSE_BY_ID };
