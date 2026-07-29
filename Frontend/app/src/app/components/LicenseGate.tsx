'use client';
import React, { ReactNode } from 'react';
import { useApp } from '../context';
import { Lock, KeyRound } from 'lucide-react';

interface LicenseGateProps {
  moduleCode: string;
  moduleName: string;
  children: ReactNode;
}

export default function LicenseGate({ moduleCode, moduleName, children }: LicenseGateProps) {
  const { isLicensed, setCurrentPage } = useApp();

  if (isLicensed(moduleCode)) {
    return <>{children}</>;
  }

  return (
    <div className="license-gate license-gate-locked" style={{ minHeight: '60vh', position: 'relative' }}>
      <div className="license-gate-content">
        {children}
      </div>
      <div className="license-gate-overlay">
        <div className="lock-icon" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={32} style={{ color: 'var(--text-muted)' }} />
        </div>
        <h3>Module License Required</h3>
        <p>
          <strong>{moduleName}</strong> requires an active license (Code: {moduleCode}).
          Contact your administrator to activate this module.
        </p>
        <button className="btn btn-primary" onClick={() => setCurrentPage('licenses')} style={{ gap: 8 }}>
          <KeyRound size={15} /> Go to License Manager
        </button>
      </div>
    </div>
  );
}
