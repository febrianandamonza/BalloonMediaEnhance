'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { useApp } from '../context';
import GlassCard from '../components/GlassCard';
import api, { type AuditLogRecord, type AuditModuleRecord } from '../services/api';
import {
  ScrollText, Search, Download, ShieldCheck, AlertTriangle,
  Activity, FileClock, CircleSlash, Fingerprint, Loader2,
} from 'lucide-react';

/* Kategori bukan lagi enum tetap — daftarnya ditarik dari
   GET /api/v1/audit-modules (lihat AuditModuleRecord), karena modul mana
   saja yang tercatat sepenuhnya ditentukan backend. */
type Category = string;

interface LogEntry {
  ts: string;
  actor: string;
  station: string;
  category: Category;
  action: string;
  resource: string;
  ip: string;
  status: number;
}

const FALLBACK_CATEGORY = 'Sistem';

/** Tidak ada info warna dari /audit-modules, jadi badge dipilih deterministik
    dari nama kategori sendiri — kategori yang sama selalu dapat warna yang
    sama, tanpa perlu peta warna per-kategori yang di-hardcode. */
const BADGE_PALETTE = ['badge-info', 'badge-warning', 'badge-success', 'badge-neutral', 'badge-danger'] as const;
function badgeForCategory(cat: string): string {
  let hash = 0;
  for (let i = 0; i < cat.length; i++) hash = (hash * 31 + cat.charCodeAt(i)) >>> 0;
  return BADGE_PALETTE[hash % BADGE_PALETTE.length];
}

function relationName(value: { name?: string;[key: string]: unknown } | string | undefined): string | undefined {
  return typeof value === 'string' ? value : value?.name;
}

/** Kategori, aktor, dan "stasiun" datang sebagai objek relasi:
    module.name → category, user.full_name → actor, user.role.name →
    station. Field flat lama dipertahankan sebagai fallback. */
function mapAuditLogRecord(record: AuditLogRecord): LogEntry {
  const status = Number(record.status ?? record.status_code);
  return {
    ts: String(record.timestamp ?? record.created_at ?? record.ts ?? ''),
    actor: String(record.user?.full_name ?? record.actor ?? record.user?.username ?? record.username ?? 'system'),
    station: String(relationName(record.user?.role) ?? record.station ?? record.station_code ?? '—'),
    category: relationName(record.module) ?? record.category ?? FALLBACK_CATEGORY,
    action: String(record.action ?? '—'),
    resource: String(record.resource ?? record.description ?? ''),
    ip: String(record.ip ?? record.ip_address ?? '—'),
    status: Number.isFinite(status) ? status : 200,
  };
}

export default function AuditLogPage() {
  const { pushToast, notify, t } = useApp();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<'all' | Category>('all');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [modules, setModules] = useState<AuditModuleRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.getAuditLogs(), api.getAuditModules()])
      .then(([logRecords, moduleRecords]) => {
        if (cancelled) return;
        setLogs(logRecords.map(mapAuditLogRecord));
        setModules(moduleRecords);
      })
      .catch(() => {
        if (cancelled) return;
        pushToast({
          tone: 'error',
          title: 'Gagal memuat audit trail',
          detail: 'Tidak bisa terhubung ke server. Coba muat ulang halaman.',
        });
        notify({
          title: 'Gagal memuat audit trail',
          detail: 'Tidak bisa terhubung ke server. Coba muat ulang halaman.',
          severity: 'peringatan',
          category: 'Keamanan',
          source: 'Audit Trail',
          page: 'audit-log',
          silent: true,
        });
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [pushToast, notify]);

  /* Jejak audit bersifat append-only; entri terbaru ditampilkan di atas
     berdasarkan waktu, bukan diasumsikan dari urutan respons backend. */
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...logs]
      .sort((a, b) => new Date(b.ts).getTime() - new Date(a.ts).getTime())
      .filter(l => {
        if (category !== 'all' && l.category !== category) return false;
        if (!q) return true;
        return l.actor.toLowerCase().includes(q)
          || l.action.toLowerCase().includes(q)
          || l.resource.toLowerCase().includes(q)
          || l.station.toLowerCase().includes(q);
      });
  }, [logs, query, category]);

  /* Gabungan nama modul dari /audit-modules dengan kategori yang benar-benar
     muncul di logs — supaya entri lama yang modul-nya sudah dihapus/diganti
     nama di backend tetap punya tombol filter, bukan cuma daftar resmi. */
  const categoryOptions = useMemo(() => {
    const set = new Set<string>();
    for (const m of modules) if (m.name) set.add(m.name);
    for (const l of logs) set.add(l.category);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [modules, logs]);

  const failures = logs.filter(l => l.status >= 400).length;
  /* category kini nama modul bebas dari backend (mis. "License Manager"),
     bukan lagi kunci 'license' yang tetap — dicocokkan lewat substring. */
  const licenseEvents = logs.filter(l => l.category.toLowerCase().includes('lisensi') || l.category.toLowerCase().includes('license')).length;

  const exportCsv = () => {
    const header = 'timestamp,actor,station,category,action,resource,ip,status';
    const rows = filtered.map(l =>
      [l.ts, l.actor, l.station, l.category, l.action, `"${l.resource}"`, l.ip, l.status].join(','));
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-trail-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ tone: 'success', title: 'Audit trail diekspor', detail: `${filtered.length} entri disimpan sebagai CSV.` });
    notify({
      title: 'Audit trail diekspor',
      detail: `${filtered.length} entri disimpan sebagai CSV.`,
      severity: 'informasi',
      category: 'Keamanan',
      source: 'Audit Trail',
      page: 'audit-log',
      silent: true,
    });
  };
  function formatDates(tanggal: string) {
    const date = new Date(tanggal);

    const formatted = new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
    return formatted;
  }

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><ScrollText size={22} /> {t('Audit Trail')}</h1>
          <p className="page-description">
            {t('Catatan aktivitas sistem yang bersifat append-only — tidak dapat diubah maupun dihapus dari antarmuka operator.')}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={exportCsv}>
          <Download size={15} /> Ekspor CSV
        </button>
      </div>

      <div className="lic-summary">
        <Tile icon={<Activity size={19} />} accent="var(--accent-primary)" label={t('Total Entri')} value={String(logs.length)} />
        <Tile icon={<ShieldCheck size={19} />} accent="var(--accent-emerald)" label={t('Berhasil')} value={String(logs.length - failures)} />
        <Tile icon={<AlertTriangle size={19} />} accent="var(--warning-400)" label={t('Ditolak / Gagal')} value={String(failures)} />
        <Tile icon={<Fingerprint size={19} />} accent="var(--accent-tertiary)" label={t('Peristiwa Lisensi')} value={String(licenseEvents)} />
      </div>

      <GlassCard tilt={false} style={{ padding: 13, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder={t('Cari aktor, aksi, atau objek…')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 34 }}
            />
          </div>
          <div className="seg" style={{ flexWrap: 'wrap' }}>
            <button className={category === 'all' ? 'on' : ''} onClick={() => setCategory('all')}>{t('Semua')}</button>
            {categoryOptions.map(c => (
              <button key={c} className={category === c ? 'on' : ''} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
          </div>
        </div>
      </GlassCard>

      <GlassCard tilt={false}>
        <div className="section-head">
          <FileClock size={15} /> Riwayat Aktivitas
          <span className="sh-sub">{filtered.length} entri ditampilkan · terbaru di atas</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('Waktu (WIB)')}</th><th>{t('Aktor')}</th><th>{t('Role')}</th><th>{t('Modul')}</th>
                <th>{t('Aksi')}</th><th>{t('Deskripsi')}</th><th>{t('Alamat IP')}</th><th style={{ textAlign: 'center' }}>{t('Status')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((l, i) => (
                <tr key={`${l.ts}-${i}`}>
                  <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>{formatDates(l.ts)}</td>
                  <td style={{ fontWeight: 600 }}>{l.actor}</td>
                  <td className="font-mono text-xs">{l.station}</td>
                  <td><span className={`badge ${badgeForCategory(l.category)}`}>{l.category}</span></td>
                  <td className="font-mono text-xs">{l.action}</td>
                  <td style={{ fontSize: 12 }}>{l.resource}</td>
                  <td className="font-mono text-xs">{l.ip}</td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`badge badge-${l.status >= 400 ? 'danger' : 'success'}`}>{l.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {loading && (
          <div className="empty-state">
            <span className="empty-state-ico"><Loader2 size={22} className="spin" /></span>
            <h4>{t('Memuat audit trail…')}</h4>
          </div>
        )}

        {!loading && filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-ico"><CircleSlash size={22} /></span>
            <h4>{t('Tidak ada entri yang cocok')}</h4>
            <p>{t('Ubah kata kunci pencarian atau pilih kategori aktivitas yang berbeda.')}</p>
          </div>
        )}
      </GlassCard>

      {/* <div className="key-hint" style={{ marginTop: 18 }}>
        <ShieldCheck size={15} style={{ flexShrink: 0, marginTop: 1, color: 'var(--accent-primary)' }} />
        <span>
          Setiap entri disimpan pada basis data lokal dengan retensi 1.095 hari. Penghapusan
          hanya dapat dilakukan melalui prosedur pemeliharaan basis data oleh administrator sistem
          dan tetap meninggalkan catatan operasi penghapusan.
        </span>
      </div> */}
    </div>
  );
}

function Tile({ icon, accent, label, value }: { icon: React.ReactNode; accent: string; label: string; value: string }) {
  return (
    <div className="lic-summary-tile">
      <span
        className="ico"
        style={{
          background: `color-mix(in srgb, ${accent} 14%, transparent)`,
          border: `1px solid color-mix(in srgb, ${accent} 24%, transparent)`,
          color: accent,
        }}
      >
        {icon}
      </span>
      <span>
        <span className="lbl">{label}</span>
        <span className="val">{value}</span>
      </span>
    </div>
  );
}
