'use client';
/* =====================================================================
   PEMUTUSAN DAYA DARURAT
   ---------------------------------------------------------------------
   Tombol ini selalu terlihat dan tidak pernah dibatasi lisensi — ia
   memutus daya 230 V yang mengalir ke platform melalui kabel penambat.

   Karena akibatnya nyata dan tidak dapat dibatalkan dari antarmuka,
   alurnya dibuat berlapis:

     1. Panel konfirmasi memuat daftar akibat yang akan terjadi.
     2. Operator harus mengetik kata kunci konfirmasi — bukan sekadar
        menekan tombol, agar tidak terpicu karena salah klik.
     3. Setelah dieksekusi, keadaan tersimpan sehingga memuat ulang
        halaman tidak memulihkannya. Pemulihan hanya lewat prosedur
        reset teknisi, yang juga meminta konfirmasi tersendiri.

   Seluruh modul yang bergantung pada umpan langsung membaca keadaan ini
   dari konteks dan berpindah sendiri ke tampilan luring.
   ===================================================================== */

import React, { useEffect, useState } from 'react';
import { useApp } from '../context';
import { Zap, ShieldAlert, Power, RotateCcw, X, AlertTriangle } from 'lucide-react';

const CONFIRM_WORD = 'SHUTDOWN';

export default function EmergencyButton() {
  const {
    t, offline, shutdownAt,
    showEmergencyModal, setShowEmergencyModal,
    executeShutdown, restorePlatform, pushToast, setCurrentPage,
  } = useApp();

  const [typed, setTyped] = useState('');
  const [resetOpen, setResetOpen] = useState(false);

  /* Escape menutup panel mana pun yang sedang terbuka. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setShowEmergencyModal(false);
      setResetOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setShowEmergencyModal]);

  const openShutdown = () => {
    setTyped('');
    setShowEmergencyModal(true);
  };

  const confirm = () => {
    if (typed.trim().toUpperCase() !== CONFIRM_WORD) return;
    executeShutdown();
    setShowEmergencyModal(false);
    setTyped('');
    pushToast({
      tone: 'error',
      duration: 0,
      title: t('Daya platform diputus'),
      detail: t('Seluruh modul yang bergantung pada umpan langsung dinonaktifkan.'),
      action: { label: t('Audit Trail'), onClick: () => setCurrentPage('audit-log') },
    });
  };

  const restore = () => {
    restorePlatform();
    setResetOpen(false);
    pushToast({
      tone: 'success',
      title: t('Daya platform dipulihkan'),
      detail: t('Seluruh modul kembali menerima umpan langsung.'),
    });
  };

  const stamp = shutdownAt
    ? new Date(shutdownAt).toLocaleString('id-ID', { hour12: false, timeZone: 'Asia/Jakarta' })
    : null;

  return (
    <>
      {/* Bilah keadaan luring — menetap selama daya masih terputus */}
      {offline && (
        <div className="offline-bar" role="status">
          <span className="offline-bar-mark"><Power size={13} /></span>
          <span className="offline-bar-text">
            <b>{t('PLATFORM OFFLINE')}</b>
            {stamp && <i>{t('Daya diputus pada')} {stamp} WIB</i>}
          </span>
          <button className="btn btn-secondary btn-sm" onClick={() => setResetOpen(true)}>
            <RotateCcw size={13} /> {t('Reset Sistem')}
          </button>
        </div>
      )}

      <button
        className={`emergency-btn ${offline ? 'is-off' : ''}`}
        onClick={offline ? () => setResetOpen(true) : openShutdown}
        title={offline ? t('Prosedur Reset Teknisi') : t('Pemutusan Daya Darurat')}
        aria-label={offline ? t('Prosedur Reset Teknisi') : t('Pemutusan Daya Darurat')}
        id="emergency-shutdown-btn"
        style={{ display: 'none' }}
      >
        {offline ? <RotateCcw size={19} /> : <Zap size={19} />}
      </button>

      {/* ---------- Konfirmasi pemutusan ---------- */}
      {showEmergencyModal && !offline && (
        <div className="modal-backdrop" onClick={() => setShowEmergencyModal(false)}>
          <div
            className="modal lq lq-thick"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 480 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 className="danger-head">
                <ShieldAlert size={18} /> {t('Pemutusan Daya Darurat')}
              </h3>
              <button
                className="modal-x"
                onClick={() => setShowEmergencyModal(false)}
                aria-label={t('Tutup')}
              >
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <div className="danger-callout">
                <AlertTriangle size={16} />
                <span>{t('Hentikan seluruh daya ke platform')} — 230 VAC</span>
              </div>

              <p className="modal-lead">{t('Tindakan ini akan:')}</p>
              <ul className="modal-list">
                <li>{t('Memutus daya AC 230 V melalui kabel penambat')}</li>
                <li>{t('Menghentikan seluruh operasi payload dan gimbal')}</li>
                <li>{t('Menonaktifkan modul analitik yang bergantung pada umpan langsung')}</li>
                <li>{t('Mencatat kejadian pada Audit Trail')}</li>
              </ul>

              <p className="modal-note">
                {t('Pemulihan hanya dapat dilakukan melalui prosedur reset oleh teknisi.')}
              </p>

              <label className="confirm-field">
                <span>
                  {t('Ketik')} <b>{CONFIRM_WORD}</b> {t('untuk mengonfirmasi')}
                </span>
                <input
                  className="form-input font-mono"
                  value={typed}
                  onChange={e => setTyped(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') confirm(); }}
                  placeholder={CONFIRM_WORD}
                  autoFocus
                  spellCheck={false}
                  aria-label={`${t('Ketik')} ${CONFIRM_WORD}`}
                />
              </label>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEmergencyModal(false)}>
                {t('Batal')}
              </button>
              <button
                className="btn btn-danger"
                onClick={confirm}
                disabled={typed.trim().toUpperCase() !== CONFIRM_WORD}
              >
                <Power size={15} /> {t('Konfirmasi Pemutusan Daya')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------- Prosedur reset teknisi ---------- */}
      {resetOpen && offline && (
        <div className="modal-backdrop" onClick={() => setResetOpen(false)}>
          <div
            className="modal lq lq-thick"
            onClick={e => e.stopPropagation()}
            style={{ maxWidth: 460 }}
            role="dialog"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <RotateCcw size={17} /> {t('Prosedur Reset Teknisi')}
              </h3>
              <button className="modal-x" onClick={() => setResetOpen(false)} aria-label={t('Tutup')}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">
              <p className="modal-lead">
                {t('Pastikan penyebab pemutusan telah ditangani dan kabel penambat aman sebelum daya dipulihkan.')}
              </p>
              {stamp && (
                <p className="modal-note">
                  {t('Daya diputus pada')} <b>{stamp} WIB</b>
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setResetOpen(false)}>
                {t('Batal')}
              </button>
              <button className="btn btn-primary" onClick={restore}>
                <Power size={15} /> {t('Pulihkan Daya Platform')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
