# Docs Generator

Pembangkit lima dokumen keluaran pada folder [`output/`](../../output/):

| Berkas | Isi |
| --- | --- |
| `1. Ringkasan Sistem dan Tampilan Antarmuka.docx` | Penjelasan singkat setiap menu beserta tangkapan layarnya. |
| `2. Manual Book - Crowd Counting.docx` | Manual untuk Commercial Software License *Crowd Counting*. |
| `3. Manual Book - Analytic and Object Detection.docx` | Manual untuk Module License AODGIS (sub-modul 1.1a, 1.1b). |
| `4. Manual Book - Digital Analytic Enhancement Processing.docx` | Manual untuk Module License DAEP (sub-modul 1.2a – 1.2d). |
| `5. Manual Book - Information and Reporting.docx` | Manual untuk Module License IRGIS (sub-modul 1.3a – 1.3f). |

Seluruh berkas berformat `.docx` dan dapat disunting langsung di Microsoft Word.

## Cara Menjalankan

### 1. Pasang dependensi

```bash
cd tools/docs-generator
npm install
npx playwright install chromium
```

### 2. Jalankan aplikasi yang akan ditangkap layarnya

```bash
cd ../../app
npm run build
npx next start -p 3210
```

### 3. Ambil tangkapan layar

```bash
cd ../tools/docs-generator
BASE_URL=http://localhost:3210 OUT_DIR=../../docs/screenshots npm run capture
```

Skrip menelusuri seluruh menu, memperagakan alur aktivasi lisensi (kunci
keliru → pesan galat → kunci benar → berhasil), serta menangkap mode sidebar
ciut dan tema terang.

### 4. Susun dokumen

```bash
SHOT_DIR=../../docs/screenshots OUT_DIR=../../output npm run build
```

## Struktur Berkas

| Berkas | Peran |
| --- | --- |
| `capture.js` | Menangkap tangkapan layar seluruh menu memakai Playwright. |
| `lib.js` | Gaya dokumen, sampul bertema sertifikat, tabel, gambar, header/footer. |
| `common.js` | Bab yang identik pada seluruh manual: kontrol dokumen, prasyarat, alur masuk, aktivasi lisensi, pemecahan masalah, lampiran. |
| `manuals.js` | Isi khusus keempat manual book. |
| `build.js` | Titik masuk — menyusun dokumen ringkasan lalu memanggil keempat manual. |

## Catatan

- Daftar isi disisipkan sebagai *field* Word. Setelah dokumen dibuka, klik
  kanan pada daftar isi lalu pilih **Update Field** agar nomor halaman terisi.
- Tangkapan layar diambil pada viewport 1680 × 1020 dengan skala 1,25×,
  menghasilkan lebar sekitar 2100 piksel — setara ±320 DPI pada lebar cetak
  16,3 cm.
- Nomor seri lisensi yang tercantum pada sampul dan isi dokumen dibaca dari
  [`common.js`](common.js) dan harus sesuai dengan
  [`app/src/app/lib/licensing.ts`](../../app/src/app/lib/licensing.ts).
