'use client';
import React, { useState, useEffect } from 'react';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import {
  Activity, Satellite, Clock, Users, BarChart3, Cpu, Database,
  Crosshair, Wind, Plane, KeyRound, Zap, Globe, BellRing, Map,
  FlaskConical, Anchor, FileText, Heart, Shield, TrendingUp,
} from 'lucide-react';

function LiveClock() {
  const [time, setTime] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setTime(new Date()), 1000); return () => clearInterval(i); }, []);
  return <span className="font-mono">{time.toLocaleTimeString('en-GB')}</span>;
}

function AnimatedNumber({ value, suffix = '' }: { value: number; suffix?: string }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.max(1, Math.floor(value / 30));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setDisplay(value); clearInterval(timer); }
      else setDisplay(start);
    }, 20);
    return () => clearInterval(timer);
  }, [value]);
  return <>{display.toLocaleString()}{suffix}</>;
}

function MiniSparkline({ data, color = 'var(--neon-cyan)' }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 120, h = 32;
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ');
  return (
    <svg width={w} height={h} style={{ display: 'block' }}>
      <defs>
        <linearGradient id={`sg-${color.replace(/[^a-z]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${points} ${w},${h}`} fill={`url(#sg-${color.replace(/[^a-z]/g, '')})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STAT_ICONS = [
  <Activity size={22} key="a" />,
  <Satellite size={22} key="s" />,
  <Clock size={22} key="c" />,
  <Users size={22} key="u" />,
];

export default function DashboardPage() {
  const { license, setCurrentPage, addToast } = useApp();
  const activeModules = Object.values(license.modules).filter(m => m.active).length;
  const totalModules = Object.values(license.modules).length;

  const stats = [
    { icon: STAT_ICONS[0], label: 'System Status', value: 'OPERATIONAL', color: 'var(--neon-green)', sub: 'All systems nominal', sparkData: [85, 88, 91, 87, 92, 95, 93, 96, 94, 97] },
    { icon: STAT_ICONS[1], label: 'Active Sites', value: '3', color: 'var(--neon-cyan)', sub: 'Jakarta • Surabaya • Makassar', sparkData: [3, 3, 2, 3, 3, 3, 2, 3, 3, 3] },
    { icon: STAT_ICONS[2], label: 'Uptime', value: '99.7%', color: 'var(--neon-blue)', sub: '42d 7h continuous', sparkData: [99.2, 99.5, 99.8, 99.6, 99.9, 99.7, 99.8, 99.5, 99.7, 99.7] },
    { icon: STAT_ICONS[3], label: 'Crowd Count', value: '2,847', color: 'var(--neon-purple)', sub: 'Zone A peak: 512', sparkData: [1200, 1800, 2100, 2400, 2847, 2600, 2900, 2750, 2847, 2900] },
  ];

  const healthItems = [
    { name: 'Epsilon 140Z G2', icon: <Crosshair size={15} />, status: 'online', metric: 'Pan: 127.3° | Tilt: -42.8°', pct: 98 },
    { name: 'SkyStar 180 Balloon', icon: <Wind size={15} />, status: 'online', metric: 'Alt: 450m | He: 165 bar', pct: 92 },
    { name: 'Main Tether Cable', icon: <Zap size={15} />, status: 'online', metric: '230V / 1.8A | EOP: 42dB', pct: 95 },
    { name: 'Mooring Station', icon: <Anchor size={15} />, status: 'online', metric: 'Wind: 12 km/h NW', pct: 100 },
    { name: 'CUDA GPU Server', icon: <Cpu size={15} />, status: 'online', metric: 'RTX 4090 | 78% utilization', pct: 78 },
    { name: 'Database (TimescaleDB)', icon: <Database size={15} />, status: 'online', metric: '28 tables | 2.4GB used', pct: 88 },
  ];

  const [recentAlerts, setRecentAlerts] = useState([
    { time: '15:32', msg: 'Wind gust exceeded 25 km/h threshold', severity: 'warning' as const, acked: false },
    { time: '14:10', msg: 'Crowd count > 500 at Zone A', severity: 'info' as const, acked: true },
    { time: '12:05', msg: 'Geofence breach — perimeter sector NW', severity: 'critical' as const, acked: true },
    { time: '08:45', msg: 'Daily backup completed successfully', severity: 'success' as const, acked: true },
  ]);

  const handleAckAlert = (index: number) => {
    setRecentAlerts(prev => prev.map((a, i) => i === index ? { ...a, acked: true } : a));
    addToast({ type: 'success', title: 'Alert Acknowledged', message: recentAlerts[index].msg });
  };

  const severityStyles: Record<string, { bg: string; text: string; border: string }> = {
    critical: { bg: 'rgba(239,68,68,0.06)', text: 'var(--danger-400)', border: 'rgba(239,68,68,0.12)' },
    warning: { bg: 'rgba(245,158,11,0.06)', text: 'var(--warning-400)', border: 'rgba(245,158,11,0.12)' },
    info: { bg: 'rgba(59,130,246,0.06)', text: 'var(--info-400)', border: 'rgba(59,130,246,0.12)' },
    success: { bg: 'rgba(16,185,129,0.06)', text: 'var(--success-400)', border: 'rgba(16,185,129,0.12)' },
  };

  const quickActions = [
    { icon: <Crosshair size={20} />, label: 'GCS Control', page: 'gcs' },
    { icon: <Users size={20} />, label: 'Crowd Count', page: 'crowd' },
    { icon: <Globe size={20} />, label: 'GEO Map', page: 'geo-viz' },
    { icon: <Plane size={20} />, label: 'Flight Info', page: 'flight-info' },
    { icon: <Anchor size={20} />, label: 'Mooring', page: 'mooring' },
    { icon: <FlaskConical size={20} />, label: 'Simulation', page: 'simulation' },
  ];

  return (
    <div className="animate-fade-in">
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <span>Mission Control</span>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 10px rgba(63,185,80,0.5)', display: 'inline-block' }} />
          </h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
            Tethered Balloon Geospatial Intelligence — Real-time Overview
            <span style={{ fontSize: 12, fontFamily: 'var(--font-code)', color: 'var(--neon-cyan)', opacity: 0.7 }}><LiveClock /></span>
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={() => setCurrentPage('reporting')} style={{ gap: 6 }}><FileText size={14} /> Reports</button>
          <button className="btn btn-primary" onClick={() => setCurrentPage('gcs')} style={{ gap: 6 }}><Crosshair size={14} /> Open GCS</button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <GlassCard key={s.label} glow={s.color.includes('green') ? 'rgba(63,185,80,0.06)' : s.color.includes('purple') ? 'rgba(130,80,223,0.06)' : undefined}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)', marginBottom: 8 }}>{s.label}</div>
                <div style={{ fontSize: i === 0 ? 18 : 28, fontWeight: 800, color: s.color, lineHeight: 1.1 }}>
                  {i === 3 ? <AnimatedNumber value={2847} /> : s.value}
                </div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 6 }}>{s.sub}</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                <span style={{ color: s.color, opacity: 0.7 }}>{s.icon}</span>
                <MiniSparkline data={s.sparkData} color={s.color} />
              </div>
            </div>
          </GlassCard>
        ))}
      </div>

      {/* Main Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 380px', gap: 16, marginBottom: 24 }}>
        {/* System Health */}
        <GlassCard tilt={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Heart size={16} style={{ color: 'var(--neon-green)' }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>System Health Monitor</span>
            </div>
            <span className="badge badge-success">All Systems Online</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {healthItems.map((item) => (
              <div key={item.name} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '12px 14px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)',
                transition: 'all 0.2s ease',
              }}>
                <div style={{ color: 'var(--neon-cyan)', opacity: 0.7 }}>{item.icon}</div>
                <div style={{
                  width: 8, height: 8, borderRadius: '50%', flexShrink: 0,
                  background: item.status === 'online' ? 'var(--neon-green)' : 'var(--danger-500)',
                  boxShadow: item.status === 'online' ? '0 0 8px rgba(63,185,80,0.5)' : 'var(--shadow-glow-red)',
                }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{item.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', marginTop: 2 }}>{item.metric}</div>
                </div>
                <div style={{ width: 80 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', marginBottom: 3 }}>
                    <span>Health</span>
                    <span style={{ color: item.pct >= 90 ? 'var(--success-400)' : item.pct >= 70 ? 'var(--warning-400)' : 'var(--danger-400)' }}>{item.pct}%</span>
                  </div>
                  <div className="progress-bar">
                    <div className="progress-fill" style={{ width: `${item.pct}%`, background: item.pct >= 90 ? 'linear-gradient(90deg, var(--neon-green), var(--neon-cyan))' : item.pct >= 70 ? 'linear-gradient(90deg, var(--warning-500), var(--neon-orange))' : 'linear-gradient(90deg, var(--danger-500), var(--neon-pink))' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Alerts */}
        <GlassCard tilt={false}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <BellRing size={16} style={{ color: 'var(--warning-400)' }} />
              <span style={{ fontSize: 14, fontWeight: 700 }}>Live Alerts</span>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setCurrentPage('alerts')}>View All →</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {recentAlerts.map((alert, i) => {
              const sev = severityStyles[alert.severity];
              return (
                <div key={i} style={{
                  padding: '12px 14px', borderRadius: 'var(--radius-md)',
                  background: sev.bg, border: `1px solid ${sev.border}`,
                  display: 'flex', gap: 12, alignItems: 'flex-start',
                  opacity: alert.acked ? 0.6 : 1, transition: 'opacity 0.3s',
                }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%', marginTop: 6, flexShrink: 0,
                    background: sev.text, boxShadow: `0 0 8px ${sev.text}55`,
                    animation: !alert.acked ? 'pulse 2s ease-in-out infinite' : 'none',
                  }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)', lineHeight: 1.4 }}>{alert.msg}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', marginTop: 4, display: 'flex', gap: 8 }}>
                      <span>{alert.time}</span>
                      <span>•</span>
                      <span style={{ color: sev.text }}>{alert.severity.toUpperCase()}</span>
                      {alert.acked && <><span>•</span><span>Acknowledged</span></>}
                    </div>
                  </div>
                  {!alert.acked && (
                    <button className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: sev.text }} onClick={() => handleAckAlert(i)}>
                      ACK
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>
      </div>

      {/* Bottom Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
        {/* License Overview */}
        <GlassCard glow="rgba(68,138,255,0.06)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <KeyRound size={16} style={{ color: 'var(--neon-cyan)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>License Status</span>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ position: 'relative', width: 100, height: 100, margin: '0 auto' }}>
              <svg width="100" height="100" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="var(--neon-cyan)" strokeWidth="8"
                  strokeDasharray={`${(activeModules / totalModules) * 264} 264`}
                  strokeLinecap="round" transform="rotate(-90 50 50)"
                  style={{ filter: 'drop-shadow(0 0 6px rgba(88,166,255,0.3))' }} />
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--neon-cyan)' }}>{activeModules}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>of {totalModules}</span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 12 }}>
            {[
              { name: 'Mod 1 — Detection', active: true },
              { name: 'Mod 2 — Enhancement', active: true },
              { name: 'Mod 3 — Info & Reporting', active: true },
            ].map(m => (
              <div key={m.name} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', borderRadius: 'var(--radius-sm)', background: 'rgba(0,0,0,0.1)' }}>
                <span style={{ color: 'var(--text-secondary)' }}>{m.name}</span>
                <span style={{ color: m.active ? 'var(--success-400)' : 'var(--danger-400)', fontWeight: 600, fontSize: 11 }}>
                  {m.active ? '● Active' : '○ Inactive'}
                </span>
              </div>
            ))}
          </div>
          <button className="btn btn-primary btn-sm w-full mt-16" onClick={() => setCurrentPage('licenses')}>Manage Licenses →</button>
        </GlassCard>

        {/* Quick Actions */}
        <GlassCard glow="rgba(130,80,223,0.06)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Zap size={16} style={{ color: 'var(--neon-purple)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Quick Actions</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {quickActions.map(action => (
              <button key={action.page} onClick={() => setCurrentPage(action.page)} style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                padding: '16px 8px', borderRadius: 'var(--radius-md)',
                background: 'var(--bg-card-hover)', border: '1px solid var(--border-subtle)',
                cursor: 'pointer', color: 'var(--text-secondary)',
                transition: 'all 0.2s ease', fontFamily: 'var(--font-sans)',
              }}
              onMouseEnter={e => {
                (e.currentTarget).style.borderColor = 'rgba(88,166,255,0.15)';
                (e.currentTarget).style.background = 'rgba(88,166,255,0.04)';
                (e.currentTarget).style.color = 'var(--text-primary)';
              }}
              onMouseLeave={e => {
                (e.currentTarget).style.borderColor = 'var(--border-subtle)';
                (e.currentTarget).style.background = 'var(--bg-card-hover)';
                (e.currentTarget).style.color = 'var(--text-secondary)';
              }}>
                <span style={{ pointerEvents: 'none' }}>{action.icon}</span>
                <span style={{ fontSize: 11, fontWeight: 600, pointerEvents: 'none' }}>{action.label}</span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* Mission Info */}
        <GlassCard glow="rgba(63,185,80,0.06)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
            <Plane size={16} style={{ color: 'var(--neon-green)' }} />
            <span style={{ fontSize: 14, fontWeight: 700 }}>Active Mission</span>
            <span className="badge badge-success" style={{ marginLeft: 'auto' }}>LIVE</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[
              { label: 'Mission', val: '#23 — Surveillance Op' },
              { label: 'Platform', val: 'SkyStar 180' },
              { label: 'Payload', val: 'Epsilon 140Z G2' },
              { label: 'Altitude', val: '450m AGL' },
              { label: 'Block Time', val: '4h 30m' },
              { label: 'Wind', val: '12 km/h NW' },
              { label: 'Team Lead', val: 'Cpt. Ari Wibowo' },
            ].map(item => (
              <div key={item.label} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                background: 'rgba(0,0,0,0.1)', fontSize: 12,
              }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{item.label}</span>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-code)', fontSize: 11 }}>{item.val}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-secondary btn-sm w-full mt-16" onClick={() => setCurrentPage('flight-info')}>View Flight Details →</button>
        </GlassCard>
      </div>
    </div>
  );
}
