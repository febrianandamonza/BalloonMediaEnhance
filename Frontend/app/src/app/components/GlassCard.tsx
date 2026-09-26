'use client';
import React, { useRef, useCallback } from 'react';
import { useReducedMotion } from './fx';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  /** Kemiringan 3D mengikuti kursor — matikan pada kartu berisi tabel/peta */
  tilt?: boolean;
  /** Warna sorotan kursor; kosongkan untuk memakai biru baku */
  glow?: string;
  noBorder?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}

/**
 * Panel kaca — dasar visual untuk hampir seluruh kartu di aplikasi.
 *
 * Kemiringan dan sorotan ditulis langsung ke custom property pada elemen,
 * bukan melalui state React. Dengan begitu gerakan kursor ditangani oleh
 * compositor peramban dan tidak memicu render ulang pohon komponen —
 * penting karena satu halaman bisa memuat belasan kartu sekaligus.
 */
export default function GlassCard({
  children, className = '', tilt = true, glow, noBorder, onClick, style,
}: GlassCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const raf = useRef(0);
  const reduced = useReducedMotion();

  const handleMove = useCallback((e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;

    cancelAnimationFrame(raf.current);
    raf.current = requestAnimationFrame(() => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;

      el.style.setProperty('--sx', `${px * 100}%`);
      el.style.setProperty('--sy', `${py * 100}%`);

      if (tilt && !reduced) {
        el.style.transform =
          `perspective(1000px) rotateX(${(0.5 - py) * 6}deg) ` +
          `rotateY(${(px - 0.5) * 6}deg) scale(1.006)`;
      }
    });
  }, [tilt, reduced]);

  const handleEnter = useCallback(() => {
    ref.current?.setAttribute('data-hot', '1');
  }, []);

  const handleLeave = useCallback(() => {
    cancelAnimationFrame(raf.current);
    const el = ref.current;
    if (!el) return;
    el.setAttribute('data-hot', '0');
    el.style.transform = '';
  }, []);

  return (
    <div
      ref={ref}
      className={`glass-card-3d lq spotlight ${noBorder ? 'no-edge' : ''} ${className}`}
      onClick={onClick}
      onMouseMove={handleMove}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        padding: 20,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 260ms var(--ease-out), box-shadow 260ms var(--ease-out)',
        ...(glow ? ({ '--spot-tint': glow } as React.CSSProperties) : null),
        ...style,
      }}
    >
      {children}
    </div>
  );
}
