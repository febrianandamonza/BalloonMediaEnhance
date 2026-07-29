'use client';
import React, { useState, useEffect, useCallback } from 'react';
import GlassCard from '../components/GlassCard';
import { useApp } from '../context';
import {
  Crosshair, Camera, Video, Disc, CircleDot, Joystick, BarChart3,
  Activity, Wifi, Thermometer, Compass, ZoomIn, ZoomOut, Radio,
} from 'lucide-react';

function useClock() {
  const [t, setT] = useState(new Date());
  useEffect(() => { const i = setInterval(() => setT(new Date()), 1000); return () => clearInterval(i); }, []);
  return t;
}

export default function GCSPage() {
  const clock = useClock();
  const { addToast } = useApp();
  const [pan, setPan] = useState(127.3);
  const [tilt, setTilt] = useState(-42.8);
  const [zoom, setZoom] = useState(12);
  const [mode, setMode] = useState('RATE');
  const [cam, setCam] = useState<'EO' | 'IR'>('EO');
  const [recording, setRecording] = useState(false);
  const [laserOn, setLaserOn] = useState(false);
  const [stabilized, setStabilized] = useState(true);

  const modes = ['RATE', 'AID', 'SCN', 'VHCL', 'GEO', 'STOW'];

  const handlePanChange = useCallback((delta: number) => {
    setPan(prev => Math.min(360, Math.max(0, +(prev + delta).toFixed(1))));
  }, []);

  const handleTiltChange = useCallback((delta: number) => {
    setTilt(prev => Math.min(30, Math.max(-90, +(prev + delta).toFixed(1))));
  }, []);

  const handleSnapshot = () => {
    addToast({ type: 'success', title: 'Snapshot Captured', message: `${cam} frame saved — Pan ${pan.toFixed(1)}° Tilt ${tilt.toFixed(1)}°` });
  };

  const handleRecordToggle = () => {
    setRecording(!recording);
    if (!recording) {
      addToast({ type: 'info', title: 'Recording Started', message: `${cam} stream recording initiated.` });
    } else {
      addToast({ type: 'success', title: 'Recording Stopped', message: 'Video file saved to storage.' });
    }
  };

  const telemetry = [
    { label: 'PAN', value: `${pan.toFixed(1)}°`, color: 'var(--neon-cyan)' },
    { label: 'TILT', value: `${tilt.toFixed(1)}°`, color: 'var(--neon-cyan)' },
    { label: 'ZOOM', value: `${zoom}x`, color: 'var(--neon-blue)' },
    { label: 'FOV', value: `${(58.5 / zoom).toFixed(1)}°`, color: 'var(--neon-blue)' },
    { label: 'MODE', value: mode, color: mode === 'STOW' ? 'var(--warning-400)' : 'var(--neon-green)' },
    { label: 'CAM', value: cam, color: cam === 'IR' ? 'var(--neon-orange)' : 'var(--neon-cyan)' },
    { label: 'LAT', value: '-6.2088', color: 'var(--text-secondary)' },
    { label: 'LON', value: '106.845', color: 'var(--text-secondary)' },
    { label: 'ALT', value: '450m', color: 'var(--text-secondary)' },
    { label: 'RANGE', value: '1250m', color: 'var(--text-secondary)' },
    { label: 'STAB', value: stabilized ? 'ON' : 'OFF', color: stabilized ? 'var(--neon-green)' : 'var(--danger-400)' },
    { label: 'LRF', value: laserOn ? 'ACTIVE' : 'OFF', color: laserOn ? 'var(--neon-green)' : 'var(--text-muted)' },
  ];

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, display: 'flex', alignItems: 'center', gap: 10 }}>
            <Crosshair size={22} /> Ground Control Station
            <span style={{ fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 'var(--radius-full)', background: 'rgba(63,185,80,0.08)', color: 'var(--neon-green)', border: '1px solid rgba(63,185,80,0.15)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Wifi size={10} /> CONNECTED
            </span>
          </h1>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-code)', marginTop: 4 }}>
            Epsilon 140Z G2 — {cam} Active — {clock.toLocaleTimeString('en-GB')} UTC+7
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className={`btn ${recording ? 'btn-danger' : 'btn-secondary'}`} onClick={handleRecordToggle} style={{ gap: 6 }}>
            {recording ? <><Disc size={14} style={{ animation: 'pulse 1s infinite' }} /> Stop Rec</> : <><Video size={14} /> Record</>}
          </button>
          <button className="btn btn-secondary" onClick={handleSnapshot} style={{ gap: 6 }}>
            <Camera size={14} /> Snapshot
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }}>
        {/* Video Display */}
        <div>
          <div className="video-container" style={{ marginBottom: 12 }}>
            <div style={{
              width: '100%', height: '100%',
              background: cam === 'IR'
                ? 'linear-gradient(135deg, #0a0a0a, #1a1a2e, #0a0a0a)'
                : 'linear-gradient(135deg, #0d1b2a, #1b2838, #0d1b2a)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Animated scan line */}
              <div style={{
                position: 'absolute', inset: 0,
                background: `linear-gradient(180deg, transparent 0%, transparent 48%, ${cam === 'IR' ? 'rgba(255,145,0,0.06)' : 'rgba(88,166,255,0.06)'} 50%, transparent 52%, transparent 100%)`,
                animation: 'scanline 4s linear infinite',
              }} />
              {/* Grid overlay */}
              <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: `linear-gradient(rgba(88,166,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(88,166,255,0.03) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }} />
              <div style={{ textAlign: 'center', color: 'var(--text-muted)', position: 'relative', zIndex: 1 }}>
                <div style={{ fontSize: 14, opacity: 0.5 }}>{cam === 'IR' ? 'THERMAL INFRARED' : 'ELECTRO-OPTICAL'}</div>
                <div style={{ fontSize: 11, fontFamily: 'var(--font-code)', opacity: 0.3, marginTop: 4 }}>RTSP://192.168.10.100:15004</div>
              </div>
            </div>
            {/* Crosshair */}
            <div className="video-crosshair" />
            {/* HUD Overlay */}
            <div className="video-overlay">
              <div className="video-overlay-top">
                <span>{cam} {zoom}x</span>
                <span>{recording && <span style={{ color: 'var(--danger-400)', animation: 'pulse 1s infinite', display: 'inline-flex', alignItems: 'center', gap: 4 }}><Disc size={10} /> REC</span>}</span>
                <span>{clock.toLocaleTimeString('en-GB')}</span>
              </div>
              <div className="video-overlay-bottom">
                <span>PAN {pan.toFixed(1)}° TILT {tilt.toFixed(1)}°</span>
                <span>LAT -6.2088 LON 106.845</span>
                <span>RNG 1250m</span>
              </div>
            </div>
            {/* Corner brackets */}
            {[{ t: 8, l: 8 }, { t: 8, r: 8 }, { b: 8, l: 8 }, { b: 8, r: 8 }].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute', width: 24, height: 24,
                ...Object.fromEntries(Object.entries(pos).map(([k, v]) => [k === 't' ? 'top' : k === 'b' ? 'bottom' : k === 'l' ? 'left' : 'right', v])),
                borderColor: 'rgba(88,166,255,0.3)',
                borderStyle: 'solid', borderWidth: 0,
                ...(i === 0 ? { borderTopWidth: 2, borderLeftWidth: 2 } : i === 1 ? { borderTopWidth: 2, borderRightWidth: 2 } : i === 2 ? { borderBottomWidth: 2, borderLeftWidth: 2 } : { borderBottomWidth: 2, borderRightWidth: 2 }),
              }} />
            ))}
          </div>

          {/* Control Bar */}
          <GlassCard tilt={false} style={{ padding: 14 }}>
            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
              <div style={{ display: 'flex', gap: 4, background: 'rgba(0,0,0,0.2)', padding: 3, borderRadius: 'var(--radius-md)' }}>
                {['EO', 'IR'].map(c => (
                  <button key={c} onClick={() => setCam(c as 'EO' | 'IR')} className={`control-btn ${cam === c ? 'active' : ''}`} style={{ padding: '6px 16px' }}>
                    {c}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />
              <div style={{ display: 'flex', gap: 4 }}>
                {modes.map(m => (
                  <button key={m} onClick={() => setMode(m)} className={`control-btn ${mode === m ? 'active' : ''}`} style={{ padding: '6px 12px', fontSize: 11 }}>
                    {m}
                  </button>
                ))}
              </div>
              <div style={{ width: 1, height: 28, background: 'var(--border-subtle)' }} />
              <button className={`control-btn ${stabilized ? 'active' : ''}`} onClick={() => setStabilized(!stabilized)} style={{ padding: '6px 12px', fontSize: 11 }}>STAB</button>
              <button className={`control-btn ${laserOn ? 'active' : ''} ${laserOn ? 'danger' : ''}`} onClick={() => setLaserOn(!laserOn)} style={{ padding: '6px 12px', fontSize: 11 }}>LRF</button>
            </div>
          </GlassCard>
        </div>

        {/* Right Panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Gimbal Control */}
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Joystick size={15} /> Gimbal Control
            </div>
            {/* D-Pad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 4, maxWidth: 160, margin: '0 auto 14px' }}>
              <div />
              <button className="control-btn" style={{ justifyContent: 'center', padding: 8 }} onClick={() => handleTiltChange(1)}>▲</button>
              <div />
              <button className="control-btn" style={{ justifyContent: 'center', padding: 8 }} onClick={() => handlePanChange(-1)}>◀</button>
              <button className="control-btn active" style={{ justifyContent: 'center', padding: 8 }}><CircleDot size={14} /></button>
              <button className="control-btn" style={{ justifyContent: 'center', padding: 8 }} onClick={() => handlePanChange(1)}>▶</button>
              <div />
              <button className="control-btn" style={{ justifyContent: 'center', padding: 8 }} onClick={() => handleTiltChange(-1)}>▼</button>
              <div />
            </div>
            {/* Zoom Slider */}
            <div style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><ZoomIn size={12} /> ZOOM</span>
                <span style={{ color: 'var(--neon-cyan)' }}>{zoom}x</span>
              </div>
              <input type="range" min="1" max="40" value={zoom} onChange={e => setZoom(+e.target.value)} style={{ width: '100%', accentColor: 'var(--neon-cyan)', height: 4 }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--text-disabled)' }}>
                <span>1x Wide</span>
                <span>40x Tele</span>
              </div>
            </div>
          </GlassCard>

          {/* Telemetry */}
          <GlassCard tilt={false}>
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
              <BarChart3 size={15} /> Telemetry
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              {telemetry.map(t => (
                <div key={t.label} style={{
                  padding: '7px 10px', borderRadius: 'var(--radius-sm)',
                  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-subtle)',
                }}>
                  <div style={{ fontSize: 8, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', color: 'var(--text-muted)' }}>{t.label}</div>
                  <div style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-code)', color: t.color, marginTop: 2 }}>{t.value}</div>
                </div>
              ))}
            </div>
          </GlassCard>

          {/* Quick Status */}
          <GlassCard tilt={false} style={{ padding: 14 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--neon-green)', boxShadow: '0 0 8px rgba(63,185,80,0.5)' }} />
                <span style={{ fontSize: 12, fontWeight: 600 }}>Link Quality</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, fontFamily: 'var(--font-code)', color: 'var(--neon-green)' }}>98%</span>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
