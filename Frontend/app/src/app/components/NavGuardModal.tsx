'use client';
/* =====================================================================
   KONFIRMASI NAVIGASI
   ---------------------------------------------------------------------
   Muncul saat operator mencoba berpindah halaman (lewat sidebar,
   dashboard, notifikasi, dsb.) selagi ada proses yang sedang berjalan —
   lihat useNavGuard() di context.tsx untuk halaman mana yang memasang
   penjaganya dan pada kondisi apa.

   Dialog reload/tutup tab tidak lewat sini — peramban tidak mengizinkan
   teks custom pada dialog beforeunload, jadi itu tetap memakai prompt
   bawaan peramban.
   ===================================================================== */

import React, { useEffect } from 'react';
import { useApp } from '../context';
import { AlertTriangle, X } from 'lucide-react';

export default function NavGuardModal() {
  const { pendingNav, confirmPendingNav, cancelPendingNav, t } = useApp();

  useEffect(() => {
    if (!pendingNav) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') cancelPendingNav(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pendingNav, cancelPendingNav]);

  if (!pendingNav) return null;

  return (
    <div className="modal-backdrop" onClick={cancelPendingNav}>
      <div
        className="modal lq lq-thick"
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: 440 }}
        role="dialog"
        aria-modal="true"
      >
        <div className="modal-header">
          <h3 className="danger-head">
            <AlertTriangle size={18} /> {t('Proses Sedang Berjalan')}
          </h3>
          <button className="modal-x" onClick={cancelPendingNav} aria-label={t('Tutup')}>
            <X size={16} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-lead">{pendingNav.message}</p>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={cancelPendingNav}>
            {t('Batal')}
          </button>
          {/* <button className="btn btn-danger" onClick={confirmPendingNav} autoFocus>
            {t('Tinggalkan Halaman')}
          </button> */}
        </div>
      </div>
    </div>
  );
}
