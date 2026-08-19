'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import GlassCard from '../components/GlassCard';
import { useApp } from '../context';
import { PageHead, SectionHead, KVList, EmptyState, Segmented } from '../components/ui';
import { MediaThumb, VideoPlayer } from '../components/media';
import api, { API_BASE_MEDIA, type MediaRecord, type FlightInformationRecord, type FlightMissionRecord } from '../services/api';
import {
  MonitorPlay, UploadCloud, Search, LayoutGrid, Rows3, Film, Image as ImageIcon,
  HardDrive, FolderOpen, Play, Eye, Download, Trash2, X, CheckCircle2,
  AlertTriangle, Loader2, FileVideo, FileImage, Clock, Tag, Ban,
} from 'lucide-react';

/* =====================================================================
   SURVEILLANCE MEDIA SOURCE
   Katalog media hasil pengawasan beserta jalur pemasukan berkas baru.
   ===================================================================== */

type MediaType = 'video' | 'image';

interface MediaItem {
  id: string;
  name: string;
  type: MediaType;
  bytes: number;
  captured: string;
  duration?: string;
  resolution: string;
  sensor: 'EO' | 'IR';
  tags: string[];
  /** Alamat berkas yang benar-benar dapat diputar atau ditampilkan */
  src?: string;
  /** Data URL untuk berkas yang baru diunggah pada sesi ini */
  preview?: string;
}

/* Label ramah-baca untuk processing_type dari backend — dipakai sebagai
   tag pada tiap entri katalog. */
const PROCESSING_TYPE_LABEL: Record<string, string> = {
  OBJECT_DETECTION: 'Deteksi Objek',
  IMAGE_ENHANCEMENT: 'Enhancement',
  VIDEO_ENHANCEMENT: 'Enhancement',
  CROWD_COUNTING: 'Crowd Counting',
};

/** Mengubah baris GET /api/v1/media menjadi MediaItem katalog. mission
    diselesaikan lewat flight_information_id → flight-information.mission_id
    → flight-missions, supaya nama misinya bisa ditampilkan sebagai tag. */
function toMediaItem(
  m: MediaRecord,
  flightInfoById: Map<string, FlightInformationRecord>,
  missionById: Map<string, FlightMissionRecord>,
): MediaItem {
  const info = flightInfoById.get(String(m.flight_information_id));
  const mission = info ? missionById.get(String(info.mission_id)) : undefined;
  const missionName = mission?.mission_name ?? mission?.mission_code;

  const processingLabel = m.processing_type ? (PROCESSING_TYPE_LABEL[m.processing_type] ?? m.processing_type) : undefined;
  const tags = [processingLabel, missionName].filter((v): v is string => Boolean(v));

  const storagePath = m.storage_path?.replace(/\\/g, '/');

  return {
    id: String(m.id),
    name: m.original_filename ?? m.stored_filename ?? String(m.id),
    type: m.media_type?.toUpperCase() === 'VIDEO' ? 'video' : 'image',
    bytes: m.file_size ?? 0,
    captured: m.uploaded_at
      ? new Date(m.uploaded_at).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }).replace('.', ':')
      : '—',
    resolution: '—',
    sensor: 'EO',
    tags,
    src: storagePath ? `${API_BASE_MEDIA}/${storagePath}` : undefined,
  };
}

/* Batasan pemasukan berkas — sejalan dengan kapasitas penyimpanan lokal. */
const ACCEPT = '.mp4,.avi,.mov,.mkv,.jpg,.jpeg,.png,.tif,.tiff';
const VIDEO_EXT = /\.(mp4|avi|mov|mkv)$/i;
const IMAGE_EXT = /\.(jpe?g|png|tiff?)$/i;
const MAX_BYTES = 2 * 1024 ** 3; // 2 GB

type QueueState = 'uploading' | 'done' | 'error';

interface QueueItem {
  id: string;
  name: string;
  bytes: number;
  type: MediaType | 'unknown';
  progress: number;
  state: QueueState;
  message?: string;
  preview?: string;
}

function formatBytes(b: number) {
  if (b >= 1024 ** 3) return `${(b / 1024 ** 3).toFixed(2)} GB`;
  if (b >= 1024 ** 2) return `${(b / 1024 ** 2).toFixed(1)} MB`;
  return `${(b / 1024).toFixed(0)} KB`;
}

export default function MediaSourcePage() {
  const { pushToast, t } = useApp();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [mediaLoading, setMediaLoading] = useState(true);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [view, setView] = useState<'grid' | 'list'>('grid');
  const [filter, setFilter] = useState<'all' | MediaType>('all');
  const [sensor, setSensor] = useState<'all' | 'EO' | 'IR'>('all');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);
  /* Berkas yang sedang dibuka pada penampil layar penuh */
  const [viewing, setViewing] = useState<MediaItem | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* Katalog dimuat dari GET /api/v1/media. Nama misi tiap entri
     diselesaikan lewat flight_information_id → flight-information.mission_id
     → flight-missions, jadi ketiganya dimuat sekaligus. */
  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.getMedia().catch(() => []),
      api.getFlightInformation().catch(() => []),
      api.getFlightMissions().catch(() => []),
    ]).then(([mediaRows, infoRows, missionRows]) => {
      if (cancelled) return;
      const flightInfoById = new globalThis.Map(infoRows.map(i => [String(i.id), i]));
      const missionById = new globalThis.Map(missionRows.map(m => [String(m.id), m]));
      setMedia(mediaRows.map(m => toMediaItem(m, flightInfoById, missionById)));
    }).finally(() => { if (!cancelled) setMediaLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return media.filter(m => {
      if (filter !== 'all' && m.type !== filter) return false;
      if (sensor !== 'all' && m.sensor !== sensor) return false;
      if (q && !m.name.toLowerCase().includes(q) && !m.tags.some(t => t.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [media, filter, sensor, query]);

  const stats = useMemo(() => ({
    total: media.length,
    videos: media.filter(m => m.type === 'video').length,
    images: media.filter(m => m.type === 'image').length,
    bytes: media.reduce((n, m) => n + m.bytes, 0),
  }), [media]);

  /* ----- Pemasukan berkas ----- */
  const enqueue = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;

    const items: QueueItem[] = Array.from(files).map(f => {
      const isVideo = VIDEO_EXT.test(f.name);
      const isImage = IMAGE_EXT.test(f.name);
      const id = `q-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

      if (!isVideo && !isImage) {
        return { id, name: f.name, bytes: f.size, type: 'unknown', progress: 0, state: 'error', message: 'Format berkas tidak didukung' };
      }
      if (f.size > MAX_BYTES) {
        return { id, name: f.name, bytes: f.size, type: isVideo ? 'video' : 'image', progress: 0, state: 'error', message: 'Melebihi batas 2 GB per berkas' };
      }
      return {
        id,
        name: f.name,
        bytes: f.size,
        type: isVideo ? 'video' : 'image',
        progress: 0,
        state: 'uploading',
        preview: isImage ? URL.createObjectURL(f) : undefined,
      };
    });

    setQueue(prev => [...prev, ...items]);

    const rejected = items.filter(i => i.state === 'error');
    if (rejected.length) {
      pushToast({
        tone: 'error',
        title: `${rejected.length} berkas ditolak`,
        detail: rejected.map(r => `${r.name}: ${r.message}`).join(' · '),
      });
    }
  }, [pushToast]);

  /* Kemajuan pemasukan berkas ke penyimpanan lokal. */
  useEffect(() => {
    const active = queue.filter(q => q.state === 'uploading');
    if (active.length === 0) return;

    const timer = window.setInterval(() => {
      setQueue(prev => prev.map(q => {
        if (q.state !== 'uploading') return q;
        const step = q.bytes > 100 * 1024 ** 2 ? 7 : 16;
        const next = Math.min(100, q.progress + step);
        return next >= 100 ? { ...q, progress: 100, state: 'done' } : { ...q, progress: next };
      }));
    }, 220);

    return () => window.clearInterval(timer);
  }, [queue]);

  /* Pindahkan berkas yang selesai ke katalog. */
  useEffect(() => {
    const finished = queue.filter(q => q.state === 'done');
    if (finished.length === 0) return;

    const timer = window.setTimeout(() => {
      setMedia(prev => [
        ...finished.map<MediaItem>(f => ({
          id: f.id,
          name: f.name,
          type: f.type === 'unknown' ? 'image' : f.type,
          bytes: f.bytes,
          captured: new Date().toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }).replace('.', ':'),
          resolution: f.type === 'video' ? '1920×1080' : '—',
          duration: f.type === 'video' ? '—' : undefined,
          sensor: 'EO',
          tags: ['Baru diunggah'],
          preview: f.preview,
        })),
        ...prev,
      ]);
      setQueue(prev => prev.filter(q => q.state !== 'done'));
      pushToast({
        tone: 'success',
        title: `${finished.length} berkas masuk katalog`,
        detail: finished.map(f => f.name).join(' · '),
      });
    }, 700);

    return () => window.clearTimeout(timer);
  }, [queue, pushToast]);

  /* Sorotan mengikuti kursor pada area unggah. */
  const trackPointer = (e: React.MouseEvent) => {
    const el = dropRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
    el.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
  };

  const removeMedia = (id: string) => {
    const item = media.find(m => m.id === id);
    setMedia(prev => prev.filter(m => m.id !== id));
    setSelected(null);
    if (viewing?.id === id) setViewing(null);
    pushToast({ tone: 'warning', title: 'Berkas dihapus', detail: `${item?.name ?? 'Berkas'} dikeluarkan dari katalog media.` });
  };

  /* Menyalin berkas ke folder ekspor stasiun. Karena GCS beroperasi
     tertutup, "unduh" berarti menulis salinan ke media lepas yang telah
     didaftarkan, bukan mengirim berkas keluar jaringan. */
  const exportMedia = (item: MediaItem) => {
    pushToast({
      tone: 'success',
      title: 'Berkas disalin ke folder ekspor',
      detail: `${item.name} · ${formatBytes(item.bytes)} — tujuan D:\\SkyStar\\export.`,
    });
  };

  return (
    <div className="animate-fade-in">
      <PageHead
        icon={<MonitorPlay size={22} />}
        title={t('Surveillance Media Source')}
        description={t('Katalog rekaman dan citra pengawasan, sekaligus jalur pemasukan berkas baru.')}
        actions={
          <>
            <button className="btn btn-primary" onClick={() => inputRef.current?.click()}>
              <UploadCloud size={15} /> Unggah Media
            </button>
            <button
              className="btn btn-secondary"
              disabled={!selected}
              onClick={() => {
                const item = media.find(m => m.id === selected);
                if (item) exportMedia(item);
              }}
            >
              <Download size={15} /> Ekspor Terpilih
            </button>
          </>
        }
      />

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        multiple
        hidden
        onChange={e => { enqueue(e.target.files); e.target.value = ''; }}
      />

      {/* ===== Ringkasan penyimpanan ===== */}
      <div className="lic-summary">
        <Tile icon={<FolderOpen size={19} />} accent="var(--accent-primary)" label={t('Total Berkas')} value={String(stats.total)} />
        <Tile icon={<Film size={19} />} accent="var(--accent-secondary)" label={t('Rekaman Video')} value={String(stats.videos)} />
        <Tile icon={<ImageIcon size={19} />} accent="var(--accent-tertiary)" label={t('Citra Statis')} value={String(stats.images)} />
        <Tile icon={<HardDrive size={19} />} accent="var(--accent-emerald)" label={t('Penyimpanan Terpakai')} value={formatBytes(stats.bytes)} />
      </div>

      {/* ===== Area unggah ===== */}
      <GlassCard tilt={false} style={{ marginBottom: 16, display: 'none' }}>
        <SectionHead
          icon={<UploadCloud size={15} />}
          title={t('Pemasukan Berkas')}
          sub={t('Disalin ke penyimpanan lokal terenkripsi')}
        />

        <div
          ref={dropRef}
          className={`uploader ${drag ? 'drag' : ''}`}
          onMouseMove={trackPointer}
          onClick={() => inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDrag(true); }}
          onDragLeave={e => { e.preventDefault(); setDrag(false); }}
          onDrop={e => { e.preventDefault(); setDrag(false); enqueue(e.dataTransfer.files); }}
          role="button"
          tabIndex={0}
          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click(); }}
        >
          <span className="uploader-ring"><UploadCloud size={24} /></span>

          <span className="uploader-copy">
            <span className="uploader-title">
              {drag ? 'Lepaskan berkas untuk mulai mengunggah' : 'Seret berkas ke sini, atau telusuri penyimpanan'}
            </span>
            <span className="uploader-sub">
              {t('Beberapa berkas sekaligus · maksimum 2 GB per berkas')}
            </span>
            <span className="uploader-formats">
              <span>{t('MP4')}</span><span>{t('AVI')}</span><span>{t('MOV')}</span><span>{t('MKV')}</span>
              <span>{t('JPG')}</span><span>{t('PNG')}</span><span>{t('TIFF')}</span>
            </span>
          </span>

          {/* Tampil sebagai tombol, namun bukan elemen interaktif tersendiri:
              seluruh area sudah berperan sebagai tombol, dan menyarangkan
              tombol di dalamnya akan membingungkan pembaca layar. */}
          <span className="btn btn-primary btn-sm sheen" style={{ flexShrink: 0 }} aria-hidden>
            <FolderOpen size={14} /> Telusuri Berkas
          </span>
        </div>

        {/* Antrean unggah */}
        {queue.length > 0 && (
          <div className="upq">
            {queue.map(q => (
              <div key={q.id} className="upq-row">
                <span className="upq-thumb">
                  {q.preview
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={q.preview} alt="" />
                    : q.type === 'video' ? <FileVideo size={19} />
                      : q.type === 'image' ? <FileImage size={19} />
                        : <Ban size={19} style={{ color: 'var(--danger-400)' }} />}
                </span>

                <span className="upq-main">
                  <span className="upq-name">{q.name}</span>
                  <span className="upq-meta">
                    <span>{formatBytes(q.bytes)}</span>
                    {q.type !== 'unknown' && <span>{q.type === 'video' ? 'Video' : 'Citra'}</span>}
                    {q.message && <span style={{ color: 'var(--danger-400)' }}>{q.message}</span>}
                  </span>
                  <span className="upq-track">
                    <span
                      className={`upq-fill ${q.state === 'error' ? 'err' : q.state === 'done' ? 'done' : ''}`}
                      style={{ width: `${q.state === 'error' ? 100 : q.progress}%` }}
                    />
                  </span>
                </span>

                <span
                  className="upq-state"
                  style={{
                    color: q.state === 'error' ? 'var(--danger-400)'
                      : q.state === 'done' ? 'var(--success-400)' : 'var(--accent-primary)',
                  }}
                >
                  {q.state === 'error'
                    ? <><AlertTriangle size={12} style={{ verticalAlign: -2 }} /> {t('GAGAL')}</>
                    : q.state === 'done'
                      ? <><CheckCircle2 size={12} style={{ verticalAlign: -2 }} /> {t('SELESAI')}</>
                      : <><Loader2 size={12} className="spin" style={{ verticalAlign: -2 }} /> {q.progress}%</>}
                </span>

                <button
                  className="toast-close"
                  onClick={() => setQueue(prev => prev.filter(x => x.id !== q.id))}
                  aria-label={`Buang ${q.name} dari antrean`}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* ===== Toolbar katalog ===== */}
      <GlassCard tilt={false} style={{ padding: 13, marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 200, position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input
              className="form-input"
              placeholder={t('Cari nama berkas atau label…')}
              value={query}
              onChange={e => setQuery(e.target.value)}
              style={{ width: '100%', paddingLeft: 34 }}
            />
          </div>

          <Segmented
            value={filter}
            options={[
              { id: 'all', label: 'Semua' },
              { id: 'video', label: 'Video', icon: <Film size={13} /> },
              { id: 'image', label: 'Citra', icon: <ImageIcon size={13} /> },
            ]}
            onChange={setFilter}
          />

          <Segmented
            value={sensor}
            options={[
              { id: 'all', label: 'Semua Sensor' },
              { id: 'EO', label: 'EO' },
              { id: 'IR', label: 'IR' },
            ]}
            onChange={setSensor}
          />

          <Segmented
            value={view}
            options={[
              { id: 'grid', label: '', icon: <LayoutGrid size={14} /> },
              { id: 'list', label: '', icon: <Rows3 size={14} /> },
            ]}
            onChange={setView}
          />
        </div>
      </GlassCard>

      {/* ===== Katalog ===== */}
      {mediaLoading ? (
        <GlassCard tilt={false}>
          <EmptyState icon={<Loader2 size={22} className="spin" />} title={t('Memuat katalog media…')} description={t('Mengambil data dari server.')} />
        </GlassCard>
      ) : filtered.length === 0 ? (
        <GlassCard tilt={false}>
          <EmptyState
            icon={<Search size={22} />}
            title={t('Tidak ada media yang cocok')}
            description={t('Ubah kata kunci atau kosongkan filter untuk menampilkan seluruh katalog.')}
            action={
              <button className="btn btn-secondary btn-sm" onClick={() => { setQuery(''); setFilter('all'); setSensor('all'); }}>
                {t('Bersihkan Filter')}
              </button>
            }
          />
        </GlassCard>
      ) : view === 'grid' ? (
        <div className="grid-4">
          {filtered.map(m => (
            <MediaCard
              key={m.id}
              item={m}
              selected={selected === m.id}
              onSelect={() => setSelected(selected === m.id ? null : m.id)}
              onDelete={() => removeMedia(m.id)}
              onOpen={() => setViewing(m)}
              onExport={() => exportMedia(m)}
            />
          ))}
        </div>
      ) : (
        <GlassCard tilt={false}>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }} />
                  <th>{t('Nama Berkas')}</th><th>{t('Sensor')}</th><th>{t('Resolusi')}</th><th>{t('Ukuran')}</th>
                  <th>{t('Durasi')}</th><th>{t('Waktu Rekam')}</th><th style={{ textAlign: 'right' }}>{t('Aksi')}</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(m => (
                  <tr key={m.id} onClick={() => setSelected(m.id)} style={{ cursor: 'pointer', background: selected === m.id ? 'rgba(96,165,250,0.06)' : undefined }}>
                    <td>
                      {m.type === 'video'
                        ? <FileVideo size={16} style={{ color: 'var(--accent-primary)' }} />
                        : <FileImage size={16} style={{ color: 'var(--accent-tertiary)' }} />}
                    </td>
                    <td style={{ fontWeight: 600, fontSize: 12.5 }}>{m.name}</td>
                    <td><span className={`badge badge-${m.sensor === 'IR' ? 'warning' : 'info'}`}>{m.sensor}</span></td>
                    <td className="font-mono text-xs">{m.resolution}</td>
                    <td className="font-mono text-xs">{formatBytes(m.bytes)}</td>
                    <td className="font-mono text-xs">{m.duration ?? '—'}</td>
                    <td className="font-mono text-xs" style={{ whiteSpace: 'nowrap' }}>{m.captured}</td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={m.type === 'video' ? 'Putar rekaman' : 'Lihat citra'}
                          onClick={e => { e.stopPropagation(); setViewing(m); }}
                        >
                          {m.type === 'video' ? <Play size={13} /> : <Eye size={13} />}
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={t('Ekspor berkas')}
                          onClick={e => { e.stopPropagation(); exportMedia(m); }}
                        >
                          <Download size={13} />
                        </button>
                        <button
                          className="btn btn-ghost btn-sm"
                          title={t('Hapus')}
                          onClick={e => { e.stopPropagation(); removeMedia(m.id); }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </GlassCard>
      )}

      {/* ===== Kebijakan penyimpanan ===== */}
      <GlassCard tilt={false} style={{ marginTop: 16 }}>
        <SectionHead icon={<HardDrive size={15} />} title={t('Kebijakan Penyimpanan Media')} />
        <div className="grid-2">
          <KVList rows={[
            ['Lokasi Penyimpanan', 'D:\\SkyStar\\storage\\media'],
            ['Enkripsi Saat Diam', 'AES-256'],
            ['Retensi Video', '90 hari'],
            ['Retensi Citra', '180 hari'],
          ]} />
          <KVList rows={[
            ['Kapasitas Terpakai', `${formatBytes(stats.bytes)} / 2 TB`],
            ['Batas Ukuran Berkas', '2 GB'],
            ['Format Video', 'MP4, AVI, MOV, MKV'],
            ['Format Citra', 'JPG, PNG, TIFF'],
          ]} />
        </div>
      </GlassCard>

      {viewing && (
        <MediaViewer
          item={viewing}
          onClose={() => setViewing(null)}
          onExport={() => exportMedia(viewing)}
        />
      )}
    </div>
  );
}

/* =================================================================== */
/* ===================================================================
   Pratayang sintetis
   -------------------------------------------------------------------
   Berkas contoh pada katalog tidak menyertakan bingkai sungguhan, dan
   menampilkan ikon berkas polos membuat katalog terasa kosong. Sebagai
   gantinya dilukis abstraksi pandangan tegak lurus — petak bangunan,
   ruas jalan, dan reticle — dengan pola yang ditentukan oleh nama
   berkas, sehingga setiap entri punya pratayang tetap dan khas.
   Untuk berkas yang benar-benar diunggah, bingkai asli tetap dipakai.
   =================================================================== */
function ScenePreview({ seed, sensor }: { seed: string; sensor: 'EO' | 'IR' }) {
  const blocks = useMemo(() => {
    /* Deret pseudo-acak yang diunggulkan oleh nama berkas: pratayang
       sebuah berkas selalu tampak sama, tetapi berbeda antar berkas. */
    let s = 0;
    for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) % 2147483647;
    if (s === 0) s = 1;

    const pool = new Array<number>(140);
    for (let i = 0; i < pool.length; i++) {
      s = (s * 16807) % 2147483647;
      pool[i] = s / 2147483647;
    }

    const rects = Array.from({ length: 26 }, (_, i) => {
      const b = 2 + i * 5;
      const w = 5 + pool[b] * 13;
      const h = 4 + pool[b + 1] * 11;
      return {
        x: pool[b + 2] * (100 - w),
        y: pool[b + 3] * (100 - h),
        w,
        h,
        o: 0.06 + pool[b + 4] * 0.2,
      };
    });

    return { roadY: 26 + pool[0] * 40, roadX: 22 + pool[1] * 52, rects };
  }, [seed]);

  const warm = sensor === 'IR';
  const ink = warm ? '#fbbf24' : '#7dd3fc';

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
      <defs>
        <linearGradient id={`sc-${warm ? 'ir' : 'eo'}`} x1="0" y1="0" x2="1" y2="1">
          {warm ? (
            <>
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="58%" stopColor="#451a03" />
              <stop offset="100%" stopColor="#0c0a09" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#070d1a" />
              <stop offset="58%" stopColor="#12203a" />
              <stop offset="100%" stopColor="#060a13" />
            </>
          )}
        </linearGradient>
      </defs>

      <rect width="100" height="100" fill={`url(#sc-${warm ? 'ir' : 'eo'})`} />

      {/* Petak bangunan */}
      {blocks.rects.map((r, i) => (
        <rect key={i} x={r.x} y={r.y} width={r.w} height={r.h} rx="0.6"
          fill={ink} opacity={r.o} />
      ))}

      {/* Ruas jalan */}
      <rect x="0" y={blocks.roadY} width="100" height="2.6" fill="#0b1220" opacity="0.6" />
      <rect x={blocks.roadX} y="0" width="2.2" height="100" fill="#0b1220" opacity="0.6" />

      {/* Reticle tengah */}
      <g stroke={ink} strokeWidth="0.4" opacity="0.5" fill="none">
        <circle cx="50" cy="50" r="7" />
        <path d="M50 39v5M50 56v5M39 50h5M56 50h5" />
      </g>

      {/* Sudut bingkai HUD */}
      <g stroke={ink} strokeWidth="0.6" opacity="0.55" fill="none">
        <path d="M4 12V4h8M88 4h8v8M96 88v8h-8M12 96H4v-8" />
      </g>
    </svg>
  );
}

/* ===================================================================
   Penampil berkas — lapisan penuh di atas katalog
   =================================================================== */
function MediaViewer({
  item, onClose, onExport,
}: { item: MediaItem; onClose: () => void; onExport: () => void }) {
  const { t } = useApp();
  /* Escape menutup penampil, sesuai kebiasaan dialog pada umumnya. */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="mv-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={`Penampil berkas ${item.name}`}
      onClick={onClose}
    >
      <div className="mv-panel lq lq-thick" onClick={e => e.stopPropagation()}>
        <div className="mv-head">
          <span style={{ minWidth: 0 }}>
            <span className="mv-name">{item.name}</span>
            <span className="mv-meta">
              {item.sensor} · {item.resolution} · {formatBytes(item.bytes)}
              {item.duration ? ` · ${item.duration}` : ''} · {item.captured}
            </span>
          </span>
          <button className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Tutup penampil">
            <X size={16} />
          </button>
        </div>

        {item.type === 'video' && (item.src || item.preview) ? (
          <VideoPlayer
            src={(item.preview ?? item.src)!}
            label={item.name}
            sublabel={`${item.sensor} · ${item.resolution}`}
            aspect="16 / 9"
          />
        ) : (
          <div className="mv-stage">
            {item.preview || item.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={(item.preview ?? item.src)!} alt={item.name} />
            ) : (
              <>
                <ScenePreview seed={item.name} sensor={item.sensor} />
                <span className="scanline" />
              </>
            )}
          </div>
        )}

        {item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginTop: 12 }}>
            {item.tags.map(tag => (
              <span key={tag} className="badge badge-neutral" style={{ fontSize: 9.5, gap: 4 }}>
                <Tag size={9} /> {t(tag)}
              </span>
            ))}
          </div>
        )}

        <div className="mv-actions">
          <button className="btn btn-secondary btn-sm" onClick={onExport}>
            <Download size={13} /> Ekspor Berkas
          </button>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            {t('Tekan Esc untuk menutup')}
          </span>
        </div>
      </div>
    </div>
  );
}

function MediaCard({
  item, selected, onSelect, onDelete, onOpen, onExport,
}: {
  item: MediaItem;
  selected: boolean;
  onSelect: () => void;
  onDelete: () => void;
  onOpen: () => void;
  onExport: () => void;
}) {
  const { t } = useApp();
  return (
    <GlassCard glow={selected ? 'rgba(96,165,250,0.12)' : undefined}>
      <div onClick={onSelect} style={{ cursor: 'pointer' }}>
        <div
          style={{
            position: 'relative', aspectRatio: '16 / 9', marginBottom: 10, overflow: 'hidden',
            borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: item.sensor === 'IR'
              ? 'linear-gradient(140deg, #1c1917, #451a03 70%, #0c0a09)'
              : 'linear-gradient(140deg, #060a13, #0d1528 70%, #060a13)',
          }}
        >
          {item.preview || item.src ? (
            <>
              <MediaThumb src={(item.preview ?? item.src)!} kind={item.type} />
              {item.type === 'video' && (
                <span
                  style={{
                    position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center',
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'rgba(6,10,19,0.62)', border: '1px solid rgba(255,255,255,0.16)',
                    backdropFilter: 'blur(6px)', color: '#e2e8f0',
                  }}
                >
                  <Play size={13} style={{ marginLeft: 2 }} />
                </span>
              )}
            </>
          ) : (
            <>
              <ScenePreview seed={item.name} sensor={item.sensor} />
              {item.type === 'video' && (
                <span
                  style={{
                    position: 'relative', zIndex: 1, display: 'grid', placeItems: 'center',
                    width: 34, height: 34, borderRadius: '50%',
                    background: 'rgba(6,10,19,0.62)', border: '1px solid rgba(255,255,255,0.16)',
                    backdropFilter: 'blur(6px)', color: '#e2e8f0',
                  }}
                >
                  <Play size={13} style={{ marginLeft: 2 }} />
                </span>
              )}
            </>
          )}

          <span
            className={`badge badge-${item.sensor === 'IR' ? 'warning' : 'info'}`}
            style={{ position: 'absolute', top: 7, left: 7, fontSize: 9, padding: '1px 7px' }}
          >
            {item.sensor}
          </span>

          {item.duration && (
            <span
              style={{
                position: 'absolute', bottom: 7, right: 7, padding: '2px 7px', borderRadius: 4,
                background: 'rgba(2,6,23,0.78)', fontSize: 9.5, fontFamily: 'var(--font-code)', color: '#e2e8f0',
              }}
            >
              <Clock size={9} style={{ verticalAlign: -1, marginRight: 3 }} />{item.duration}
            </span>
          )}
        </div>

        <div style={{ fontSize: 12, fontWeight: 650, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.name}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10.5, color: 'var(--text-muted)', fontFamily: 'var(--font-code)' }}>
          <span>{formatBytes(item.bytes)}</span>
          <span>{item.resolution}</span>
        </div>
        <div style={{ fontSize: 10, color: 'var(--text-disabled)', marginTop: 3, fontFamily: 'var(--font-code)' }}>
          {item.captured}
        </div>

        {item.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 4, marginTop: 7, flexWrap: 'wrap' }}>
            {item.tags.map(tag => (
              <span key={tag} className="badge badge-neutral" style={{ fontSize: 9, padding: '1px 7px', gap: 3 }}>
                <Tag size={8} /> {t(tag)}
              </span>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div style={{ display: 'flex', gap: 5, marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--border-subtle)' }}>
          <button
            className="btn btn-primary btn-sm sheen"
            style={{ flex: 1, gap: 5, justifyContent: 'center' }}
            onClick={onOpen}
          >
            {item.type === 'video' ? <><Play size={12} /> {t('Putar')}</> : <><Eye size={12} /> {t('Lihat')}</>}
          </button>
          <button className="btn btn-secondary btn-sm" style={{ gap: 5 }} onClick={onExport} title={t('Ekspor berkas')}>
            <Download size={12} />
          </button>
          <button className="btn btn-ghost btn-sm" onClick={onDelete} title={t('Hapus')}><Trash2 size={13} /></button>
        </div>
      )}
    </GlassCard>
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
        <span className="val" style={{ fontSize: 17 }}>{value}</span>
      </span>
    </div>
  );
}
