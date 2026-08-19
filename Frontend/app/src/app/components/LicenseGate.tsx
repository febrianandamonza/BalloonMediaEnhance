'use client';
import React, { ReactNode } from 'react';
import { useApp } from '../context';
import { FEATURE_TO_LICENSE, LICENSE_BY_ID } from '../lib/licensing';
import { Lock, KeyRound, Hash } from 'lucide-react';

interface LicenseGateProps {
  /** Kode sub-lisensi, mis. "1.3b" */
  moduleCode: string;
  /** Nama resmi sub-modul — ditampilkan pada pesan penguncian */
  moduleName: string;
  children: ReactNode;
}

/**
 * Membungkus halaman modul. Bila lisensi induk belum aktif, konten tetap
 * dirender di belakang lapisan buram agar operator memahami kapabilitas apa
 * yang tersedia setelah lisensi diaktifkan.
 */
export default function LicenseGate({ moduleCode, moduleName, children }: LicenseGateProps) {
  const { isLicensed, setCurrentPage, t } = useApp();

  if (isLicensed(moduleCode)) return <>{children}</>;

  const licenseId = FEATURE_TO_LICENSE[moduleCode];
  const def = licenseId ? LICENSE_BY_ID[licenseId] : undefined;

  return (
    <div className="license-gate license-gate-locked" style={{ minHeight: '60vh', position: 'relative' }}>
      <div className="license-gate-content" aria-hidden>{children}</div>

      <div className="license-gate-overlay">
        <span className="lock-icon"><Lock size={26} /></span>
        <h3>{t('Lisensi Modul Diperlukan')}</h3>
        <p>
          <strong>{moduleName}</strong> termasuk dalam lisensi{' '}
          <strong>{def?.title ?? 'modul terkait'}</strong>. Aktifkan lisensi tersebut pada
          License Manager menggunakan License Number yang tercetak di sertifikat.
        </p>

        {/* {def && (
          <span className="gate-serial">
            <Hash size={12} /> {def.contractRef}-… · berlaku s.d. {def.expiryDate}
          </span>
        )} */}

        {/* <button className="btn btn-primary" onClick={() => setCurrentPage('licenses')} style={{ gap: 7 }}>
          <KeyRound size={14} /> Buka License Manager
        </button> */}
      </div>
    </div>
  );
}
