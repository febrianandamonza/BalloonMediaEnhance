'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import api, { type FlightMissionRecord } from '../services/api';
import GlassCard from '../components/GlassCard';
import {
  Anchor, Plus, Search, Pencil, X, Boxes, Fingerprint, Gauge,
  CircleCheck, CircleSlash,
} from 'lucide-react';

interface Balloon {
  id: number | string;
  name: string;
  serialNumber: string;
  capacity: string;
  maxAltitude: string;
  status: string;
}

const toNumber = (v: string) => (v.trim() === '' ? 0 : Number(v));

/** Payload POST/PUT /api/v1/balloons — backend memvalidasi PUT sebagai
    full-replace, jadi kelima field ini wajib selalu terisi (bukan
    `undefined`, yang akan hilang dari body lewat JSON.stringify dan
    bikin field itu tidak terkirim sama sekali): { serial_number,
    balloon_name, capacity: 15, max_altitude: 150, status }. */
function balloonPayload(data: Omit<Balloon, 'id'>) {
  return {
    balloon_name: data.name,
    serial_number: data.serialNumber,
    capacity: toNumber(data.capacity),
    max_altitude: toNumber(data.maxAltitude),
    status: data.status,
  };
}

/** mission_status kadang berupa string mentah, kadang objek relasi
    {id, name} — dibaca seragam lewat helper ini (sama seperti di
    InfoPages.tsx). */
function missionStatusName(m: FlightMissionRecord): string {
  const status = m.mission_status;
  return (typeof status === 'string' ? status : status?.name) ?? '';
}

export default function BalloonManagementPage() {
  const { pushToast, notify, t } = useApp();
  const [balloons, setBalloons] = useState<Balloon[]>([]);
  /* Misi aktif — dipakai semata untuk mengecek apakah balon yang sedang
     diedit sedang dalam penerbangan (mission_status "Flight"), sebelum
     mengizinkan statusnya diubah lewat form ini. */
  const [missions, setMissions] = useState<FlightMissionRecord[]>([]);
  const [query, setQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  /* Balon yang sedang diubah — modal yang sama melayani tambah & ubah. */
  const [editing, setEditing] = useState<Balloon | null>(null);

  useEffect(() => {
    const fetchBalloons = async () => {
      try {
        const [data, missionRows] = await Promise.all([
          api.getBalloons() as Promise<Record<string, unknown>[]>,
          api.getFlightMissions().catch(() => []),
        ]);
        const mapped: Balloon[] = data.map((b) => ({
          id: (b.id as string | number) ?? Math.random(),
          name: (b.name as string) || (b.balloon_name as string) || 'Tanpa nama',
          serialNumber: (b.serial_number as string) || '',
          capacity: b.capacity != null ? String(b.capacity) : '',
          maxAltitude: b.max_altitude != null ? String(b.max_altitude) : '',
          status: (b.status as string) || '',
        }));
        setBalloons(mapped);
        setMissions(missionRows);
      } catch (err) {
        console.error('Gagal memuat data balon:', err);
        pushToast({ tone: 'warning', title: t('Gagal memuat data balon'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
        notify({
          title: t('Gagal memuat data balon'),
          detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
          severity: 'peringatan',
          category: 'Operasional',
          source: 'Balloon Management',
          page: 'balloons',
          silent: true,
        });
      }
    };
    fetchBalloons();
  }, [pushToast, notify, t]);

  /* true bila ada misi berstatus "Flight" yang ditugaskan ke balon ini —
     dicocokkan lewat balloon_id atau, kalau relasi GET tidak menyertakan
     id, lewat serial_number (sama seperti resolveMissionBalloon di
     InfoPages.tsx). */
  const isBalloonFlying = (balloon: Balloon) => missions.some(m => {
    if (missionStatusName(m) !== 'Flight') return false;
    const balloonId = m.balloon_id ?? m.balloon?.id;
    if (balloonId != null && String(balloonId) === String(balloon.id)) return true;
    return Boolean(m.balloon?.serial_number) && m.balloon?.serial_number === balloon.serialNumber;
  });

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return balloons;
    return balloons.filter(b => (
      b.name.toLowerCase().includes(q)
      || b.serialNumber.toLowerCase().includes(q)
      || b.status.toLowerCase().includes(q)
    ));
  }, [balloons, query]);

  const availableCount = balloons.filter(b => b.status.toLowerCase() === 'available').length;
  const unavailableCount = balloons.length - availableCount;

  /* Menyimpan hasil ubah data balon. */
  const saveEdit = async (data: Omit<Balloon, 'id'>) => {
    if (!editing) return;
    try {
      await api.updateBalloon(String(editing.id), balloonPayload(data));
      setBalloons(prev => prev.map(x => (x.id === editing.id ? { ...x, ...data } : x)));
      setEditing(null);
      pushToast({
        tone: 'success',
        title: t('Data balon diperbarui'),
        detail: `${data.name}${data.serialNumber ? ` · ${data.serialNumber}` : ''}`,
      });
      notify({
        title: t('Data balon diperbarui'),
        detail: `${data.name}${data.serialNumber ? ` · ${data.serialNumber}` : ''}`,
        severity: 'informasi',
        category: 'Operasional',
        source: 'Balloon Management',
        page: 'balloons',
        silent: true,
      });
    } catch (err) {
      console.error('Gagal memperbarui data balon:', err);
      pushToast({ tone: 'warning', title: t('Gagal menyimpan perubahan'), detail: t('Tidak bisa terhubung ke server. Coba lagi.') });
      notify({
        title: t('Gagal menyimpan perubahan'),
        detail: t('Tidak bisa terhubung ke server. Coba lagi.'),
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Balloon Management',
        page: 'balloons',
        silent: true,
      });
    }
  };

  const createBalloon = async (data: Omit<Balloon, 'id'>) => {
    try {
      const res = await api.createBalloon(balloonPayload(data)) as { id?: string | number };
      const newId = res?.id ?? Math.random();
      setBalloons(prev => [...prev, { ...data, id: newId }]);
      setShowForm(false);
      pushToast({
        tone: 'success',
        title: t('Balon ditambahkan'),
        detail: `${data.name}${data.serialNumber ? ` · ${data.serialNumber}` : ''}`,
      });
      notify({
        title: t('Balon ditambahkan'),
        detail: `${data.name}${data.serialNumber ? ` · ${data.serialNumber}` : ''}`,
        severity: 'informasi',
        category: 'Operasional',
        source: 'Balloon Management',
        page: 'balloons',
        silent: true,
      });
    } catch (err) {
      console.error('Gagal membuat balon:', err);
      pushToast({ tone: 'warning', title: t('Gagal menambahkan balon'), detail: t('Tidak bisa terhubung ke server. Pastikan data valid.') });
      notify({
        title: t('Gagal menambahkan balon'),
        detail: t('Tidak bisa terhubung ke server. Pastikan data valid.'),
        severity: 'peringatan',
        category: 'Operasional',
        source: 'Balloon Management',
        page: 'balloons',
        silent: true,
      });
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><Anchor size={22} /> {t('Balloon Management')}</h1>
          <p className="page-description">
            {t('Manajemen data platform balon — nomor seri, kapasitas, dan ketinggian maksimum operasional.')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <Plus size={15} /> {t('Tambah Balon')}
        </button>
      </div>

      {/* Ringkasan */}
      <div className="lic-summary">
        <Tile icon={<Boxes size={19} />} accent="var(--accent-primary)" label={t('Total Balon')} value={String(balloons.length)} />
        <Tile icon={<CircleCheck size={19} />} accent="var(--accent-emerald)" label={t('Balon Available')} value={String(availableCount)} />
        <Tile icon={<CircleSlash size={19} />} accent="var(--danger-400)" label={t('Balon Unavailable')} value={String(unavailableCount)} />
      </div>

      {/* Toolbar */}
      <GlassCard tilt={false} style={{ padding: 13, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input
            className="form-input"
            placeholder={t('Cari nama, nomor seri, atau status…')}
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: 34 }}
          />
        </div>
      </GlassCard>

      {/* Tabel balon */}
      <GlassCard tilt={false}>
        <div className="section-head">
          <Anchor size={15} /> {t('Daftar Balon')}
          <span className="sh-sub">{filtered.length} {t('dari')} {balloons.length} {t('balon')}</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('Nama')}</th><th>{t('Nomor Seri')}</th><th>{t('Kapasitas')}</th>
                <th>{t('Ketinggian Maks')}</th><th>{t('Status')}</th><th style={{ textAlign: 'right' }}>{t('Aksi')}</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(b => (
                <tr key={b.id}>
                  <td style={{ fontWeight: 600 }}>{b.name}</td>
                  <td className="font-mono text-xs">{b.serialNumber || '-'}</td>
                  <td className="font-mono text-xs">{b.capacity || '-'}</td>
                  <td className="font-mono text-xs">{b.maxAltitude || '-'}</td>
                  <td>{b.status ? <span className="badge badge-info">{b.status}</span> : '-'}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t('Ubah data balon')}
                        aria-label={`${t('Ubah data balon')}: ${b.name}`}
                        onClick={() => setEditing(b)}
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="empty-state">
            <span className="empty-state-ico"><Search size={22} /></span>
            <h4>{t('Tidak ada balon yang cocok')}</h4>
            <p>{t('Ubah kata kunci pencarian, atau tambahkan balon baru.')}</p>
          </div>
        )}
      </GlassCard>

      {editing && (
        <BalloonFormModal
          key={editing.id}
          initial={editing}
          flying={isBalloonFlying(editing)}
          onClose={() => setEditing(null)}
          onSubmit={saveEdit}
        />
      )}

      {showForm && (
        <BalloonFormModal
          onClose={() => setShowForm(false)}
          onSubmit={createBalloon}
        />
      )}
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

/* =================================================================== */
/* Satu dialog melayani penambahan dan perubahan — sama seperti
   NewOperatorModal pada UserManagementPage, supaya formulir tidak perlu
   dijaga di dua tempat berbeda. */
function BalloonFormModal({
  onClose, onSubmit, initial, flying = false,
}: {
  onClose: () => void;
  onSubmit: (data: Omit<Balloon, 'id'>) => void;
  initial?: Balloon | null;
  /** true bila balon ini sedang ditugaskan pada misi berstatus "Flight" —
      field Status dikunci selagi begini, field lain tetap bisa disimpan. */
  flying?: boolean;
}) {
  const { t } = useApp();
  const ubah = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? '');
  const [serialNumber, setSerialNumber] = useState(initial?.serialNumber ?? '');
  const [capacity, setCapacity] = useState(initial?.capacity ?? '');
  const [maxAltitude, setMaxAltitude] = useState(initial?.maxAltitude ?? '');
  /* Nilai lama yang bukan "Available"/"Unavailable" persis (data legacy)
     dianggap Unavailable — sama seperti logika tile ringkasan di atas. */
  const [status, setStatus] = useState<'Available' | 'Unavailable'>(
    initial ? (initial.status.toLowerCase() === 'available' ? 'Available' : 'Unavailable') : 'Available',
  );

  const ready = name.trim().length > 1;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }} role="dialog" aria-modal="true">
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Anchor size={17} /> {ubah ? t('Ubah Data Balon') : t('Tambah Balon')}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {ubah ? t('Perubahan tersimpan langsung ke katalog platform balon.') : t('Balon baru langsung tersedia sebagai opsi pada formulir Misi Baru.')}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }} aria-label={t('Tutup')}><X size={17} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t('Nama')}</label>
            <input className="form-input" value={name} onChange={e => setName(e.target.value)} placeholder={t('mis. Epsilon-1')} autoFocus />
          </div>
          <div className="form-group">
            <label className="form-label">{t('Nomor Seri')}</label>
            <div style={{ position: 'relative' }}>
              <Fingerprint size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input font-mono"
                value={serialNumber}
                onChange={e => setSerialNumber(e.target.value)}
                placeholder={t('mis. SN-2026-001')}
                spellCheck={false}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('Kapasitas')}</label>
              <input className="form-input font-mono" value={capacity} onChange={e => setCapacity(e.target.value)} placeholder={t('mis. 4 kg')} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Ketinggian Maks')}</label>
              <div style={{ position: 'relative' }}>
                <Gauge size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                <input
                  className="form-input font-mono"
                  value={maxAltitude}
                  onChange={e => setMaxAltitude(e.target.value)}
                  placeholder={t('mis. 450 m')}
                  style={{ paddingLeft: 36 }}
                />
              </div>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('Status')}</label>
            <select
              className="form-select"
              value={status}
              disabled={flying}
              onChange={e => setStatus(e.target.value as 'Available' | 'Unavailable')}
            >
              <option value="Available">{t('Available')}</option>
              <option value="Unavailable">{t('Unavailable')}</option>
            </select>
            {flying && (
              <p style={{ fontSize: 11.5, color: 'var(--warning-400)', marginTop: 6, lineHeight: 1.55 }}>
                {t('Balon ini sedang dalam penerbangan aktif — status tidak bisa diubah dari sini sampai misinya diakhiri (End Flight). Field lain masih bisa disimpan.')}
              </p>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('Batal')}</button>
          <button
            className="btn btn-primary"
            disabled={!ready}
            onClick={() => onSubmit({
              name: name.trim(),
              serialNumber: serialNumber.trim(),
              capacity: capacity.trim(),
              maxAltitude: maxAltitude.trim(),
              status,
            })}
          >
            <Anchor size={14} /> {ubah ? t('Simpan Perubahan') : t('Tambah Balon')}
          </button>
        </div>
      </div>
    </div>
  );
}
