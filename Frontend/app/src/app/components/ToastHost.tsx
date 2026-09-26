'use client';
/* =====================================================================
   TUMPUKAN NOTIFIKASI
   ---------------------------------------------------------------------
   Umur setiap pesan dihitung di sini, bukan lewat setTimeout sekali
   jalan, supaya hitungannya benar-benar dapat dijeda:

     · saat kursor berada di atas tumpukan — operator sedang membaca
     · saat papan ketik memasuki tumpukan — sedang dijelajah tombol
     · saat tab tidak sedang dilihat — pesan tidak habis sia-sia

   Sisa waktu ditampilkan sebagai garis susut di bawah setiap pesan,
   sehingga operator tahu berapa lama lagi pesan akan menghilang.
   ===================================================================== */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useApp, type ToastMessage } from '../context';
import { useReducedMotion } from './fx';
import { CheckCircle2, AlertTriangle, XCircle, Info, X, ArrowRight } from 'lucide-react';

const TONE = {
  success: { color: 'var(--success-400)', icon: <CheckCircle2 size={16} />, label: 'Berhasil' },
  warning: { color: 'var(--warning-400)', icon: <AlertTriangle size={16} />, label: 'Perhatian' },
  error: { color: 'var(--danger-400)', icon: <XCircle size={16} />, label: 'Gagal' },
  info: { color: 'var(--accent-primary)', icon: <Info size={16} />, label: 'Informasi' },
} as const;

export default function ToastHost() {
  const { toasts, dismissToast, dismissAllToasts } = useApp();
  const [paused, setPaused] = useState(false);
  const [hidden, setHidden] = useState(false);

  /* Tab yang tidak terlihat ikut menjeda hitungan. */
  useEffect(() => {
    const onVis = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  if (toasts.length === 0) return null;

  const frozen = paused || hidden;

  return (
    <div
      className="toast-stack"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {toasts.length > 2 && (
        <button className="toast-clear" onClick={dismissAllToasts}>
          Tutup semua ({toasts.length})
        </button>
      )}

      {toasts.map(t => (
        <Toast key={t.id} toast={t} paused={frozen} onDismiss={() => dismissToast(t.id)} />
      ))}
    </div>
  );
}

/* ===================================================================== */
function Toast({
  toast, paused, onDismiss,
}: { toast: ToastMessage; paused: boolean; onDismiss: () => void }) {
  const tone = TONE[toast.tone];
  const reduced = useReducedMotion();

  /* Sisa umur 1 → 0. Disimpan sebagai state agar garis susut ikut
     berhenti saat dijeda, bukan sekadar animasi CSS yang jalan terus. */
  const [left, setLeft] = useState(1);
  const [leaving, setLeaving] = useState(false);
  const remaining = useRef(toast.duration);
  const closed = useRef(false);

  const close = useCallback(() => {
    if (closed.current) return;
    closed.current = true;
    if (reduced) { onDismiss(); return; }
    setLeaving(true);
    window.setTimeout(onDismiss, 240);
  }, [onDismiss, reduced]);

  useEffect(() => {
    /* Durasi 0 berarti pesan menetap sampai ditutup operator. */
    if (toast.duration === 0) return;
    if (paused) return;

    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      remaining.current -= now - last;
      last = now;
      const ratio = Math.max(0, remaining.current / toast.duration);
      setLeft(ratio);
      if (ratio <= 0) { close(); return; }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, toast.duration, close]);

  /* Pesan berulang tidak perlu disetel ulang di sini: pushToast memberi
     id baru setiap kali pencacah naik, sehingga React memasang komponen
     ini dari awal dan hitungan umurnya otomatis penuh kembali. */

  return (
    <div
      className={`toast ${leaving ? 'out' : ''}`}
      style={{ ['--toast-accent' as string]: tone.color }}
      role={toast.tone === 'error' ? 'alert' : 'status'}
      aria-live={toast.tone === 'error' ? 'assertive' : 'polite'}
    >
      <span className="toast-icon" aria-hidden>{tone.icon}</span>

      <span className="toast-body">
        <span className="toast-head">
          <span className="toast-title">{toast.title}</span>
          {toast.count > 1 && (
            <span className="toast-count" title={`Terjadi ${toast.count} kali`}>
              ×{toast.count}
            </span>
          )}
        </span>
        {toast.detail && <span className="toast-detail">{toast.detail}</span>}

        {toast.action && (
          <button
            className="toast-action"
            onClick={() => { toast.action?.onClick(); close(); }}
          >
            {toast.action.label} <ArrowRight size={12} />
          </button>
        )}
      </span>

      <button className="toast-close" onClick={close} aria-label={`Tutup notifikasi: ${toast.title}`}>
        <X size={14} />
      </button>

      {toast.duration > 0 && (
        <span className="toast-life" aria-hidden>
          <i style={{ transform: `scaleX(${left})` }} />
        </span>
      )}
    </div>
  );
}
