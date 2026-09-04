'use client';
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import { SectionHead, KVList, Sparkline, Metric, MetricRow } from '../components/ui';
import { LICENSE_CATALOG, LICENSE_BY_ID, daysUntilExpiry, type LicenseId } from '../lib/licensing';
import { CountUp, Reveal, SpotlightCard, AreaSpark, Magnetic } from '../components/fx';
import api, {
  type FlightMissionRecord, type FlightInformationRecord,
  type FlightSimulationRecord, type MediaRecord,
} from '../services/api';
import { clockTime } from '../lib/notifications';
import {
  Radar, Radio, Timer, HeartPulse, BellRing, KeyRound, ShieldCheck, ShieldAlert,
  UsersRound, ScanSearch, Map, PlaneTakeoff, Anchor, FlaskConical, FileBarChart2,
  MonitorPlay, Wand2, Cable, ArrowUpRight, Activity, Gauge, Wind, Waves,
  Thermometer, AlertTriangle, Info, CircleDot, ClipboardCheck, CheckCheck, FileDown,
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

/* mission_status kadang string mentah, kadang objek relasi {id, name} —
   duplikasi lokal dari pola yang sama di InfoPages.tsx (helper kecil
   tidak dibagi lintas modul halaman). */
function missionStatusName(m: FlightMissionRecord): string {
  const status = m.mission_status;
  return (typeof status === 'string' ? status : status?.name) ?? '';
}

/** "01:42:07" dari selisih waktu — dipakai untuk durasi terbang yang masih
    berjalan (bukan formatDurationHM di InfoPages.tsx, yang memformat
    nilai `duration` statis yang baru terisi backend setelah mendarat). */
function elapsedHMS(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/** Ambang "mendekati jadwal take off" untuk misi Planned — dikonfirmasi
    user: 15 menit. Sesudah ambang ini misi belum relevan ditampilkan. */
const TAKEOFF_DUE_SOON_MS = 15 * 60_000;

export default function DashboardPage() {
  const {
    setCurrentPage, account, licenses, activeLicenseIds, isLicenseActive, offline, t,
    notifications, lang,
  } = useApp();

  /* Saat daya platform diputus, seluruh pembacaan langsung berhenti
     diperbarui. Nilainya diganti tanda pisah agar tidak ada angka lama
     yang tampak seolah masih hidup. */
  const live = (v: string) => (offline ? '—' : v);

  const detections = useMemo(() => series(17, 30, 142, 70, 0), []);
  const gpu = useMemo(() => series(41, 30, 72, 24, 0), []);
  const simulationTrend = useMemo(() => series(29, 30, 20, 10, 0), []);
  const mediaTrend = useMemo(() => series(53, 30, 180, 60, 0), []);

  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [flightInfo, setFlightInfo] = useState<FlightInformationRecord[]>([]);
  const [simulations, setSimulations] = useState<FlightSimulationRecord[]>([]);
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getFlightMissions().catch(() => []),
      api.getFlightInformation().catch(() => []),
      api.getFlightSimulations().catch(() => []),
      api.getMedia().catch(() => []),
    ]).then(([missionRows, infoRows, simRows, mediaRows]) => {
      if (cancelled) return;
      setMissions(missionRows);
      setFlightInfo(infoRows);
      setSimulations(simRows);
      setMedia(mediaRows);
    }).finally(() => { if (!cancelled) setDashLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* Durasi terbang berjalan sampai ke detik (HH:MM:SS) — berdetak tiap
     detik seperti LiveClock. */
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const infoByMission = useMemo(() => {
    const map = new globalThis.Map<string, FlightInformationRecord>();
    for (const info of flightInfo) map.set(String(info.mission_id), info);
    return map;
  }, [flightInfo]);

  const missionStatusCounts = useMemo(() => {
    const counts = { Planned: 0, Flight: 0, Done: 0 };
    for (const m of missions) {
      const name = missionStatusName(m);
      if (name === 'Planned' || name === 'Flight' || name === 'Done') counts[name] += 1;
    }
    return counts;
  }, [missions]);

  const flyingMissions = useMemo(() => {
    const rows: {
      code: string; name: string; leader: string; altitude: number;
      badge: 'flight' | 'due-soon' | 'overdue' | 'landing-overdue';
      elapsed?: string;   // badge 'flight' / 'landing-overdue'
      minutes?: number;   // 'due-soon': sisa menit · 'overdue': menit keterlambatan
    }[] = [];

    for (const m of missions) {
      const status = missionStatusName(m);
      const info = infoByMission.get(String(m.id));
      const takeoff = info?.takeoff_time ? new Date(info.takeoff_time).getTime() : null;
      const landing = info?.landing_time ? new Date(info.landing_time).getTime() : null;
      const altitude = info?.max_altitude ?? 0;
      const code = m.mission_code ?? String(m.id);
      const name = m.mission_name ?? m.mission_code ?? String(m.id);
      const leader = info?.mission_leader ?? '—';

      if (status === 'Flight') {
        /* Durasi terbang sudah melewati landing_time yang direncanakan
           tapi status belum diubah jadi Done — balon seharusnya sudah
           mendarat sekarang. */
        const overdueLanding = landing != null && now > landing;
        rows.push({
          code, name, leader, altitude,
          badge: overdueLanding ? 'landing-overdue' : 'flight',
          elapsed: takeoff ? elapsedHMS(now - takeoff) : '00:00:00',
        });
      } else if (status === 'Planned' && takeoff != null) {
        const diff = takeoff - now;
        if (diff > TAKEOFF_DUE_SOON_MS) continue; // masih jauh — belum relevan
        if (diff >= 0) {
          rows.push({ code, name, leader, altitude, badge: 'due-soon', minutes: Math.max(1, Math.ceil(diff / 60_000)) });
        } else {
          rows.push({ code, name, leader, altitude, badge: 'overdue', minutes: Math.max(1, Math.ceil(-diff / 60_000)) });
        }
      }
    }
    return rows;
  }, [missions, infoByMission, now]);

  const simulationTotal = simulations.length;
  const mediaCount = media.length;
  const mediaSizeMb = useMemo(
    () => Math.round(media.reduce((n, m) => n + (m.file_size ?? 0), 0) / (1024 ** 2)),
    [media],
  );

  /* Unread top-5 by id desc — /notifications tidak punya query param, dan
     data ini sudah dimuat+dipoll secara global oleh context.tsx (dipakai
     lonceng), jadi diturunkan dari situ, bukan fetch baru. Entri
     pendingSync (id sementara lokal) disingkirkan karena id-nya bukan id
     backend asli. */
  const topAlerts = useMemo(() => notifications
    .filter(n => !n.read && !n.pendingSync)
    .sort((a, b) => Number(b.id) - Number(a.id))
    .slice(0, 5), [notifications]);

  /* PDF digambar dari data (jsPDF vektor), bukan jepretan layar — lihat
     lib/dashboardReport.ts. Dimuat lewat import() dinamis, sama seperti
     Globe3D di atas, supaya jsPDF/autotable tidak ikut membengkakkan
     bundle awal Dashboard dan baru diunduh saat tombol benar-benar
     diklik. */
  const exportToPdf = async () => {
    const { generateDashboardPdf } = await import('../lib/dashboardReport');
    generateDashboardPdf({
      station: account?.station ?? '—',
      stationCode: account?.stationCode ?? 'GCS',
      lang,
      simulationTotal,
      mediaCount,
      mediaSizeMb,
      missions: flyingMissions,
      missionStatusCounts,
      alerts: topAlerts,
    }, t);
  };

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
          {/* <span className="dash-hero-eyebrow">
            <CircleDot size={10} /> {account?.stationCode ?? 'GCS'} · {account?.siteName ?? 'Stasiun Lapangan'}
          </span> */}
          <h1 className="dash-hero-title">{t('Mission Dashboard')}</h1>
          <p className="dash-hero-sub">
            {t('Pengawasan udara tertambat dengan pemrosesan analitik sepenuhnya lokal — seluruh umpan, model, dan arsip tetap berada di dalam stasiun.')}
          </p>

          <div className="dash-hero-actions" style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <button className="btn btn-glass" onClick={exportToPdf}>
              <FileDown size={15} /> {t('Export to PDF')}
            </button>
          </div>

          {/* <div className="dash-hero-stats">
            <span>
              <b><LiveClock /></b>
              <i>{t('Waktu Saat ini (WIB)')}</i>
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
          </div> */}

          {/* <div style={{ display: 'flex', gap: 8, marginTop: 20, flexWrap: 'wrap' }}>
            <Magnetic strength={0.2}>
              <button className="btn btn-primary sheen" onClick={() => setCurrentPage('crowd')}>
                <UsersRound size={15} /> Mulai Pengawasan
              </button>
            </Magnetic>
            <button className="btn btn-glass" onClick={() => setCurrentPage('licenses')}>
              <KeyRound size={15} /> License Manager
            </button>
          </div> */}
        </div>
      </div>

      {/* ===== Kartu statistik ===== */}
      <div className="dash-stats">
        <StatCard
          icon={<FlaskConical size={20} />} accent="var(--accent-cyan)" delay={1}
          label={t('Total Simulasi Dibuat')} value={dashLoading || offline ? '—' : <CountUp to={simulationTotal} />}
          sub={t('skenario go/no-go tercatat')} data={simulationTrend} />
        <StatCard
          icon={<MonitorPlay size={20} />} accent="var(--accent-emerald)" delay={2}
          label={t('Media Tersimpan')} value={dashLoading || offline ? '—' : <CountUp to={mediaCount} />}
          sub={dashLoading || offline ? '—' : `${mediaSizeMb.toLocaleString('id-ID')} MB ${t('total')}`} data={mediaTrend} />
      </div>

      {/* ===== Konten utama ===== */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 350px', gap: 16, marginTop: 16 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Status lisensi */}
          {/* <GlassCard tilt={false}>
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
          </GlassCard> */}

          <FlightMissionsCard missions={flyingMissions} t={t} setCurrentPage={setCurrentPage} loading={dashLoading} />

          <MissionStatusCard counts={missionStatusCounts} t={t} loading={dashLoading} />

          {/* Aksi cepat */}
          {/* <GlassCard tilt={false}>
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
          </GlassCard> */}

          {/* Telemetri platform */}
          {/* <GlassCard tilt={false}>
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
          </GlassCard> */}
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
              {topAlerts.length === 0 ? (
                <p className="sc-foot" style={{ padding: '4px 2px' }}>{t('Tidak ada peringatan belum dibaca.')}</p>
              ) : topAlerts.map(n => {
                const color = n.severity === 'kritis' ? 'var(--danger-400)'
                  : n.severity === 'peringatan' ? 'var(--warning-400)' : 'var(--info-400)';
                const Icon = n.severity === 'kritis' ? ShieldAlert : n.severity === 'peringatan' ? AlertTriangle : Info;
                return (
                  <div key={n.id} className="alert-row" style={{ ['--al' as string]: color }}>
                    <Icon size={14} style={{ color, flexShrink: 0, marginTop: 1 }} />
                    <span style={{ minWidth: 0 }}>
                      <span className="ar-msg">{t(n.detail || n.title)}</span>
                      <span className="ar-meta">{clockTime(n.ts, lang)} WIB · {t(n.source)}</span>
                    </span>
                  </div>
                );
              })}
            </div>
          </GlassCard>

          {/* <GlassCard tilt={false}>
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
          </GlassCard> */}

          {/* <GlassCard tilt={false}>
            <SectionHead icon={<Activity size={15} />} title={t('Beban Pemrosesan')} sub={t('30 pembacaan terakhir')} />
            <Sparkline data={gpu} color="var(--accent-amber)" height={70} label={t('Utilisasi GPU')} unit="%" />
            <div style={{ height: 10 }} />
            <Sparkline data={detections} color="var(--accent-primary)" height={70} label={t('Deteksi per menit')} unit="" />
          </GlassCard> */}
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

/* Tile ringkasan lokal — pola dan kelas CSS (lic-summary/lic-summary-tile)
   sama persis dengan yang dipakai Flight Information untuk tiga tile
   Planned/Flight/Done ini, supaya bahasa visualnya konsisten alih-alih
   bar tipis yang meregang aneh saat kartu ini melebar penuh. */
function StatusTile({
  icon, accent, label, value, foot,
}: {
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

function MissionStatusCard({
  counts, t, loading,
}: {
  counts: { Planned: number; Flight: number; Done: number };
  t: (s: string) => string;
  loading?: boolean;
}) {
  return (
    <GlassCard tilt={false}>
      <SectionHead icon={<Activity size={15} />} title={t('Misi per Status')} sub={t('Distribusi status misi saat ini')} />
      <div className="lic-summary" style={{ marginBottom: 0 }}>
        <StatusTile icon={<ClipboardCheck size={19} />} accent="var(--warning-400)" label={t('Planned')} value={loading ? '—' : String(counts.Planned)} foot={t('belum lepas landas')} />
        <StatusTile icon={<PlaneTakeoff size={19} />} accent="var(--accent-primary)" label={t('Flight')} value={loading ? '—' : String(counts.Flight)} foot={t('sedang berjalan')} />
        <StatusTile icon={<CheckCheck size={19} />} accent="var(--accent-emerald)" label={t('Done')} value={loading ? '—' : String(counts.Done)} foot={t('sudah selesai')} />
      </div>
    </GlassCard>
  );
}

function FlightMissionsCard({
  missions, t, setCurrentPage, loading,
}: {
  missions: {
    code: string; name: string; leader: string; altitude: number;
    badge: 'flight' | 'due-soon' | 'overdue' | 'landing-overdue';
    elapsed?: string;
    minutes?: number;
  }[];
  t: (s: string) => string;
  setCurrentPage: (page: string) => void;
  loading?: boolean;
}) {
  return (
    <GlassCard tilt={false}>
      <SectionHead
        icon={<PlaneTakeoff size={15} />}
        title={t('Misi Sedang Terbang')}
        sub={`${loading ? '—' : missions.length} ${t('misi terbang / mendekati jadwal')}`}
        right={
          <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('flight-info')}>
            Kelola <ArrowUpRight size={12} />
          </button>
        }
      />
      {missions.length === 0 ? (
        <p className="sc-foot" style={{ padding: '4px 2px' }}>
          {loading ? t('Memuat…') : t('Tidak ada misi berstatus Flight saat ini.')}
        </p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8 }}>
          {missions.map(m => (
            <button
              key={m.code}
              onClick={() => setCurrentPage('flight-info')}
              className="select-card on"
            >
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, color: 'var(--accent-primary)' }}>
                  <PlaneTakeoff size={13} />
                  <span className="sc-title" style={{ margin: 0 }}>{m.name}</span>
                </span>
                {m.badge === 'flight' && (
                  <span className="lic-status on" style={{ fontSize: 9, padding: '3px 8px' }}>
                    <PlaneTakeoff size={10} /> FLIGHT
                  </span>
                )}
                {m.badge === 'due-soon' && (
                  <span
                    className="lic-status"
                    style={{
                      fontSize: 9, padding: '3px 8px',
                      background: 'var(--warning-bg)', color: 'var(--warning-400)',
                      borderColor: 'rgba(251,191,36,0.22)',
                    }}
                  >
                    <Timer size={10} /> {t('SEGERA')}
                  </span>
                )}
                {m.badge === 'overdue' && (
                  <span className="lic-status off" style={{ fontSize: 9, padding: '3px 8px' }}>
                    <AlertTriangle size={10} /> {t('TERLAMBAT')}
                  </span>
                )}
                {m.badge === 'landing-overdue' && (
                  <span className="lic-status off" style={{ fontSize: 9, padding: '3px 8px' }}>
                    <AlertTriangle size={10} /> {t('TERLAMBAT MENDARAT')}
                  </span>
                )}
              </span>
              <span className="sc-foot" style={{ fontFamily: 'var(--font-code)' }}>
                {m.code} · {m.leader}
              </span>
              <span className="sc-foot">
                {(m.badge === 'flight' || m.badge === 'landing-overdue') && `${t('Terbang')} ${m.elapsed} · ${m.altitude} m`}
                {m.badge === 'due-soon' && `${t('Take off dalam')} ${m.minutes} ${t('menit')} · ${m.altitude} m`}
                {m.badge === 'overdue' && `${t('Terlambat take off')} ${m.minutes} ${t('menit')} · ${m.altitude} m`}
              </span>
            </button>
          ))}
        </div>
      )}
    </GlassCard>
  );
}
