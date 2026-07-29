'use client';
import React, { useState } from 'react';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import { KeyRound, ScanSearch, Sparkles, BarChart3, CheckCircle2, Lock, X, Loader2 } from 'lucide-react';

export default function LicensePage() {
  const { license, activateLicense, addToast } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [selectedModule, setSelectedModule] = useState('');
  const [licenseKey, setLicenseKey] = useState('');
  const [activating, setActivating] = useState(false);

  const moduleGroups = [
    {
      title: 'Module 1 — Analytic & Object Detection',
      code: 'MOD_1',
      icon: <ScanSearch size={18} />,
      color: 'var(--neon-cyan)',
      modules: [
        { code: '1.1a', name: 'Digital Imaging Analytic & Object Detection', desc: 'AI object detection on static images' },
        { code: '1.1b', name: 'Digital Video Analytic & Object Detection', desc: 'Real-time video detection + MTI' },
      ],
    },
    {
      title: 'Module 2 — Digital Enhancement',
      code: 'MOD_2',
      icon: <Sparkles size={18} />,
      color: 'var(--neon-blue)',
      modules: [
        { code: '1.2a', name: 'Digital Imaging Enhancement', desc: 'CLAHE, LAP, sharpening, denoising' },
        { code: '1.2b', name: 'Digital Video Enhancement', desc: 'Real-time enhancement + false color' },
        // { code: '1.2c', name: 'Tether Cable API', desc: 'REST API for tether cable integration' },
        { code: '1.2d', name: 'Tether Cable Monitor', desc: 'Cable health & diagnostics' },
      ],
    },
    {
      title: 'Module 3 — Information & Reporting',
      code: 'MOD_3',
      icon: <BarChart3 size={18} />,
      color: 'var(--neon-purple)',
      modules: [
        { code: '1.3a', name: 'Digital Reporting', desc: 'PDF/Excel report generation' },
        { code: '1.3b', name: 'GEO Visualization', desc: 'Moving map, target bank, FOV' },
        { code: '1.3c', name: 'Smart Notification Alert', desc: 'Geofence & threshold alerts' },
        { code: '1.3d', name: 'Flight Info App', desc: 'Mission planning & flight log' },
        // { code: '1.3e', name: 'Mooring Monitor', desc: 'SkyStar 180 mooring telemetry' },
        { code: '1.3f', name: 'Flight Simulation', desc: 'GO/NO-GO scenario planning' },
      ],
    },
  ];

  const activeCount = Object.values(license.modules).filter(m => m.active).length;
  const totalCount = Object.values(license.modules).length;

  const handleActivate = () => {
    if (selectedModule && licenseKey.length >= 8) {
      setActivating(true);
      setTimeout(() => {
        activateLicense(selectedModule);
        setShowModal(false);
        setLicenseKey('');
        setActivating(false);
        const modName = Object.values(license.modules).find((_, i) => Object.keys(license.modules)[i] === selectedModule);
        addToast({ type: 'success', title: 'Module Activated', message: `${selectedModule} license has been activated successfully.` });
      }, 1500);
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: 10 }}><KeyRound size={24} /> License Manager</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>Video Analytics Software — Manage base license & module add-ons</p>
        </div>
      </div>

      {/* Base License Card */}
      <GlassCard glow="rgba(88,166,255,0.08)" style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: 'var(--radius-lg)',
              background: 'linear-gradient(135deg, rgba(88,166,255,0.15), rgba(68,138,255,0.15))',
              border: '1px solid rgba(88,166,255,0.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: 'var(--shadow-glow-cyan)',
            }}><KeyRound size={28} style={{ color: 'var(--neon-cyan)' }} /></div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>Video Analytics Software — Base License</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                Crowd Counting (Deep Learning) + Platform Access
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 12, fontFamily: 'var(--font-code)' }}>
                <span style={{ color: 'var(--text-muted)' }}>S/N: <span style={{ color: 'var(--text-secondary)' }}>{license.serialNumber}</span></span>
                <span style={{ color: 'var(--text-muted)' }}>Exp: <span style={{ color: 'var(--text-secondary)' }}>{license.expiry}</span></span>
                <span style={{ color: 'var(--text-muted)' }}>Seats: <span style={{ color: 'var(--text-secondary)' }}>{license.maxSeats}</span></span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span className="badge badge-success" style={{ padding: '5px 14px', fontSize: 12, gap: 4 }}><CheckCircle2 size={13} /> ACTIVE</span>
          </div>
        </div>
        {/* Progress */}
        <div style={{ marginTop: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--text-muted)', marginBottom: 6 }}>
            <span>Module Activation Progress</span>
            <span style={{ color: 'var(--neon-cyan)' }}>{activeCount}/{totalCount} modules active</span>
          </div>
          <div className="progress-bar" style={{ height: 6 }}>
            <div className="progress-fill" style={{ width: `${(activeCount / totalCount) * 100}%` }} />
          </div>
        </div>
      </GlassCard>

      {/* Module Groups */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {moduleGroups.map(group => (
          <div key={group.code}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <span style={{ color: group.color }}>{group.icon}</span>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)' }}>{group.title}</span>
              <div style={{ flex: 1, height: 1, background: 'var(--border-subtle)', marginLeft: 12 }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: `repeat(${group.modules.length <= 2 ? 2 : 3}, 1fr)`, gap: 12 }}>
              {group.modules.map(mod => {
                const isActive = license.modules[mod.code]?.active;
                return (
                  <GlassCard key={mod.code} glow={isActive ? `${group.color}22` : 'rgba(239,68,68,0.04)'}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, fontFamily: 'var(--font-code)',
                        padding: '2px 8px', borderRadius: 'var(--radius-full)',
                        background: isActive ? 'rgba(88,166,255,0.08)' : 'rgba(239,68,68,0.06)',
                        color: isActive ? 'var(--neon-cyan)' : 'var(--danger-400)',
                        border: `1px solid ${isActive ? 'rgba(88,166,255,0.15)' : 'rgba(239,68,68,0.12)'}`,
                      }}>{mod.code}</span>
                      <span style={{
                        width: 10, height: 10, borderRadius: '50%',
                        background: isActive ? 'var(--neon-green)' : 'var(--danger-500)',
                        boxShadow: isActive ? '0 0 8px rgba(63,185,80,0.5)' : '0 0 8px rgba(239,68,68,0.3)',
                      }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6, lineHeight: 1.4 }}>{mod.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 16 }}>{mod.desc}</div>
                    {isActive ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--success-400)' }}>
                        <CheckCircle2 size={13} /> Licensed & Active
                      </div>
                    ) : (
                      <button className="btn btn-primary btn-sm w-full" onClick={() => { setSelectedModule(mod.code); setShowModal(true); }}>
                        <KeyRound size={13} /> Activate License
                      </button>
                    )}
                  </GlassCard>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Activation Modal */}
      {showModal && (
        <div className="modal-backdrop" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}><KeyRound size={18} /> Activate Module License</h3>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>Module {selectedModule}</p>
              </div>
              <button className="btn btn-ghost" onClick={() => setShowModal(false)} style={{ padding: 4 }}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">License Key</label>
                <input className="form-input font-mono" placeholder="XXXX-XXXX-XXXX-XXXX" value={licenseKey} onChange={e => setLicenseKey(e.target.value)} style={{ letterSpacing: 2, textAlign: 'center', fontSize: 16 }} />
              </div>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                Enter the license key provided by your distributor. The key will be validated against the hardware fingerprint of this installation.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleActivate} disabled={licenseKey.length < 8 || activating} style={{ gap: 6 }}>
                {activating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Activating...</> : 'Activate Module'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
