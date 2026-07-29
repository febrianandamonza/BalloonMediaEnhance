'use client';
import React from 'react';

/* CSS-only radar/satellite visualization — no Three.js dependency */
export default function Globe3D({ phase = 'idle' }: { phase?: string }) {
  return (
    <div style={{
      position: 'absolute', inset: 0, zIndex: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.8s ease',
      opacity: phase === 'transitioning' ? 0 : 1,
      overflow: 'hidden',
    }}>
      {/* Dot grid background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: 'radial-gradient(rgba(88,166,255,0.08) 1px, transparent 1px)',
        backgroundSize: '32px 32px',
      }} />

      {/* Concentric radar rings */}
      <div className="radar-container">
        <div className="radar-ring radar-ring-1" />
        <div className="radar-ring radar-ring-2" />
        <div className="radar-ring radar-ring-3" />
        <div className="radar-ring radar-ring-4" />

        {/* Sweep line */}
        <div className="radar-sweep" />

        {/* Center dot */}
        <div className="radar-center" />

        {/* Satellite dots on orbital paths */}
        <div className="orbital-dot orbital-dot-1" />
        <div className="orbital-dot orbital-dot-2" />
        <div className="orbital-dot orbital-dot-3" />
      </div>

      <style>{`
        .radar-container {
          position: relative;
          width: 420px;
          height: 420px;
        }

        .radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(88, 166, 255, 0.06);
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
        }

        .radar-ring-1 { width: 120px; height: 120px; border-color: rgba(88, 166, 255, 0.1); }
        .radar-ring-2 { width: 220px; height: 220px; border-color: rgba(88, 166, 255, 0.07); }
        .radar-ring-3 { width: 320px; height: 320px; border-color: rgba(88, 166, 255, 0.05); }
        .radar-ring-4 { width: 420px; height: 420px; border-color: rgba(88, 166, 255, 0.03); }

        .radar-sweep {
          position: absolute;
          top: 50%; left: 50%;
          width: 50%;
          height: 1px;
          transform-origin: left center;
          background: linear-gradient(90deg, rgba(88, 166, 255, 0.3), transparent);
          animation: radar-rotate 6s linear infinite;
        }

        @keyframes radar-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .radar-center {
          position: absolute;
          top: 50%; left: 50%;
          width: 6px; height: 6px;
          border-radius: 50%;
          background: rgba(88, 166, 255, 0.6);
          transform: translate(-50%, -50%);
          box-shadow: 0 0 12px rgba(88, 166, 255, 0.3);
        }

        .orbital-dot {
          position: absolute;
          width: 4px; height: 4px;
          border-radius: 50%;
          background: rgba(88, 166, 255, 0.5);
          box-shadow: 0 0 6px rgba(88, 166, 255, 0.2);
        }

        .orbital-dot-1 {
          animation: orbit-1 12s linear infinite;
        }
        .orbital-dot-2 {
          animation: orbit-2 18s linear infinite;
        }
        .orbital-dot-3 {
          animation: orbit-3 24s linear infinite;
        }

        @keyframes orbit-1 {
          from { transform: rotate(0deg) translateX(60px) rotate(0deg); }
          to   { transform: rotate(360deg) translateX(60px) rotate(-360deg); }
        }
        @keyframes orbit-2 {
          from { transform: rotate(120deg) translateX(110px) rotate(-120deg); }
          to   { transform: rotate(480deg) translateX(110px) rotate(-480deg); }
        }
        @keyframes orbit-3 {
          from { transform: rotate(240deg) translateX(160px) rotate(-240deg); }
          to   { transform: rotate(600deg) translateX(160px) rotate(-600deg); }
        }
      `}</style>
    </div>
  );
}
