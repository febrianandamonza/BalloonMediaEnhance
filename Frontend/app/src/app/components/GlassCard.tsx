'use client';
import React, { useRef, useCallback } from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  tilt?: boolean;
  glow?: string;
  noBorder?: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
  spotlight?: boolean;
}

export default function GlassCard({
  children, className = '', tilt = false, glow, noBorder, onClick, style, spotlight = true,
}: GlassCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!spotlight || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    cardRef.current.style.setProperty('--mouse-x', `${x}%`);
    cardRef.current.style.setProperty('--mouse-y', `${y}%`);
  }, [spotlight]);

  return (
    <div
      ref={cardRef}
      className={`spotlight-card glass-medium ${className}`}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      style={{
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        ...style,
      }}
    >
      {/* Content */}
      <div style={{ position: 'relative', zIndex: 2 }}>
        {children}
      </div>
    </div>
  );
}
