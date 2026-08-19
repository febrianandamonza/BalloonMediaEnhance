'use client';
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import { SectionHead, KVList, Sparkline, Metric, MetricRow } from '../components/ui';
import { LICENSE_CATALOG, LICENSE_BY_ID, daysUntilExpiry, type LicenseId } from '../lib/licensing';
import { CountUp, Reveal, SpotlightCard, AreaSpark, Magnetic } from '../components/fx';
import {
  Radar, Radio, Timer, HeartPulse, BellRing, KeyRound, ShieldCheck, ShieldAlert,
  UsersRound, ScanSearch, Map, PlaneTakeoff, Anchor, FlaskConical, FileBarChart2,
  MonitorPlay, Wand2, Cable, ArrowUpRight, Activity, Gauge, Wind, Waves,
  Thermometer, Cpu, AlertTriangle, Info, CircleDot,
} from 'lucide-react';

/* Three.js menyentuh objek window saat dimuat, sehingga bola dunia hanya
   boleh dirakit di peramban — bukan saat pra-render di server. */
const Globe3D = dynamic(() => import('../components/Globe3D'), {
  ssr: false,
  loading: () => <div style={{ width: '100%', height: '100%' }} />,
});

/* Deret deterministik agar render awal server dan klien identik. */
function series(seed: number, len: number, base: number, spread: number, digits = 0) {
  let s = seed;
  const out: number[] = [];
  for (let i = 0; i < len; i++) {
    s = (s * 16807) % 2147483647;
    out.push(Number((base + ((s / 2147483647) - 0.5) * spread).toFixed(digits)));
  }
  return out;
}

function LiveClock() {
  const [t, setT] = useState('');
  useEffect(() => {
    const tick = () => setT(new Date().toLocaleTimeString('id-ID', {
      hour12: false, timeZone: 'Asia/Jakarta',
    }));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="font-mono">{t || '--:--:--'}</span>;
}

const LIC_ICON: Record<LicenseId, React.ReactNode> = {
  CC: <UsersRound size={15} />,
  AODGIS: <ScanSearch size={15} />,
  DAEP: <Wand2 size={15} />,
  IRGIS: <FileBarChart2 size={15} />,
};

const QUICK_ACTIONS: {
  page: string; label: string; icon: React.ReactNode; lic: LicenseId | null;
}[] = [
  { page: 'crowd', label: 'Crowd Counting', icon: <UsersRound size={17} />, lic: 'CC' },
  { page: 'detection-video', label: 'Video Analytic', icon: <ScanSearch size={17} />, lic: 'AODGIS' },
  { page: 'enhance-video', label: 'Video Enhancement', icon: <Wand2 size={17} />, lic: 'DAEP' },
  { page: 'geo-viz', label: 'GeoInt Visualisation', icon: <Map size={17} />, lic: 'IRGIS' },
  { page: 'flight-info', label: 'Flight Information', icon: <PlaneTakeoff size={17} />, lic: 'IRGIS' },
  { page: 'mooring', label: 'Mooring Availability', icon: <Anchor size={17} />, lic: 'IRGIS' },
  { page: 'simulation', label: 'Flight Simulation', icon: <FlaskConical size={17} />, lic: 'IRGIS' },
  { page: 'media-source', label: 'Surveillance Media', icon: <MonitorPlay size={17} />, lic: null },
];

export default function DashboardPage() {
  const { setCurrentPage, account, licenses, activeLicenseIds, isLicenseActive, offline, t } = useApp();

  /* Saat daya platform diputus, seluruh pembacaan langsung berhenti
     diperbarui. Nilainya diganti tanda pisah agar tidak ada angka lama
     yang tampak seolah masih hidup. */
  const live = (v: string) => (offline ? '—' : v);

  const uptime = useMemo(() => series(3, 30, 99.6, 0.6, 1), []);
  const detections = useMemo(() => series(17, 30, 142, 70, 0), []);
  const density = useMemo(() => series(29, 30, 340, 180, 0), []);
  const gpu = useMemo(() => series(41, 30, 72, 24, 0), []);

  const activeCount = activeLicenseIds.length;
  const openModules = LICENSE_CATALOG
    .filter(d => licenses[d.id]?.active)
    .reduce((n, d) => n + d.features.length, 0);
  const totalModules = LICENSE_CATALOG.reduce((n, d) => n + d.features.length, 0);
  const nearestExpiry = Math.min(...LICENSE_CATALOG.map(d => daysUntilExpiry(d)));

  return (
    <div className="page-in">
      {/* ===== Hero =====
          Lapisan gradien dan butiran dipasang langsung sebagai anak agar
          tidak menambah wadah baru yang merusak kisi dua kolom. */}
      <div className="grainient dash-hero">
        <div className="gr-mesh" aria-hidden />
        <div className="gr-grain" aria-hidden />

        <div className="dash-hero-globe">
          <Globe3D />
        </div>
        <span className="dash-hero-fade" aria-hidden />

        <div className="dash-hero-body">
          <span className="dash-hero-eyebrow">
            <CircleDot size={10} /> {account?.stationCode ?? 'GCS'} · {account?.siteName ?? 'Stasiun Lapangan'}
          </span>
          <h1 className="dash-hero-title">{t('Mission Dashboard')}</h1>
          <p className="dash-hero-sub">
            {t('Pengawasan udara tertambat dengan pemrosesan analitik sepenuhnya lokal — seluruh umpan, model, dan arsip tetap berada di dalam stasiun.')}
          </p>

          <div className="dash-hero-stats">
            <span>
              <b><LiveClock /></b>
              <i>{t('Waktu Misi (WIB)')}</i>
            </span>
            <span>
              <b style={{ color: offline ? 'var(--danger-400)' : 'var(--success-400)' }}>
                {offline ? t('OFFLINE') : t('OPERATIONAL')}
              </b>
              <i>{t('Status Sistem')}</i>
            </span>
            <span>
              <b>{offline ? '—' : <CountUp to={450} suffix=" m" />}</b>
              <i>{t('Ketinggian Balon')}</i>
            </span>
            <span>
              <b>{offline ? '—' : <CountUp to={107} suffix=" mnt" />}</b>
              <i>{t('Durasi Misi #25')}</i>
            </span>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <Magnetic strength={0.2}>
              <button className="btn btn-primary sheen" onClick={() => setCurrentPage('crowd')}>
                <UsersRound size={15} /> Mulai Pengawasan
              </button>
            </Magnetic>
            <button className="btn btn-glass" onClick={() => setCurrentPage('licenses')}>
              <KeyRound size={15} /> License Manager
            </button>
          </div>
        </div>
      </div>

      {/* ===== Kartu statistik ===== */}
      <div className="dash-stats">
        <StatCard
          icon={<Radar size={20} />} accent="var(--accent-emerald)" delay={0}
          label={t('Ketersediaan Sistem')} value={offline ? '—' : <CountUp to={99.7} decimals={1} suffix="%" />}
          sub={t('42 hari 7 jam tanpa henti')} data={uptime} />
        <StatCard
          icon={<ScanSearch size={20} />} accent="var(--accent-primary)" delay={1}
          label={t('Deteksi Hari Ini')} value={offline ? '—' : <CountUp to={1284} />}
          sub={t('objek terlacak sejak 00:00')} data={detections} />
        <StatCard
          icon={<UsersRound size={20} />} accent="var(--accent-cyan)" delay={2}
          label={t('Kepadatan Zona A')} value={offline ? '—' : <CountUp to={342} />}
          sub={t('estimasi jiwa · puncak 512')} data={density} />
        <StatCard
          icon={<Cpu size={20} />} accent="var(--accent-amber)" delay={3}
          label={t('Utilisasi GPU')} value={offline ? '—' : <CountUp to={78} suffix="%" />}
          sub={t('inferensi 23 ms per bingkai')} data={gpu} />
      </div>

      {/* ===== Konten utama ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 350px', gap: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status lisensi */}
          <GlassCard tilt={false}>
            <SectionHead
              icon={<KeyRound size={15} />}
              title={t('Status Lisensi')}
              sub={`${activeCount} dari ${LICENSE_CATALOG.length} lisensi aktif · ${openModules}/${totalModules} fitur terbuka`}
              right={
                <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('licenses')}>
                  Kelola <ArrowUpRight size={12} />
                </button>
              }
            />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
              {LICENSE_CATALOG.map(def => {
                const on = isLicenseActive(def.id);
                return (
                  <button
                    key={def.id}
                    onClick={() => setCurrentPage('licenses')}
                    className={`select-card ${on ? 'on' : ''}`}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: on ? 'var(--accent-primary)' : 'var(--text-muted)' }}>
                        {LIC_ICON[def.id]}
                        <span className="sc-title" style={{ margin: 0 }}>{def.shortTitle}</span>
                      </span>
                      <span className={`lic-status ${on ? 'on' : 'off'}`} style={{ fontSize: 9, padding: '3px 8px' }}>
                        {on ? <ShieldCheck size={10} /> : <ShieldAlert size={10} />}
                        {on ? 'ACTIVE' : 'LOCKED'}
                      </span>
                    </span>
                    <span className="sc-foot" style={{ fontFamily: 'var(--font-code)' }}>
                      {on ? licenses[def.id].serialNumber : `${def.features.length} fitur terkunci`}
                    </span>
                    <span className="sc-foot">Berlaku s.d. {def.expiryDate}</span>
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Aksi cepat */}
          <GlassCard tilt={false}>
            <SectionHead icon={<Activity size={15} />} title={t('Akses Cepat Modul')} sub={t('Modul terkunci membuka halaman aktivasi lisensi')} />
            <div className="quick-grid">
              {QUICK_ACTIONS.map(a => {
                const locked = a.lic !== null && !isLicenseActive(a.lic);
                return (
                  <button
                    key={a.page}
                    className={`quick-tile ${locked ? 'locked' : ''}`}
                    onClick={() => setCurrentPage(locked ? 'licenses' : a.page)}
                    title={locked ? 'Lisensi belum aktif — buka License Manager' : a.label}
                  >
                    <span className="qt-ico">{a.icon}</span>
                    <span style={{ minWidth: 0 }}>
                      <span className="qt-label">{a.label}</span>
                      <span className="qt-code">{a.lic ? LICENSE_BY_ID[a.lic].shortTitle : 'Platform'}</span>
                    </span>
                    {locked && <span className="qt-lock">{t('TERKUNCI')}</span>}
                  </button>
                );
              })}
            </div>
          </GlassCard>

          {/* Telemetri platform */}
          <GlassCard tilt={false}>
            <SectionHead icon={<Gauge size={15} />} title={t('Telemetri Platform')} sub={offline ? t('Data terakhir sebelum pemutusan') : "Pembacaan terkini dari balon dan stasiun penambat"} />
            <MetricRow cols={4}>
              <Metric icon={<Wind size={11} />} label={t('Angin')} value={live("14 km/h")} color="var(--accent-cyan)" foot={t('Barat Laut · aman')} />
              <Metric icon={<Waves size={11} />} label={t('Helium')} value={live("165 bar")} color="var(--accent-primary)" foot={t('rentang 150–180')} />
              <Metric icon={<Gauge size={11} />} label={t('Tarik Kabel')} value={live("1.240 N")} color="var(--accent-amber)" foot={t('dari 4.500 N')} />
              <Metric icon={<Thermometer size={11} />} label={t('Suhu Ambien')} value={live("29,4 °C")} color="var(--accent-emerald)" foot={t('stasiun darat')} />
              <Metric icon={<Radio size={11} />} label={t('SNR Optik')} value={live("42,6 dB")} color="var(--accent-secondary)" foot="ambang > 40 dB" />
              <Metric icon={<HeartPulse size={11} />} label={t('Tegangan')} value={live("229,6 V")} color="var(--accent-emerald)" foot={t('230 VAC ±5%')} />
              <Metric icon={<Cable size={11} />} label={t('Kabel Terulur')} value={live("450 m")} foot={t('dari 600 m')} />
              <Metric icon={<Timer size={11} />} label={t('Jam Terbang')} value="904 j" foot={t('akumulasi platform')} />
            </MetricRow>
          </GlassCard>
        </div>

        {/* Kolom kanan */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <GlassCard tilt={false}>
            <SectionHead
              icon={<BellRing size={15} />}
              title={t('Peringatan Terkini')}
              right={
                <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('alerts')}>
                  Semua <ArrowUpRight size={12} />
                </button>
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {[
                { sev: 'peringatan', t: '11:48', msg: 'Hembusan angin 31 km/h mendekati batas aman', src: 'Anemometer GCS-02' },
                { sev: 'kritis', t: '10:52', msg: 'Objek tidak dikenal memasuki geofence barat laut', src: 'Video Analytic' },
                { sev: 'peringatan', t: '10:14', msg: 'Resistansi isolasi kabel turun ke 112 MΩ', src: 'Tether Monitor' },
                { sev: 'peringatan', t: '09:36', msg: 'Kepadatan Zona A melewati ambang 500 jiwa', src: 'Crowd Counting' },
                { sev: 'informasi', t: '08:41', msg: 'Tekanan helium turun di bawah 155 bar', src: 'Mooring Monitor' },
              ].map((a, i) => {
                const color = a.sev === 'kritis' ? 'var(--danger-400)'
                  : a.sev === 'peringatan' ? 'var(--warning-400)' : 'var(--info-400)';
                const Icon = a.sev === 'kritis' ? ShieldAlert : a.sev === 'peringatan' ? AlertTriangle : Info;
                return (
                  <div key={i} className="alert-row" style={{ ['--al' as string]: color }}>
                    <Icon size={14} style={{ color, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ minWidth: 0 }}>
                      <span className="ar-msg">{a.msg}</span>
                      <span className="ar-meta">{a.t} WIB · {a.src}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<Radar size={15} />} title={t('Ringkasan Stasiun')} />
            <KVList rows={[
              ['Stasiun', account?.station ?? '—'],
              ['Kode', account?.stationCode ?? '—'],
              ['Lokasi', account?.siteName ?? '—'],
              ['Koordinat', account ? `${account.siteCoords.lat.toFixed(4)}, ${account.siteCoords.lon.toFixed(4)}` : '—'],
              ['Payload', 'Epsilon 140Z G2'],
              ['Platform', 'Aerostat 180 m³'],
              ['Mode Data', 'Offline (Zero Cloud)'],
              ['Lisensi Berakhir', `${nearestExpiry} hari lagi`],
            ]} />
          </GlassCard>

          <GlassCard tilt={false}>
            <SectionHead icon={<Activity size={15} />} title={t('Beban Pemrosesan')} sub={t('30 pembacaan terakhir')} />
            <Sparkline data={gpu} color="var(--accent-amber)" height={70} label={t('Utilisasi GPU')} unit="%" />
            <div style={{ height: 10 }} />
            <Sparkline data={detections} color="var(--accent-primary)" height={70} label={t('Deteksi per menit')} unit="" />
          </GlassCard>
        </div>
      </div>
    </div>
  );
}

/* =================================================================== */
function StatCard({
  icon, accent, label, value, sub, data, delay = 0,
}: {
  icon: React.ReactNode; accent: string; label: string;
  value: React.ReactNode; sub: string; data: number[];
  delay?: 0 | 1 | 2 | 3;
}) {
  return (
    <Reveal delay={delay}>
      <SpotlightCard edge className="dash-stat">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <span
            className="ds-ico"
            style={{
              background: `color-mix(in srgb, ${accent} 13%, transparent)`,
              border: `1px solid color-mix(in srgb, ${accent} 24%, transparent)`,
              color: accent,
            }}
          >
            {icon}
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="ds-label">{label}</span>
            <span className="ds-value" style={{ color: accent }}>{value}</span>
            <span className="ds-sub">{sub}</span>
          </span>
        </div>
        <div style={{ marginTop: 10 }}>
          <AreaSpark data={data} color={accent} height={44} />
        </div>
      </SpotlightCard>
    </Reveal>
  );
}
