'use client';
import React, { useEffect, useState, useCallback } from 'react';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

export interface Toast {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message?: string;
  duration?: number;
}

const TYPE_CONFIG = {
  success: { icon: CheckCircle2, color: '#10b981', label: 'Success' },
  error:   { icon: XCircle,      color: '#ef4444', label: 'Error' },
  warning: { icon: AlertTriangle, color: '#f59e0b', label: 'Warning' },
  info:    { icon: Info,          color: '#3b82f6', label: 'Info' },
};

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const [exiting, setExiting] = useState(false);
  const cfg = TYPE_CONFIG[toast.type];
  const Icon = cfg.icon;
  const dur = toast.duration ?? 4000;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  useEffect(() => {
    const timer = setTimeout(dismiss, dur);
    return () => clearTimeout(timer);
  }, [dur, dismiss]);

  return (
    <div
      className={`premium-toast ${exiting ? 'toast-exit' : 'toast-enter'}`}
      role="alert"
      style={{ '--toast-color': cfg.color } as React.CSSProperties}
    >
      {/* Left accent line */}
      <div className="premium-toast-accent" />

      {/* Icon */}
      <div className="premium-toast-icon">
        <Icon size={16} strokeWidth={2.5} />
      </div>

      {/* Content */}
      <div className="premium-toast-content">
        <div className="premium-toast-title">{toast.title}</div>
        {toast.message && <div className="premium-toast-message">{toast.message}</div>}
      </div>

      {/* Dismiss */}
      <button className="premium-toast-dismiss" onClick={dismiss} aria-label="Dismiss">
        <X size={14} strokeWidth={2} />
      </button>
    </div>
  );
}

export default function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="premium-toast-container">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
