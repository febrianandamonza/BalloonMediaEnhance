/* =====================================================================
   LAPORAN DASHBOARD — Export to PDF
   ---------------------------------------------------------------------
   Digambar langsung dari data (jsPDF vektor), bukan jepretan layar
   (html2canvas) — supaya teks tetap bisa di-select/dicari, ukuran berkas
   kecil, dan tampilannya konsisten sebagai dokumen di atas kertas putih,
   terlepas dari tema gelap aplikasi. Dipanggil dari DashboardPage.tsx
   lewat import() dinamis (lihat komentar di sana) supaya jsPDF/autotable
   tidak ikut membengkakkan bundle awal Dashboard.
   ===================================================================== */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { fullTimestamp } from './notifications';
import type { Lang } from './i18n';

export type MissionBadge = 'flight' | 'due-soon' | 'overdue' | 'landing-overdue';

export interface ReportMissionRow {
  code: string;
  name: string;
  leader: string;
  altitude: number;
  badge: MissionBadge;
  elapsed?: string;
  minutes?: number;
}

export interface ReportAlertRow {
  title: string;
  detail: string;
  source: string;
  ts: number;
  severity: 'informasi' | 'peringatan' | 'kritis';
}

export interface DashboardReportData {
  station: string;
  stationCode: string;
  lang: Lang;
  simulationTotal: number;
  mediaCount: number;
  mediaSizeMb: number;
  missions: ReportMissionRow[];
  missionStatusCounts: { Planned: number; Flight: number; Done: number };
  alerts: ReportAlertRow[];
}

/* jspdf-autotable menambahkan properti ini ke instance doc di runtime
   (lihat dist/jspdf.plugin.autotable.js), tidak dideklarasikan pada tipe
   jsPDF bawaannya — diaugmentasi secara lokal alih-alih memakai `any`. */
type DocWithAutoTable = jsPDF & { lastAutoTable?: { finalY: number } };

/* ===== Palet — sama persis dengan token brand [data-theme='light'] di
   globals.css, supaya laporan tetap terasa satu keluarga visual dengan
   aplikasi meski di atas kertas putih. ===== */
const INK = [15, 23, 42] as const;        // --text-primary (light)
const MUTED = [100, 116, 139] as const;   // --text-muted
const HEADER_BG = [11, 18, 32] as const;  // kop gelap (graticule fill)
const ACCENT = [59, 130, 246] as const;   // --accent-primary (light)
const SUCCESS = [16, 185, 129] as const;  // --success-400 (light)
const WARNING = [217, 119, 6] as const;   // --warning-400 (light)
const DANGER = [220, 38, 38] as const;    // --danger-400 (light)
const TILE_BG = [245, 247, 250] as const;
const TILE_BORDER = [220, 225, 230] as const;

const MARGIN = 40;

/* jsPDF mengeluarkan setFillColor/setTextColor/setDrawColor lewat beberapa
   overload (bukan satu signature ber-rest-parameter), jadi argumen tuple
   tidak bisa langsung di-spread ke pemanggilannya — dibungkus di sini
   supaya tidak menuliskan c[0]/c[1]/c[2] berulang di seluruh berkas. */
type Rgb = readonly [number, number, number];
const setFill = (doc: jsPDF, c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
const setText = (doc: jsPDF, c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
const setDraw = (doc: jsPDF, c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);

function badgeMeta(badge: MissionBadge, t: (s: string) => string): { label: string; color: readonly [number, number, number] } {
  switch (badge) {
    case 'flight': return { label: t('FLIGHT'), color: SUCCESS };
    case 'due-soon': return { label: t('SEGERA'), color: WARNING };
    case 'overdue': return { label: t('TERLAMBAT'), color: DANGER };
    case 'landing-overdue': return { label: t('TERLAMBAT MENDARAT'), color: DANGER };
  }
}

function missionDetail(m: ReportMissionRow, t: (s: string) => string): string {
  if (m.badge === 'due-soon') return `${t('Take off dalam')} ${m.minutes} ${t('menit')} · ${m.altitude} m`;
  if (m.badge === 'overdue') return `${t('Terlambat take off')} ${m.minutes} ${t('menit')} · ${m.altitude} m`;
  return `${t('Terbang')} ${m.elapsed ?? '00:00'} · ${m.altitude} m`;
}

const severityColor = (s: ReportAlertRow['severity']) =>
  s === 'kritis' ? DANGER : s === 'peringatan' ? WARNING : ACCENT;

/** Tile statistik ringkas — dipakai untuk baris "Total Simulasi/Media"
    dan tiga tile "Misi per Status". Mengembalikan tinggi yang dipakai. */
function drawTile(
  doc: jsPDF, x: number, y: number, w: number, h: number,
  value: string, label: string, accent: readonly [number, number, number],
): void {
  setFill(doc, TILE_BG);
  setDraw(doc, TILE_BORDER);
  doc.roundedRect(x, y, w, h, 6, 6, 'FD');

  setText(doc, accent);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(19);
  doc.text(value, x + 14, y + h / 2 - 2);

  setText(doc, MUTED);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(label, x + 14, y + h - 12, { maxWidth: w - 24 });
}

function ensureSpace(doc: jsPDF, y: number, needed: number, pageHeight: number): number {
  if (y + needed <= pageHeight - 56) return y;
  doc.addPage();
  return MARGIN;
}

export function generateDashboardPdf(data: DashboardReportData, t: (s: string) => string): void {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const now = Date.now();

  /* ---- Kop laporan ---- */
  setFill(doc, HEADER_BG);
  doc.rect(0, 0, pageWidth, 88, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(17);
  doc.text(t('Mission Dashboard'), MARGIN, 38);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10.5);
  doc.text(t('Laporan Ringkasan'), MARGIN, 56);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.text(`${data.station} (${data.stationCode})`, pageWidth - MARGIN, 38, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${fullTimestamp(now, data.lang)} WIB`, pageWidth - MARGIN, 54, { align: 'right' });

  let y = 88 + 26;

  /* ---- Tile statistik ---- */
  const tileGap = 16;
  const tileW = (pageWidth - MARGIN * 2 - tileGap) / 2;
  const tileH = 58;
  drawTile(doc, MARGIN, y, tileW, tileH, String(data.simulationTotal), t('Total Simulasi Dibuat'), ACCENT);
  drawTile(
    doc, MARGIN + tileW + tileGap, y, tileW, tileH,
    String(data.mediaCount), `${t('Media Tersimpan')} · ${data.mediaSizeMb.toLocaleString('id-ID')} MB`, SUCCESS,
  );
  y += tileH + 26;

  /* ---- Misi Sedang Terbang ---- */
  y = ensureSpace(doc, y, 40, pageHeight);
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(t('Misi Sedang Terbang'), MARGIN, y);
  y += 14;

  if (data.missions.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(doc, MUTED);
    doc.text(t('Tidak ada misi berstatus Flight saat ini.'), MARGIN, y + 6);
    y += 26;
  } else {
    autoTable(doc, {
      startY: y,
      margin: { left: MARGIN, right: MARGIN },
      head: [[t('Misi'), t('Kode'), t('Pemimpin'), t('Status'), t('Keterangan')]],
      body: data.missions.map(m => [
        m.name, m.code, m.leader, badgeMeta(m.badge, t).label, missionDetail(m, t),
      ]),
      theme: 'grid',
      styles: { fontSize: 9, textColor: [...INK], cellPadding: 6 },
      headStyles: { fillColor: [...HEADER_BG], textColor: 255, fontStyle: 'bold' },
      columnStyles: { 3: { cellWidth: 88, halign: 'center' } },
      didParseCell: (hook) => {
        if (hook.section !== 'body' || hook.column.index !== 3) return;
        const m = data.missions[hook.row.index];
        if (!m) return;
        const { color } = badgeMeta(m.badge, t);
        hook.cell.styles.fillColor = [...color];
        hook.cell.styles.textColor = [255, 255, 255];
        hook.cell.styles.fontStyle = 'bold';
      },
    });
    y = ((doc as DocWithAutoTable).lastAutoTable?.finalY ?? y + 20) + 26;
  }

  /* ---- Misi per Status ---- */
  y = ensureSpace(doc, y, 80, pageHeight);
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(t('Misi per Status'), MARGIN, y);
  y += 14;

  const statusGap = 12;
  const statusW = (pageWidth - MARGIN * 2 - statusGap * 2) / 3;
  const statusH = 50;
  drawTile(doc, MARGIN, y, statusW, statusH, String(data.missionStatusCounts.Planned), t('Planned'), WARNING);
  drawTile(doc, MARGIN + statusW + statusGap, y, statusW, statusH, String(data.missionStatusCounts.Flight), t('Flight'), ACCENT);
  drawTile(doc, MARGIN + (statusW + statusGap) * 2, y, statusW, statusH, String(data.missionStatusCounts.Done), t('Done'), SUCCESS);
  y += statusH + 26;

  /* ---- Peringatan Terkini ---- */
  y = ensureSpace(doc, y, 40, pageHeight);
  setText(doc, INK);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12.5);
  doc.text(t('Peringatan Terkini'), MARGIN, y);
  y += 16;

  if (data.alerts.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    setText(doc, MUTED);
    doc.text(t('Tidak ada peringatan belum dibaca.'), MARGIN, y + 6);
    y += 26;
  } else {
    const titleFontSize = 9.5;
    const metaFontSize = 8;
    const lineHeight = titleFontSize * 1.15; // dekati faktor tinggi baris bawaan jsPDF
    const alertMaxWidth = pageWidth - MARGIN * 2 - 10;

    for (const alert of data.alerts) {
      /* Judul bisa membungkus lebih dari satu baris (kalimat cuaca cukup
         panjang) — jumlah barisnya diukur dulu lewat splitTextToSize,
         supaya baris meta di bawahnya tidak menumpuk baris kedua judul
         seperti sebelumnya (tinggi baris dulu selalu dianggap tetap). */
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize);
      const titleLines = doc.splitTextToSize(t(alert.detail || alert.title), alertMaxWidth) as string[];
      const titleHeight = titleLines.length * lineHeight;
      const rowHeight = titleHeight + metaFontSize + 16;

      y = ensureSpace(doc, y, rowHeight, pageHeight);
      const color = severityColor(alert.severity);

      setFill(doc, color);
      doc.rect(MARGIN, y, 3, rowHeight - 6, 'F');

      setText(doc, INK);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(titleFontSize);
      doc.text(titleLines, MARGIN + 10, y + 11);

      setText(doc, MUTED);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(metaFontSize);
      doc.text(`${fullTimestamp(alert.ts, data.lang)} · ${t(alert.source)}`, MARGIN + 10, y + titleHeight + 12);

      y += rowHeight;
    }
  }

  /* ---- Footer tiap halaman ---- */
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    setDraw(doc, TILE_BORDER);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, pageHeight - 40, pageWidth - MARGIN, pageHeight - 40);

    setText(doc, MUTED);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `${t('Dihasilkan otomatis dari data operasional stasiun')} ${data.station} · ${fullTimestamp(now, data.lang)} WIB`,
      MARGIN, pageHeight - 26,
    );
    doc.text(`${i} / ${pageCount}`, pageWidth - MARGIN, pageHeight - 26, { align: 'right' });
  }

  const stamp = new Date(now);
  const pad = (n: number) => String(n).padStart(2, '0');
  const filenameStamp = `${stamp.getFullYear()}${pad(stamp.getMonth() + 1)}${pad(stamp.getDate())}-${pad(stamp.getHours())}${pad(stamp.getMinutes())}`;
  doc.save(`dashboard-${data.stationCode}-${filenameStamp}.pdf`);
}
