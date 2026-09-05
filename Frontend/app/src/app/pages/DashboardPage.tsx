'use client';
import React, { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import { SectionHead, KVList, Sparkline, Metric, MetricRow } from '../components/ui';
import { LICENSE_CATALOG, LICENSE_BY_ID, daysUntilExpiry, type LicenseId } from '../lib/licensing';
import { CountUp, Reveal, SpotlightCard, AreaSpark, Magnetic } from '../components/fx';
import api, { type DashboardSimulationRecord } from '../services/api';
import { fullTimestamp } from '../lib/notifications';
import {
  Radar, Radio, Timer, HeartPulse, KeyRound, ShieldCheck, ShieldAlert,
  UsersRound, ScanSearch, Map, PlaneTakeoff, Anchor, FlaskConical, FileBarChart2,
  MonitorPlay, Wand2, Cable, ArrowUpRight, Activity, Gauge, Wind, Waves,
  Thermometer, AlertTriangle, CircleDot, ClipboardCheck, CheckCheck, FileDown,
  ChevronLeft, ChevronRight, Filter, X,
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
    setCurrentPage, account, licenses, activeLicenseIds, isLicenseActive, offline, t, lang,
  } = useApp();

  /* Saat daya platform diputus, seluruh pembacaan langsung berhenti
     diperbarui. Nilainya diganti tanda pisah agar tidak ada angka lama
     yang tampak seolah masih hidup. */
  const live = (v: string) => (offline ? '—' : v);

  const detections = useMemo(() => series(17, 30, 142, 70, 0), []);
  const gpu = useMemo(() => series(41, 30, 72, 24, 0), []);
  const simulationTrend = useMemo(() => series(29, 30, 20, 10, 0), []);
  const mediaTrend = useMemo(() => series(53, 30, 180, 60, 0), []);

  const [dashboardSimulations, setDashboardSimulations] = useState<DashboardSimulationRecord[]>([]);
  const [dashLoading, setDashLoading] = useState(true);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let cancelled = false;
    api.getDashboardSimulations().catch(() => []).then(dashSimRows => {
      if (cancelled) return;
      setDashboardSimulations(dashSimRows);
    }).finally(() => { if (!cancelled) setDashLoading(false); });
    return () => { cancelled = true; };
  }, []);

  /* Durasi terbang berjalan sampai ke detik (HH:MM:SS) — berdetak tiap
     detik seperti LiveClock. */
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, []);

  /* Filter Dashboard — Nama Simulasi + Range Tanggal (takeoff_time misi).
     Satu sumber (dashboardSimulations, dari /dashboard/simulations, sudah
     membawa missions[]→mission_status/flight_information(+media) dalam
     satu pohon) diturunkan jadi filteredSimulations/allFilteredMissions,
     dipakai ulang oleh KELIMA metrik di bawah supaya filter konsisten di
     semua kartu sekaligus — bukan memfilter 4 sumber terpisah yang tidak
     saling terhubung. */
  interface DashboardFilterState {
    simulationName: string; // '' = semua
    dateFrom: string;       // yyyy-mm-dd, '' = tak dibatasi
    dateTo: string;
  }
  const [filter, setFilter] = useState<DashboardFilterState>({ simulationName: '', dateFrom: '', dateTo: '' });
  const [filterOpen, setFilterOpen] = useState(false);

  useEffect(() => {
    if (!filterOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterOpen(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [filterOpen]);

  const simulationNameOptions = useMemo(() => {
    const names = new Set<string>();
    for (const sim of dashboardSimulations) if (sim.simulation_name) names.add(sim.simulation_name);
    return Array.from(names).sort();
  }, [dashboardSimulations]);

  const filteredSimulations = useMemo(() => {
    const from = filter.dateFrom ? new Date(`${filter.dateFrom}T00:00:00`).getTime() : null;
    const to = filter.dateTo ? new Date(`${filter.dateTo}T23:59:59`).getTime() : null;
    const dateActive = from != null || to != null;

    return dashboardSimulations
      .filter(sim => !filter.simulationName || sim.simulation_name === filter.simulationName)
      .map(sim => {
        if (!dateActive) return sim;
        const missions = (sim.missions ?? []).filter(m => {
          const takeoff = m.flight_information?.takeoff_time;
          if (!takeoff) return false;
          const ts = new Date(takeoff).getTime();
          if (from != null && ts < from) return false;
          if (to != null && ts > to) return false;
          return true;
        });
        return { ...sim, missions };
      })
      .filter(sim => !dateActive || (sim.missions?.length ?? 0) > 0);
  }, [dashboardSimulations, filter]);

  const allFilteredMissions = useMemo(
    () => filteredSimulations.flatMap(sim => sim.missions ?? []),
    [filteredSimulations],
  );

  const missionStatusCounts = useMemo(() => {
    const counts = { Planned: 0, Flight: 0, Done: 0 };
    for (const m of allFilteredMissions) {
      const name = m.mission_status?.name;
      if (name === 'Planned' || name === 'Flight' || name === 'Done') counts[name] += 1;
    }
    return counts;
  }, [allFilteredMissions]);

  const flyingMissions = useMemo(() => {
    const rows: {
      code: string; name: string; leader: string; altitude: number;
      badge: 'flight' | 'due-soon' | 'overdue' | 'landing-overdue';
      elapsed?: string;   // badge 'flight' / 'landing-overdue'
      minutes?: number;   // 'due-soon': sisa menit · 'overdue': menit keterlambatan
    }[] = [];

    for (const m of allFilteredMissions) {
      const status = m.mission_status?.name;
      const info = m.flight_information;
      const takeoff = info?.takeoff_time ? new Date(info.takeoff_time).getTime() : null;
      const landing = info?.landing_time ? new Date(info.landing_time).getTime() : null;
      const altitude = info?.max_altitude != null ? Number(info.max_altitude) : 0;
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
  }, [allFilteredMissions, now]);

  const simulationTotal = filteredSimulations.length;
  const mediaCount = useMemo(
    () => allFilteredMissions.reduce((n, m) => n + (m.flight_information?.media?.length ?? 0), 0),
    [allFilteredMissions],
  );
  const mediaSizeMb = useMemo(() => {
    let total = 0;
    for (const m of allFilteredMissions) {
      for (const md of m.flight_information?.media ?? []) total += md.file_size ?? 0;
    }
    return Math.round(total / (1024 ** 2));
  }, [allFilteredMissions]);

  /* Misi Selesai — diratakan dari missions[] tiap simulasi yang
     dikembalikan /dashboard/simulations, disaring ke mission_status.name
     === 'Done', diurut terbaru dulu. Endpoint ini tidak punya parameter
     pagination sendiri, jadi 5-per-halaman dikerjakan di klien (lihat
     completedPage di bawah). */
  const completedMissions = useMemo(() => {
    const rows: { id: string; code: string; name: string; leader: string; completedAt: number }[] = [];
    for (const m of allFilteredMissions) {
      if (m.mission_status?.name !== 'Done') continue;
      const ts = m.updated_at ? new Date(m.updated_at).getTime()
        : m.created_at ? new Date(m.created_at).getTime() : 0;
      rows.push({
        id: m.id,
        code: m.mission_code ?? String(m.id),
        name: m.mission_name ?? m.mission_code ?? String(m.id),
        leader: m.flight_information?.mission_leader ?? '—',
        completedAt: ts,
      });
    }
    return rows.sort((a, b) => b.completedAt - a.completedAt);
  }, [allFilteredMissions]);

  const COMPLETED_PAGE_SIZE = 5;
  const [completedPage, setCompletedPage] = useState(1);
  const completedPageCount = Math.max(1, Math.ceil(completedMissions.length / COMPLETED_PAGE_SIZE));
  useEffect(() => {
    setCompletedPage(p => Math.min(p, completedPageCount));
  }, [completedPageCount]);
  const pagedCompleted = completedMissions.slice(
    (completedPage - 1) * COMPLETED_PAGE_SIZE,
    completedPage * COMPLETED_PAGE_SIZE,
  );
  /* Jendela nomor halaman di sekitar halaman aktif — maksimal 3 tombol
     angka, sama pola dengan Riwayat Peringatan di InfoPages.tsx. */
  const completedPageWindow = useMemo(() => {
    const span = Math.min(3, completedPageCount);
    let start = Math.min(Math.max(1, completedPage - 1), completedPageCount - span + 1);
    start = Math.max(1, start);
    return Array.from({ length: span }, (_, i) => start + i);
  }, [completedPage, completedPageCount]);

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
      completedMissions,
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

            <button
              className={`btn ${(filter.simulationName || filter.dateFrom || filter.dateTo) ? 'btn-primary' : 'btn-glass'}`}
              onClick={() => setFilterOpen(true)}
            >
              <Filter size={15} /> {t('Filter')}
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

      {filterOpen && (
        <div className="modal-backdrop" onClick={() => setFilterOpen(false)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }}>
            <div className="modal-header">
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Filter size={16} /> {t('Filter')}
              </h3>
              <button className="btn btn-ghost" onClick={() => setFilterOpen(false)} style={{ padding: 4 }} aria-label={t('Tutup')}>
                <X size={17} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('Nama Simulasi')}</label>
                <select
                  className="form-input"
                  value={filter.simulationName}
                  onChange={e => setFilter(f => ({ ...f, simulationName: e.target.value }))}
                >
                  <option value="">{t('Semua simulasi')}</option>
                  {simulationNameOptions.map(name => <option key={name} value={name}>{name}</option>)}
                </select>
              </div>
              <div className="row">
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Dari Tanggal')}</label>
                    <input
                      type="date"
                      className="form-input font-mono"
                      value={filter.dateFrom}
                      onChange={e => setFilter(f => ({ ...f, dateFrom: e.target.value }))}
                    />
                  </div>
                </div>
                <div className="col-6">
                  <div className="form-group">
                    <label className="form-label">{t('Sampai Tanggal')}</label>
                    <input
                      type="date"
                      className="form-input font-mono"
                      value={filter.dateTo}
                      onChange={e => setFilter(f => ({ ...f, dateTo: e.target.value }))}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setFilter({ simulationName: '', dateFrom: '', dateTo: '' })}
              >
                {t('Reset Filter')}
              </button>
              <button className="btn btn-primary" onClick={() => setFilterOpen(false)}>
                {t('Terapkan')}
              </button>
            </div>
          </div>
        </div>
      )}

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
              icon={<CheckCheck size={15} />}
              title={t('Misi Selesai')}
              right={
                <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('flight-info')}>
                  Semua <ArrowUpRight size={12} />
                </button>
              }
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {pagedCompleted.length === 0 ? (
                <p className="sc-foot" style={{ padding: '4px 2px' }}>{t('Belum ada misi yang selesai.')}</p>
              ) : pagedCompleted.map(m => (
                <div key={m.id} className="alert-row" style={{ ['--al' as string]: 'var(--accent-emerald)' }}>
                  <CheckCheck size={14} style={{ color: 'var(--accent-emerald)', flexShrink: 0, marginTop: 1 }} />
                  <span style={{ minWidth: 0 }}>
                    <span className="ar-msg">{m.name}</span>
                    <span className="ar-meta">{m.leader} · {m.completedAt ? fullTimestamp(m.completedAt, lang) : '—'}</span>
                  </span>
                </div>
              ))}
            </div>

            {completedMissions.length > 0 && (
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginTop: 10, padding: '8px 12px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
                borderRadius: 'var(--radius-md)',
              }}>
                <span style={{ fontSize: 11.5, color: 'var(--text-muted)' }}>
                  {t('Halaman')} {completedPage} {t('dari')} {completedPageCount}
                </span>
                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCompletedPage(p => Math.max(1, p - 1))}
                    disabled={completedPage <= 1}
                    aria-label={t('Halaman sebelumnya')}
                  >
                    <ChevronLeft size={12} />
                  </button>
                  {completedPageWindow.map(p => (
                    <button
                      key={p}
                      className={`btn btn-sm ${p === completedPage ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => setCompletedPage(p)}
                      aria-current={p === completedPage ? 'page' : undefined}
                      aria-label={`${t('Halaman')} ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => setCompletedPage(p => Math.min(completedPageCount, p + 1))}
                    disabled={completedPage >= completedPageCount}
                    aria-label={t('Halaman berikutnya')}
                  >
                    <ChevronRight size={12} />
                  </button>
                </div>
              </div>
            )}
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
