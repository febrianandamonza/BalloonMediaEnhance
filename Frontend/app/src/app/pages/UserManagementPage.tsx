'use client';
import React, { useMemo, useState, useEffect } from 'react';
import { useApp } from '../context';
import api from '../services/api';
import GlassCard from '../components/GlassCard';
import {
  UserCog, UserPlus, Search, Check, Minus, ShieldCheck, Pencil,
  Power, X, Users2, UserCheck, KeyRound, Building2, Trash2,
} from 'lucide-react';

interface Operator {
  id: number | string;
  fullName: string;
  username: string;
  email?: string;
  phone?: string;
  station: 'GCS-01' | 'GCS-02' | 'Semua';
  role: 'Administrator' | 'Operator';
  active: boolean;
  lastLogin: string;
}

const SEED: Operator[] = [
  { id: 1, fullName: 'Operator GCS Satu', username: 'gcs1', station: 'GCS-01', role: 'Administrator', active: true, lastLogin: '2026-07-27 08:12' },
  { id: 2, fullName: 'Operator GCS Dua', username: 'gcs2', station: 'GCS-02', role: 'Administrator', active: true, lastLogin: '2026-07-26 19:47' },
  { id: 3, fullName: 'Budi Santoso', username: 'budi.op', station: 'GCS-01', role: 'Operator', active: true, lastLogin: '2026-07-27 06:55' },
  { id: 4, fullName: 'Dewi Kartika', username: 'dewi.op', station: 'GCS-02', role: 'Operator', active: true, lastLogin: '2026-07-26 21:14' },
];

const ROLES = ['Administrator', 'Operator'] as const;

const ROLE_BADGE: Record<Operator['role'], string> = {
  Administrator: 'badge-danger',
  Operator: 'badge-success',
};

const ROLE_DESC: Record<Operator['role'], string> = {
  Administrator: 'Akses penuh — konfigurasi sistem, lisensi, dan manajemen pengguna.',
  Operator: 'Pengendalian gimbal, analitik video, dan pelaksanaan misi harian.',
};

/* Matriks izin — mengikuti pembagian tugas pada dokumen KAK/SOW. */
const PERMISSIONS: { perm: string; allow: Operator['role'][] }[] = [
  { perm: 'Kendali Gimbal PTZ', allow: ['Administrator', 'Operator'] },
  { perm: 'Aktivasi Laser (LRF / Pointer)', allow: ['Administrator', 'Operator'] },
  { perm: 'Crowd Counting', allow: ['Administrator', 'Operator'] },
  { perm: 'Object Detection', allow: ['Administrator', 'Operator'] },
  { perm: 'Image / Video Enhancement', allow: ['Administrator', 'Operator'] },
  { perm: 'Pembuatan Laporan', allow: ['Administrator'] },
  { perm: 'Konfigurasi Alert', allow: ['Administrator'] },
  { perm: 'Manajemen Penerbangan', allow: ['Administrator', 'Operator'] },
  { perm: 'Monitoring Mooring & Tether', allow: ['Administrator'] },
  { perm: 'Pemeliharaan Perangkat', allow: ['Administrator'] },
  { perm: 'Manajemen Lisensi', allow: ['Administrator'] },
  { perm: 'Manajemen Pengguna', allow: ['Administrator'] },
  { perm: 'Emergency Shutdown', allow: ['Administrator', 'Operator'] },
];

export default function UserManagementPage() {
  const { pushToast, notify, t } = useApp();
  const [users, setUsers] = useState<Operator[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | Operator['role']>('all');
  const [showForm, setShowForm] = useState(false);
  /* Operator yang sedang diubah, dan yang sedang dikonfirmasi hapus. */
  const [editing, setEditing] = useState<Operator | null>(null);
  const [deleting, setDeleting] = useState<Operator | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const data = await api.getUsers() as Record<string, unknown>[];
        const mappedUsers: Operator[] = data.map((u) => ({
          id: (u.id as string | number) || Math.random(),
          fullName: (u.full_name as string) || (u.username as string) || 'Unknown',
          username: (u.username as string) || 'unknown',
          email: (u.email as string) || '',
          phone: (u.phone as string) || '',
          station: (u.station as Operator['station']) || 'Semua',
          role: u.role.id === 1 ? 'Administrator' : 'Operator',
          active: (u.is_active as boolean) ?? true,
          lastLogin: formatLastLogin(u.last_login as string),
        }));
        setUsers(mappedUsers);
      } catch (err) {
        console.error('Failed to fetch users:', err);
        // pushToast({ tone: 'danger', title: 'Error', detail: 'Gagal memuat data pengguna.' });
      }
    };
    fetchUsers();
  }, [pushToast]);

  const formatLastLogin = (dateString: string | null): string => {
    if (!dateString) return 'Belum pernah login';

    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '-';

    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter(u => {
      if (roleFilter !== 'all' && u.role !== roleFilter) return false;
      if (!q) return true;
      return u.fullName.toLowerCase().includes(q)
        || u.username.toLowerCase().includes(q)
        || (u.email || '').toLowerCase().includes(q)
        || u.station.toLowerCase().includes(q);
    });
  }, [users, query, roleFilter]);

  const toggleActive = async (u: Operator) => {
    // try {
    //   await api.updateUser(String(u.id), { is_active: !u.active });
    //   setUsers(prev => prev.map(x => (x.id === u.id ? { ...x, active: !x.active } : x)));
    //   pushToast({
    //     tone: u.active ? 'warning' : 'success',
    //     title: `${u.fullName} — ${u.active ? 'dinonaktifkan' : 'diaktifkan'}`,
    //     detail: `Perubahan status akun tercatat pada Audit Trail.`,
    //   });
    // } catch (err) {
    //   console.error('Gagal mengubah status aktif:', err);
    //   pushToast({
    //     tone: u.active ? 'warning' : 'success',
    //     title: 'Error',
    //     detail: 'Gagal memperbarui status akun di server.',
    //   });
    // }
    await api.updateUser(String(u.id), { is_active: 0 });
    console.log(u.id);
  };

  /* Menyimpan hasil ubah data operator. */
  const saveEdit = async (data: Omit<Operator, 'id'> & { password?: string }) => {
    if (!editing) return;
    try {
      const payload: Record<string, unknown> = {
        full_name: data.fullName,
        username: data.username,
        email: data.email,
        phone: data.phone,
        station: data.station,
        role_id: data.role === 'Administrator' ? 1 : 2,
        is_active: data.active,
      };
      if (data.password) {
        payload.password = data.password;
      }

      await api.updateUser(String(editing.id), payload);

      const { password, ...opData } = data;
      setUsers(prev => prev.map(x => (x.id === editing.id ? { ...x, ...opData } : x)));
      setEditing(null);
      pushToast({
        tone: 'success',
        title: t('Data operator diperbarui'),
        detail: `${data.fullName} · ${data.role} · ${data.station}`,
      });
      notify({
        title: t('Data operator diperbarui'),
        detail: `${data.fullName} · ${data.role} · ${data.station}`,
        severity: 'informasi',
        category: 'Akun',
        source: 'User Management',
        page: 'users',
        silent: true,
      });
    } catch (err) {
      console.error('Gagal memperbarui data:', err);
      pushToast({
        tone: 'warning',
        title: 'Error',
        detail: 'Gagal menyimpan perubahan ke server.',
      });
      notify({
        title: 'Error',
        detail: 'Gagal menyimpan perubahan ke server.',
        severity: 'peringatan',
        category: 'Akun',
        source: 'User Management',
        page: 'users',
        silent: true,
      });
    }
  };

  /* Penghapusan permanen. Dipisahkan dari penonaktifan karena keduanya
     berbeda maksud: menonaktifkan menahan akses namun mempertahankan
     jejak, menghapus melepas kursi lisensi sepenuhnya. */
  const confirmDelete = () => {
    if (!deleting) return;
    const korban = deleting;
    setUsers(prev => prev.filter(x => x.id !== korban.id));
    setDeleting(null);
    pushToast({
      tone: 'info',
      title: t('Akun dihapus'),
      detail: `${korban.fullName} (${korban.username})`,
      action: {
        label: t('Urungkan'),
        onClick: () => setUsers(prev =>
          prev.some(x => x.id === korban.id) ? prev : [...prev, korban].sort((a, b) => a.id - b.id)),
      },
    });
    notify({
      title: t('Akun dihapus'),
      detail: `${korban.fullName} (${korban.username})`,
      severity: 'informasi',
      category: 'Akun',
      source: 'User Management',
      page: 'users',
      silent: true,
    });
  };

  const activeCount = users.filter(u => u.active).length;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title"><UserCog size={22} /> {t('User Management')}</h1>
          <p className="page-description">
            {t('Manajemen akun operator dan kontrol akses berbasis peran (RBAC) untuk kedua stasiun GCS.')}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm(true)}>
          <UserPlus size={15} /> Tambah Operator
        </button>
      </div>

      {/* Ringkasan */}
      <div className="lic-summary">
        <Tile icon={<Users2 size={19} />} accent="var(--accent-primary)" label={t('Total Akun')} value={String(users.length)} />
        <Tile icon={<UserCheck size={19} />} accent="var(--accent-emerald)" label={t('Akun Aktif')} value={String(activeCount)} />
        <Tile icon={<ShieldCheck size={19} />} accent="var(--accent-secondary)" label={t('Peran Terdefinisi')} value={String(ROLES.length)} />
        <Tile icon={<Building2 size={19} />} accent="var(--accent-tertiary)" label={t('Stasiun Terhubung')} value="2" />
      </div>

      {/* Toolbar */}
      <GlassCard tilt={false} style={{ padding: 13, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 220, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder={t('Cari nama, username, atau stasiun…')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 34 }}
            />
          </div>
          <div className="seg" style={{ flexWrap: 'wrap' }}>
            <button className={roleFilter === 'all' ? 'on' : ''} onClick={() => setRoleFilter('all')}>{t('Semua')}</button>
            {ROLES.map(r => (
              <button key={r} className={roleFilter === r ? 'on' : ''} onClick={() => setRoleFilter(r)}>{r}</button>
            ))}
          </div>
        </div>
      </GlassCard>

      {/* Tabel operator */}
      <GlassCard tilt={false}>
        <div className="section-head">
          <Users2 size={15} /> Daftar Operator
          <span className="sh-sub">{filtered.length} dari {users.length} akun</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>{t('Operator')}</th><th>{t('Username')}</th><th>{t('Email')}</th><th>{t('Peran')}</th>
                <th>{t('Status')}</th><th>{t('Login Terakhir')}</th><th style={{ textAlign: 'right' }}>{t('Aksi')}</th>
              </tr>
            </thead>
            <tbody>

              {filtered.map(u => (
                <tr key={u.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="user-avatar sm">{initials(u.fullName)}</span>
                      <span style={{ fontWeight: 600 }}>{u.fullName}</span>
                    </div>
                  </td>
                  <td className="font-mono text-xs">{u.username}</td>
                  <td className="font-mono text-xs">{u.email || '-'}</td>
                  <td><span className={`badge ${ROLE_BADGE[u.role]}`}>{u.role}</span></td>
                  <td>
                    <span className={`badge badge-${u.active ? 'success' : 'danger'}`}>
                      {u.active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </td>
                  <td className="font-mono text-xs">{u.lastLogin}</td>
                  <td>
                    <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={t('Ubah data operator')}
                        aria-label={`${t('Ubah data operator')}: ${u.fullName}`}
                        onClick={() => setEditing(u)}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        className="btn btn-ghost btn-sm"
                        title={u.active ? t('Nonaktifkan akun') : t('Aktifkan akun')}
                        aria-label={`${u.active ? t('Nonaktifkan akun') : t('Aktifkan akun')}: ${u.fullName}`}
                        onClick={() => toggleActive(u)}
                      >
                        <Power size={14} style={{ color: u.active ? 'var(--danger-400)' : 'var(--success-400)' }} />
                      </button>
                      {/* <button
                        className="btn btn-ghost btn-sm"
                        title={t('Hapus akun')}
                        aria-label={`${t('Hapus akun')}: ${u.fullName}`}
                        onClick={() => setDeleting(u)}
                      >
                        <Trash2 size={14} />
                      </button> */}
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
            <h4>{t('Tidak ada operator yang cocok')}</h4>
            <p>{t('Ubah kata kunci pencarian atau pilih filter peran yang berbeda.')}</p>
          </div>
        )}
      </GlassCard>

      {/* Matriks RBAC */}
      <GlassCard tilt={false} style={{ marginTop: 20 }}>
        <div className="section-head">
          <ShieldCheck size={15} /> Matriks Izin Berbasis Peran
          <span className="sh-sub">{t('Menentukan kapabilitas yang dapat dijalankan tiap peran')}</span>
        </div>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th style={{ minWidth: 220 }}>{t('Kapabilitas')}</th>
                {ROLES.map(r => <th key={r} style={{ textAlign: 'center' }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(row => (
                <tr key={row.perm}>
                  <td style={{ fontWeight: 600 }}>{row.perm}</td>
                  {ROLES.map(r => (
                    <td key={r} style={{ textAlign: 'center' }}>
                      {row.allow.includes(r)
                        ? <Check size={15} style={{ color: 'var(--success-400)' }} />
                        : <Minus size={15} style={{ color: 'var(--text-disabled)' }} />}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, marginTop: 16 }}>
          {ROLES.map(r => (
            <div key={r} className="lic-feature">
              <span className="fcode" style={{ whiteSpace: 'nowrap' }}>{r.slice(0, 3).toUpperCase()}</span>
              <span style={{ minWidth: 0 }}>
                <span className="fname">{r}</span>
                <span className="fdesc">{ROLE_DESC[r]}</span>
              </span>
            </div>
          ))}
        </div>
      </GlassCard>

      {editing && (
        <NewOperatorModal
          key={editing.id}
          initial={editing}
          onClose={() => setEditing(null)}
          onCreate={saveEdit}
        />
      )}

      {deleting && (
        <div className="modal-backdrop" onClick={() => setDeleting(null)}>
          <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }} role="dialog" aria-modal="true">
            <div className="modal-header">
              <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
                <Trash2 size={16} /> {t('Hapus Akun Operator')}
              </h3>
              <button className="modal-x" onClick={() => setDeleting(null)} aria-label={t('Tutup')}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: 12.5, lineHeight: 1.65, margin: 0 }}>
                {t('Akun berikut akan dilepas dari stasiun ini beserta kursi lisensinya:')}
              </p>
              <p style={{ margin: '10px 0 0', fontSize: 13, fontWeight: 700 }}>
                {deleting.fullName} <span className="font-mono" style={{ color: 'var(--text-muted)', fontWeight: 500 }}>({deleting.username})</span>
              </p>
              <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 10, lineHeight: 1.6 }}>
                {t('Bila hanya ingin menahan akses sementara, gunakan Nonaktifkan akun — jejak operator tetap tersimpan.')}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setDeleting(null)}>{t('Batal')}</button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                <Trash2 size={14} /> {t('Hapus Akun')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showForm && <NewOperatorModal onClose={() => setShowForm(false)} onCreate={async (op) => {
        try {
          const payload = {
            username: op.username,
            email: op.email,
            password: op.password,
            full_name: op.fullName,
            role_id: op.role === 'Administrator' ? 1 : 2,
            phone: op.phone,
            station: op.station,
            is_active: op.active,
          };
          const res = await api.register(payload) as any;
          const newId = res?.id || Math.max(...users.map(p => Number(p.id)) || [0]) + 1;

          const { password, ...opData } = op;
          setUsers(prev => [...prev, { ...opData, id: newId }]);
          setShowForm(false);
          pushToast({ tone: 'success', title: 'Operator ditambahkan', detail: `${op.fullName} (${op.username}) terdaftar sebagai ${op.role}.` });
          notify({
            title: 'Operator ditambahkan',
            detail: `${op.fullName} (${op.username}) terdaftar sebagai ${op.role}.`,
            severity: 'informasi',
            category: 'Akun',
            source: 'User Management',
            page: 'users',
            silent: true,
          });
        } catch (err) {
          console.error('Gagal membuat akun:', err);
          pushToast({ tone: 'warning', title: 'Pendaftaran Gagal', detail: 'Tidak dapat membuat akun baru. Pastikan data valid.' });
          notify({
            title: 'Pendaftaran Gagal',
            detail: 'Tidak dapat membuat akun baru. Pastikan data valid.',
            severity: 'peringatan',
            category: 'Akun',
            source: 'User Management',
            page: 'users',
            silent: true,
          });
        }
      }} />}
    </div>
  );
}

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
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
/* Satu dialog melayani penambahan dan perubahan. Menduplikasi formulir
   hanya akan membuat dua tempat yang harus dijaga tetap sama. Saat
   mengubah, kata sandi dikosongkan dan bersifat opsional — mengetiknya
   berarti menyetel ulang, membiarkannya kosong berarti tidak mengubah. */
function NewOperatorModal({
  onClose, onCreate, initial,
}: {
  onClose: () => void;
  onCreate: (op: Omit<Operator, 'id'> & { password?: string }) => void;
  initial?: Operator | null;
}) {
  const { t } = useApp();
  const ubah = Boolean(initial);
  const [fullName, setFullName] = useState(initial?.fullName ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [email, setEmail] = useState(initial?.email ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [station, setStation] = useState<Operator['station']>(initial?.station ?? 'GCS-01');
  const [role, setRole] = useState<Operator['role']>(initial?.role ?? 'Operator');
  const [password, setPassword] = useState('');

  const ready = fullName.trim().length > 2
    && username.trim().length > 2
    && email.trim().length > 2
    && (ubah ? password.length === 0 || password.length >= 8 : password.length >= 8);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
              <UserPlus size={17} /> {ubah ? t('Ubah Data Operator') : t('Tambah Operator')}
            </h3>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
              {ubah ? t('Perubahan peran berlaku pada sesi berikutnya operator ini.') : t('Akun baru langsung tunduk pada matriks izin peran yang dipilih.')}
            </p>
          </div>
          <button className="btn btn-ghost" onClick={onClose} style={{ padding: 4 }} aria-label="Tutup"><X size={17} /></button>
        </div>

        <div className="modal-body">
          <div className="form-group">
            <label className="form-label">{t('Nama Lengkap')}</label>
            <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder={t('mis. Sri Handayani')} autoFocus />
          </div>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label">{t('Username')}</label>
              <input className="form-input font-mono" value={username} onChange={e => setUsername(e.target.value)} placeholder={t('sri.op')} spellCheck={false} />
            </div>
            <div className="form-group">
              <label className="form-label">{t('Email')}</label>
              <input className="form-input font-mono" value={email} onChange={e => setEmail(e.target.value)} placeholder={t('sri.op@gmail.com')} spellCheck={false} />
            </div>
          </div>
          <div className="form-group">
            <label className="form-label">{t('Nomor Telepon')}</label>
            <input className="form-input font-mono" value={phone} onChange={e => setPhone(e.target.value)} placeholder={t('08xxxxxxxxxx')} spellCheck={false} />
          </div>
          <div className="form-group">
            <label className="form-label">{t('Peran')}</label>
            <select className="form-select" value={role} onChange={e => setRole(e.target.value as Operator['role'])}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
            <p style={{ fontSize: 11.5, color: 'var(--text-muted)', marginTop: 6, lineHeight: 1.55 }}>
              {ROLE_DESC[role]}
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">{ubah ? t('Setel Ulang Password') : t('Password Awal')}</label>
            <div style={{ position: 'relative' }}>
              <KeyRound size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                className="form-input"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={ubah ? t('Kosongkan bila tidak diubah') : t('Minimal 8 karakter')}
                style={{ paddingLeft: 36 }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>{t('Batal')}</button>
          <button
            className="btn btn-primary"
            disabled={!ready}
            onClick={() => onCreate({
              fullName: fullName.trim(), username: username.trim().toLowerCase(),
              email: email.trim(),
              phone: phone.trim(),
              station, role,
              active: initial?.active ?? true,
              lastLogin: initial?.lastLogin ?? 'NULL',
              password: password ? password : undefined,
            })}
          >
            <UserPlus size={14} /> {ubah ? t('Simpan Perubahan') : t('Buat Akun')}
          </button>
        </div>
      </div>
    </div>
  );
}
