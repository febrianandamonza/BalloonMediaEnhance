/* =====================================================================
   Pustaka pembangun dokumen Word.
   Menyediakan gaya, sampul bertema sertifikat, dan blok konten yang
   dipakai bersama oleh kelima dokumen keluaran.
   ===================================================================== */
const fs = require('node:fs');
const path = require('node:path');
const {
  Document, Packer, Paragraph, TextRun, ImageRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, BorderStyle, ShadingType, PageBreak,
  Header, Footer, PageNumber, TableOfContents, convertInchesToTwip, VerticalAlign,
  LevelFormat, TabStopType, ExternalHyperlink,
} = require('docx');

/* ---------- Palet mengikuti sertifikat lisensi TAB ---------- */
const C = {
  navy: '0B1F4B',
  navyDeep: '071431',
  blue: '1E5BB8',
  blueLight: '3B82F6',
  gold: 'C9A227',
  goldLight: 'E3C766',
  ink: '1A202C',
  body: '2D3748',
  muted: '5A6779',
  line: 'D7DCE5',
  panel: 'F4F6FA',
  white: 'FFFFFF',
};

/* Tangkapan layar disimpan di dalam repositori (docs/screenshots) supaya
   dokumen dapat dibangun ulang kapan saja tanpa menjalankan aplikasi. */
const SHOT_DIR = process.env.SHOT_DIR
  || path.join(__dirname, '..', '..', 'docs', 'screenshots');

/* ---------- Gaya dokumen ---------- */
const styles = {
  default: {
    document: {
      run: { font: 'Calibri', size: 21, color: C.body },
      paragraph: { spacing: { line: 288, after: 120 } },
    },
  },
  paragraphStyles: [
    {
      id: 'Title', name: 'Title', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Georgia', size: 52, bold: true, color: C.navy },
      paragraph: { spacing: { before: 0, after: 200 } },
    },
    {
      id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Georgia', size: 30, bold: true, color: C.navy },
      paragraph: {
        spacing: { before: 360, after: 160 },
        border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: C.gold, space: 6 } },
      },
    },
    {
      id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Calibri', size: 25, bold: true, color: C.blue },
      paragraph: { spacing: { before: 260, after: 110 } },
    },
    {
      id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Calibri', size: 22, bold: true, color: C.ink },
      paragraph: { spacing: { before: 200, after: 90 } },
    },
    {
      id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal', quickFormat: true,
      run: { font: 'Calibri', size: 17, italics: true, color: C.muted },
      paragraph: { alignment: AlignmentType.CENTER, spacing: { before: 80, after: 240 } },
    },
    {
      id: 'TableHead', name: 'Table Head', basedOn: 'Normal', next: 'Normal',
      run: { font: 'Calibri', size: 19, bold: true, color: C.white },
      paragraph: { spacing: { before: 40, after: 40 } },
    },
    {
      id: 'TableCellText', name: 'Table Cell Text', basedOn: 'Normal', next: 'Normal',
      run: { font: 'Calibri', size: 19, color: C.body },
      paragraph: { spacing: { before: 40, after: 40 }, line: 264 },
    },
    {
      id: 'Mono', name: 'Mono', basedOn: 'Normal', next: 'Normal',
      run: { font: 'Consolas', size: 18, color: C.navy },
      paragraph: { spacing: { before: 40, after: 40 } },
    },
  ],
};

/* ---------- Penomoran ---------- */
const numbering = {
  config: [
    {
      reference: 'steps',
      levels: [{
        level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.START,
        style: { paragraph: { indent: { left: 460, hanging: 280 }, spacing: { after: 90 } } },
      }],
    },
    {
      reference: 'bullets',
      levels: [
        {
          level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 420, hanging: 240 }, spacing: { after: 70 } } },
        },
        {
          level: 1, format: LevelFormat.BULLET, text: '–', alignment: AlignmentType.START,
          style: { paragraph: { indent: { left: 780, hanging: 240 }, spacing: { after: 60 } } },
        },
      ],
    },
  ],
};

/* ---------- Blok teks ---------- */
const P = (text, opts = {}) => new Paragraph({
  ...opts,
  children: Array.isArray(text)
    ? text
    : [new TextRun({ text, ...(opts.run || {}) })],
});

const H1 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1, pageBreakBefore: true });
const H1c = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_1 });
const H2 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_2 });
const H3 = (t) => new Paragraph({ text: t, heading: HeadingLevel.HEADING_3 });

const Body = (t) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  children: [new TextRun(t)],
});

/** Paragraf dengan potongan tebal: rich('Teks ', ['tebal', true], ' lanjut') */
const rich = (...parts) => new Paragraph({
  alignment: AlignmentType.JUSTIFIED,
  children: parts.map((p) =>
    Array.isArray(p)
      ? new TextRun({ text: p[0], bold: !!p[1], italics: !!p[2] })
      : new TextRun(p)),
});

const Steps = (items) => items.map((t) => new Paragraph({
  numbering: { reference: 'steps', level: 0 },
  children: [typeof t === 'string' ? new TextRun(t) : t],
}));

const Bullets = (items, level = 0) => items.map((t) => new Paragraph({
  numbering: { reference: 'bullets', level },
  children: [typeof t === 'string' ? new TextRun(t) : t],
}));

const Mono = (t) => new Paragraph({
  style: 'Mono',
  shading: { type: ShadingType.CLEAR, fill: C.panel },
  border: {
    top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 },
    bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 },
    left: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 },
    right: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 6 },
  },
  children: [new TextRun(t)],
});

/** Kotak catatan bergaris emas di tepi kiri. */
const Note = (label, text) => new Paragraph({
  shading: { type: ShadingType.CLEAR, fill: 'FBF6E3' },
  border: {
    left: { style: BorderStyle.SINGLE, size: 18, color: C.gold, space: 8 },
    top: { style: BorderStyle.SINGLE, size: 2, color: 'EFE3BC', space: 6 },
    bottom: { style: BorderStyle.SINGLE, size: 2, color: 'EFE3BC', space: 6 },
    right: { style: BorderStyle.SINGLE, size: 2, color: 'EFE3BC', space: 6 },
  },
  spacing: { before: 160, after: 200 },
  children: [
    new TextRun({ text: `${label}  `, bold: true, color: '8A6D1F' }),
    new TextRun({ text, color: '5C4A16' }),
  ],
});

/**
 * Word tidak menafsirkan karakter baris baru di dalam satu run.
 * Fungsi ini memecah teks menjadi beberapa run dengan pemutus baris
 * eksplisit sehingga tampilannya sesuai maksud penulisan.
 */
function multiline(text, runOpts = {}) {
  return String(text).split('\n').map((line, i) =>
    new TextRun({ text: line, ...runOpts, ...(i > 0 ? { break: 1 } : {}) }));
}

/* ---------- Tabel ---------- */
function cell(children, opts = {}) {
  return new TableCell({
    children: Array.isArray(children) ? children : [children],
    shading: opts.fill ? { type: ShadingType.CLEAR, fill: opts.fill } : undefined,
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 130, right: 130 },
    columnSpan: opts.span,
    width: opts.width ? { size: opts.width, type: WidthType.PERCENTAGE } : undefined,
  });
}

/**
 * Tabel data dengan baris kepala berwarna navy dan baris selang-seling.
 * @param head  array judul kolom
 * @param rows  array baris (array sel bertipe string)
 */
function DataTable(head, rows, widths) {
  const border = { style: BorderStyle.SINGLE, size: 2, color: C.line };

  const headerRow = new TableRow({
    tableHeader: true,
    children: head.map((h, i) => cell(
      new Paragraph({ style: 'TableHead', children: [new TextRun({ text: h, bold: true, color: C.white })] }),
      { fill: C.navy, width: widths ? widths[i] : undefined },
    )),
  });

  const bodyRows = rows.map((r, ri) => new TableRow({
    children: r.map((c, ci) => cell(
      new Paragraph({
        style: 'TableCellText',
        children: multiline(String(c), { bold: ci === 0 && head.length === 2 }),
      }),
      { fill: ri % 2 === 1 ? C.panel : undefined, width: widths ? widths[ci] : undefined },
    )),
  }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: { top: border, bottom: border, left: border, right: border, insideHorizontal: border, insideVertical: border },
    rows: [headerRow, ...bodyRows],
  });
}

/* ---------- Gambar ---------- */
let figureCounter = { n: 0 };

function resetFigures() { figureCounter.n = 0; }

/**
 * Menyisipkan tangkapan layar beserta keterangan gambar bernomor.
 * Lebar disesuaikan agar muat pada margin A4 (maksimum ±16,3 cm).
 */
function Figure(fileName, caption, opts = {}) {
  /* Tangkapan layar disimpan sebagai JPEG agar berkas dokumen tetap
     ringan; nama PNG lama tetap diterima supaya rujukan pada naskah
     tidak perlu diubah satu per satu. */
  const candidates = [
    fileName,
    fileName.replace(/\.png$/i, '.jpg'),
    fileName.replace(/\.jpg$/i, '.png'),
  ];
  const found = candidates
    .map((name) => path.join(SHOT_DIR, name))
    .find((p) => fs.existsSync(p));

  if (!found) {
    console.warn(`  ! tangkapan layar tidak ditemukan: ${fileName}`);
    return [P(`[Tangkapan layar ${fileName} belum tersedia]`, { alignment: AlignmentType.CENTER })];
  }

  const data = fs.readFileSync(found);
  const dim = imageSize(data);
  const maxW = opts.maxWidth || 620;         // titik (pt) — ±16,3 cm
  const maxH = opts.maxHeight || 700;
  let w = maxW;
  let h = Math.round((dim.height / dim.width) * w);
  if (h > maxH) { h = maxH; w = Math.round((dim.width / dim.height) * h); }

  figureCounter.n += 1;

  return [
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 200, after: 0 },
      border: {
        top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 },
        left: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 },
        right: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 },
      },
      children: [new ImageRun({ type: dim.type, data, transformation: { width: w, height: h } })],
    }),
    new Paragraph({
      style: 'Caption',
      children: [
        new TextRun({ text: `Gambar ${figureCounter.n}. `, bold: true, color: C.navy }),
        new TextRun({ text: caption, italics: true }),
      ],
    }),
  ];
}

/**
 * Membaca lebar, tinggi, dan jenis gambar langsung dari header berkas —
 * tanpa memerlukan pustaka pengolah citra.
 *
 *   PNG  : lebar & tinggi berada pada blok IHDR di awal berkas.
 *   JPEG : ditelusuri per segmen sampai menemukan penanda SOF yang
 *          memuat ukuran bingkai.
 */
function imageSize(buf) {
  /* PNG — 89 50 4E 47 */
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20), type: 'png' };
  }

  /* JPEG — FF D8 */
  if (buf.length > 4 && buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2;
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i += 1; continue; }
      const marker = buf[i + 1];
      /* SOF0–SOF15, kecuali DHT (C4), JPG (C8), dan DAC (CC) */
      if (marker >= 0xc0 && marker <= 0xcf
          && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return {
          height: buf.readUInt16BE(i + 5),
          width: buf.readUInt16BE(i + 7),
          type: 'jpg',
        };
      }
      i += 2 + buf.readUInt16BE(i + 2);
    }
  }

  throw new Error('Format gambar tidak dikenali — hanya PNG dan JPEG yang didukung.');
}

/* ---------- Sampul ---------- */
/**
 * Sampul bertema sertifikat: bidang navy penuh, garis emas ganda,
 * lambang, judul dokumen, dan blok identitas lisensi.
 */
function Cover({ kind, title, subtitle, licenseNumbers, expiry, docNo, version, date }) {
  const noBorder = { style: BorderStyle.NONE, size: 0, color: 'auto' };
  const goldRule = (size) => new Paragraph({
    spacing: { before: 60, after: 60 },
    border: { bottom: { style: BorderStyle.SINGLE, size, color: C.gold, space: 2 } },
    children: [new TextRun('')],
  });

  const inner = [
    new Paragraph({ spacing: { before: 420, after: 0 }, alignment: AlignmentType.CENTER, children: [
      new TextRun({ text: 'TAB', font: 'Georgia', size: 64, bold: true, color: C.goldLight }),
    ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 40 }, children: [
      new TextRun({ text: 'INTEGRATED SYSTEMS PTE LTD', font: 'Calibri', size: 17, bold: true, color: 'A9BBDA', characterSpacing: 60 }),
    ] }),

    goldRule(10),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 300, after: 0 }, children: [
      new TextRun({ text: kind, font: 'Calibri', size: 20, bold: true, color: C.goldLight, characterSpacing: 120 }),
    ] }),

    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 200, after: 0, line: 380 },
      children: multiline(title, { font: 'Georgia', size: 46, bold: true, color: C.white }),
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { before: 140, after: 260, line: 300 },
      children: multiline(subtitle, { font: 'Calibri', size: 22, color: 'C3D2EC' }),
    }),

    goldRule(6),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 260, after: 40 }, children: [
      new TextRun({ text: 'DITERBITKAN UNTUK', font: 'Calibri', size: 15, bold: true, color: '8FA6CC', characterSpacing: 90 }),
    ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [
      new TextRun({ text: 'Badan Intelijen Negara', font: 'Georgia', size: 30, bold: true, color: C.goldLight }),
    ] }),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 20 }, children: [
      new TextRun({ text: 'LICENSE NUMBER', font: 'Calibri', size: 14, bold: true, color: '8FA6CC', characterSpacing: 90 }),
    ] }),
    ...licenseNumbers.map((sn) => new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 30 },
      children: [new TextRun({ text: sn, font: 'Consolas', size: 20, color: C.white })],
    })),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 20 }, children: [
      new TextRun({ text: 'MASA BERLAKU', font: 'Calibri', size: 14, bold: true, color: '8FA6CC', characterSpacing: 90 }),
    ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 420 }, children: [
      new TextRun({ text: `20 Juli 2026 — ${expiry}`, font: 'Calibri', size: 20, color: C.white }),
    ] }),

    goldRule(10),

    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 200, after: 0 }, children: [
      new TextRun({ text: `${docNo}   ·   Versi ${version}   ·   ${date}`, font: 'Calibri', size: 16, color: '8FA6CC' }),
    ] }),
    new Paragraph({ alignment: AlignmentType.CENTER, spacing: { before: 40, after: 420 }, children: [
      new TextRun({ text: 'DOKUMEN TERBATAS — TIDAK UNTUK DISEBARLUASKAN', font: 'Calibri', size: 14, bold: true, color: 'D9A7A7', characterSpacing: 60 }),
    ] }),
  ];

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: noBorder, bottom: noBorder, left: noBorder, right: noBorder,
      insideHorizontal: noBorder, insideVertical: noBorder,
    },
    rows: [new TableRow({
      height: { value: convertInchesToTwip(9.6), rule: 'atLeast' },
      children: [new TableCell({
        shading: { type: ShadingType.CLEAR, fill: C.navy },
        margins: { top: 0, bottom: 0, left: 340, right: 340 },
        children: inner,
      })],
    })],
  });
}

/* ---------- Header & Footer ---------- */
function makeHeader(docTitle) {
  return new Header({
    children: [new Paragraph({
      spacing: { after: 0 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: C.gold, space: 4 } },
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
      children: [
        new TextRun({ text: 'Tethered Balloon GeoInt — Ground Control Station', size: 16, color: C.muted }),
        new TextRun({ text: '\t' }),
        new TextRun({ text: docTitle, size: 16, bold: true, color: C.navy }),
      ],
    })],
  });
}

function makeFooter(docNo) {
  return new Footer({
    children: [new Paragraph({
      spacing: { before: 0 },
      border: { top: { style: BorderStyle.SINGLE, size: 4, color: C.line, space: 4 } },
      tabStops: [{ type: TabStopType.RIGHT, position: 9360 }],
      children: [
        new TextRun({ text: `${docNo}  ·  TAB Integrated Systems Pte Ltd  ·  Badan Intelijen Negara`, size: 15, color: C.muted }),
        new TextRun({ text: '\t' }),
        new TextRun({ text: 'Halaman ', size: 15, color: C.muted }),
        new TextRun({ children: [PageNumber.CURRENT], size: 15, color: C.navy, bold: true }),
        new TextRun({ text: ' dari ', size: 15, color: C.muted }),
        new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 15, color: C.navy, bold: true }),
      ],
    })],
  });
}

/* ---------- Daftar isi ---------- */
function TOC() {
  return [
    H1c('Daftar Isi'),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({
      text: 'Klik kanan pada daftar di bawah lalu pilih “Update Field” untuk memperbarui nomor halaman setelah dokumen diedit.',
      italics: true, size: 18, color: C.muted,
    })] }),
    new TableOfContents('Daftar Isi', { hyperlink: true, headingStyleRange: '1-3' }),
  ];
}

/* ---------- Perakitan dokumen ---------- */
async function buildDocument({ fileName, docTitle, docNo, cover, body, outDir }) {
  /* Isi dokumen sudah dirakit sebelum fungsi ini dipanggil, sehingga
     jumlah gambar dibaca lebih dahulu lalu pencacah disiapkan ulang
     untuk dokumen berikutnya. */
  const figureCount = figureCounter.n;
  resetFigures();

  const doc = new Document({
    styles,
    numbering,
    creator: 'TAB Integrated Systems Pte Ltd',
    title: docTitle,
    description: `${docNo} — ${docTitle}`,
    sections: [
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
            margin: { top: 0, right: 0, bottom: 0, left: 0 },
          },
        },
        children: [cover],
      },
      {
        properties: {
          page: {
            size: { width: convertInchesToTwip(8.27), height: convertInchesToTwip(11.69) },
            margin: {
              top: convertInchesToTwip(0.9),
              right: convertInchesToTwip(0.85),
              bottom: convertInchesToTwip(0.85),
              left: convertInchesToTwip(0.95),
            },
          },
        },
        headers: { default: makeHeader(docTitle) },
        footers: { default: makeFooter(docNo) },
        children: body,
      },
    ],
  });

  fs.mkdirSync(outDir, { recursive: true });
  const buffer = await Packer.toBuffer(doc);
  const out = path.join(outDir, fileName);
  fs.writeFileSync(out, buffer);
  const kb = (buffer.length / 1024).toFixed(0);
  console.log(`  ✓ ${fileName}  (${kb} KB, ${figureCount} gambar)`);
  return out;
}

module.exports = {
  C, P, H1, H1c, H2, H3, Body, rich, Steps, Bullets, Mono, Note,
  DataTable, Figure, Cover, TOC, buildDocument, PageBreak, Paragraph, TextRun,
  AlignmentType, SHOT_DIR,
};
