'use client';
import React from 'react';
import { useApp } from '../context';

export default function AnimatedBackground() {
  const { theme } = useApp();
  const isLight = theme === 'light';

  return (
    <div className="animated-bg" aria-hidden="true" style={{
      background: isLight
        ? '#f8fafc'
        : 'linear-gradient(180deg, #0a0e17 0%, #0d1117 50%, #111827 100%)',
    }}>
      {/* Subtle gradient mesh — dark mode only */}
      {!isLight && (
        <>
          <div style={{
            position: 'absolute',
            width: '60vw', height: '60vh',
            top: '-10%', left: '-10%',
            background: 'radial-gradient(ellipse, rgba(59,130,246,0.04) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />
          <div style={{
            position: 'absolute',
            width: '50vw', height: '50vh',
            bottom: '-10%', right: '-10%',
            background: 'radial-gradient(ellipse, rgba(99,102,241,0.03) 0%, transparent 70%)',
            filter: 'blur(60px)',
            pointerEvents: 'none',
          }} />
        </>
      )}
    </div>
  );
}
