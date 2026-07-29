'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../context';
import { Zap, AlertTriangle, ShieldAlert, Radio, X } from 'lucide-react';

export default function EmergencyButton() {
  const { showEmergencyModal, setShowEmergencyModal, addToast } = useApp();
  const [phase, setPhase] = useState<'confirm' | 'countdown' | 'executing' | 'done'>('confirm');
  const [countdown, setCountdown] = useState(5);

  const handleEmergency = () => {
    setPhase('confirm');
    setCountdown(5);
    setShowEmergencyModal(true);
  };

  const startShutdown = useCallback(() => {
    setPhase('countdown');
    setCountdown(5);
  }, []);

  useEffect(() => {
    if (phase !== 'countdown') return;
    if (countdown <= 0) {
      setPhase('executing');
      setTimeout(() => {
        setPhase('done');
        addToast({
          type: 'error',
          title: 'EMERGENCY SHUTDOWN EXECUTED',
          message: 'All carrier power has been cut. Ground crew notified. Manual reset required.',
          duration: 8000,
        });
      }, 2000);
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [phase, countdown, addToast]);

  const cancelShutdown = () => {
    setPhase('confirm');
    setCountdown(5);
    setShowEmergencyModal(false);
    if (phase === 'countdown') {
      addToast({ type: 'info', title: 'Shutdown Cancelled', message: 'Emergency shutdown sequence aborted.' });
    }
  };

  const closeAfterDone = () => {
    setShowEmergencyModal(false);
    setPhase('confirm');
    setCountdown(5);
  };

  return (
    <>
      <button
        className="emergency-btn"
        onClick={handleEmergency}
        title="Emergency Shutdown — Always accessible"
        id="emergency-shutdown-btn"
      >
        <Zap size={22} />
      </button>

      {showEmergencyModal && (
        <div className="modal-backdrop" onClick={phase === 'done' ? closeAfterDone : cancelShutdown}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480 }}>
            {/* === CONFIRM PHASE === */}
            {phase === 'confirm' && (
              <>
                <div className="modal-header">
                  <h3 style={{ color: 'var(--danger-400)', display: 'flex', alignItems: 'center', gap: 10, fontSize: 17, fontWeight: 700 }}>
                    <ShieldAlert size={20} /> Emergency Shutdown
                  </h3>
                  <button className="btn btn-ghost" onClick={cancelShutdown} style={{ padding: 4 }}>
                    <X size={18} />
                  </button>
                </div>
                <div className="modal-body">
                  <div style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid rgba(239,68,68,0.2)',
                    borderRadius: 12, padding: 16, marginBottom: 16,
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                  }}>
                    <AlertTriangle size={20} style={{ color: 'var(--danger-400)', flexShrink: 0, marginTop: 1 }} />
                    <p style={{ color: 'var(--danger-400)', fontWeight: 600, fontSize: 14, lineHeight: 1.5 }}>
                      WARNING: This will immediately cut all carrier power through the tether cable (230VAC).
                    </p>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 10 }}>
                    This action will:
                  </p>
                  <ul style={{ color: 'var(--text-secondary)', fontSize: 13, paddingLeft: 20, lineHeight: 2 }}>
                    <li>Cut AC power to the Air Carrier immediately</li>
                    <li>Disable all payload operations (Epsilon gimbal)</li>
                    <li>Notify all connected users and ground crew</li>
                    <li>Log the event in audit trail</li>
                  </ul>
                  <p style={{ color: 'var(--text-muted)', fontSize: 12, marginTop: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Radio size={14} /> A technician will need to manually reset the system after shutdown.
                  </p>
                </div>
                <div className="modal-footer">
                  <button className="btn btn-secondary" onClick={cancelShutdown}>Cancel</button>
                  <button className="btn btn-danger" onClick={startShutdown} style={{ gap: 8 }}>
                    <Zap size={15} /> INITIATE EMERGENCY SHUTDOWN
                  </button>
                </div>
              </>
            )}

            {/* === COUNTDOWN PHASE === */}
            {phase === 'countdown' && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{
                  width: 100, height: 100, borderRadius: '50%', margin: '0 auto 24px',
                  border: '3px solid rgba(239,68,68,0.2)',
                  borderTopColor: 'var(--danger-400)',
                  animation: 'spin 1s linear infinite',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  position: 'relative',
                }}>
                  <span style={{
                    fontSize: 36, fontWeight: 900, color: 'var(--danger-400)',
                    fontFamily: 'var(--font-code)',
                    textShadow: '0 0 20px rgba(239,68,68,0.5)',
                    animation: 'none',
                  }}>{countdown}</span>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger-400)', marginBottom: 8 }}>
                  SHUTDOWN IN {countdown}s
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>
                  Press cancel to abort the shutdown sequence
                </p>
                <button className="btn btn-secondary" onClick={cancelShutdown} style={{ padding: '10px 32px' }}>
                  Cancel Shutdown
                </button>
              </div>
            )}

            {/* === EXECUTING PHASE === */}
            {phase === 'executing' && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
                  background: 'rgba(239,68,68,0.1)',
                  border: '2px solid rgba(239,68,68,0.3)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  animation: 'pulse 0.5s ease-in-out infinite',
                }}>
                  <Zap size={32} style={{ color: 'var(--danger-400)' }} />
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 700, color: 'var(--danger-400)' }}>
                  Executing Shutdown...
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8 }}>
                  Cutting carrier power and notifying ground crew
                </p>
              </div>
            )}

            {/* === DONE PHASE === */}
            {phase === 'done' && (
              <div style={{ padding: 40, textAlign: 'center' }}>
                <div style={{
                  width: 90, height: 90, borderRadius: '50%', margin: '0 auto 24px',
                  background: 'rgba(239,68,68,0.08)',
                  border: '2px solid rgba(239,68,68,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 0 40px rgba(239,68,68,0.15)',
                }}>
                  <ShieldAlert size={40} style={{ color: 'var(--danger-400)' }} />
                </div>
                <h3 style={{ fontSize: 20, fontWeight: 800, color: 'var(--danger-400)', marginBottom: 8 }}>
                  SHUTDOWN COMPLETE
                </h3>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 8 }}>
                  All carrier power has been cut successfully.
                </p>
                <div style={{
                  display: 'inline-flex', flexDirection: 'column', gap: 6,
                  background: 'rgba(0,0,0,0.2)', padding: '12px 20px', borderRadius: 12,
                  border: '1px solid var(--border-subtle)', marginTop: 12,
                  textAlign: 'left', fontSize: 12,
                }}>
                  {[
                    { label: 'Power', value: 'DISCONNECTED', color: 'var(--danger-400)' },
                    { label: 'Payload', value: 'OFFLINE', color: 'var(--danger-400)' },
                    { label: 'Ground Crew', value: 'NOTIFIED', color: 'var(--warning-400)' },
                    { label: 'Audit Log', value: 'RECORDED', color: 'var(--success-400)' },
                  ].map(item => (
                    <div key={item.label} style={{ display: 'flex', justifyContent: 'space-between', gap: 32 }}>
                      <span style={{ color: 'var(--text-muted)' }}>{item.label}</span>
                      <span style={{ fontWeight: 700, fontFamily: 'var(--font-code)', color: item.color }}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <button className="btn btn-secondary" onClick={closeAfterDone} style={{ marginTop: 24, padding: '10px 32px' }}>
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
}
