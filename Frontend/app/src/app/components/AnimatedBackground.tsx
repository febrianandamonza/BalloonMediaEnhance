'use client';
import React from 'react';
import { useApp } from '../context';

export default function AnimatedBackground() {
  const { theme } = useApp();
  const isLight = theme === 'light';

  return (
    <div className="animated-bg" aria-hidden="true" style={{
      background: isLight
        ? 'linear-gradient(135deg, #f0f2f7, #e8eaf0, #f0f2f7)'
        : 'var(--bg-root)',
    }}>
      <div className="orb orb-1" style={{
        background: isLight
          ? 'radial-gradient(circle, rgba(0,136,212,0.06), transparent 70%)'
          : undefined,
      }} />
      <div className="orb orb-2" style={{
        background: isLight
          ? 'radial-gradient(circle, rgba(51,102,204,0.05), transparent 70%)'
          : undefined,
      }} />
      <div className="orb orb-3" style={{
        background: isLight
          ? 'radial-gradient(circle, rgba(124,77,255,0.04), transparent 70%)'
          : undefined,
      }} />
    </div>
  );
}
