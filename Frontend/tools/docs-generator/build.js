/* =====================================================================
   Pembangkit lima dokumen keluaran:
     1. Ringkasan sistem beserta tangkapan layar seluruh menu
     2–5. Empat manual book, satu untuk setiap sertifikat lisensi
   ===================================================================== */
const path = require('node:path');
const {
  H1, H1c, H2, H3, Body, rich, Steps, Bullets, Mono, Note,
  DataTable, Figure, Cover, TOC, buildDocument,
} = require('./lib');
const K = require('./common');

/* Dokumen jadi ditulis ke folder output di akar proyek. */
const OUT_DIR = process.env.OUT_DIR
  || path.join(__dirname, '..', '..', 'output');

/* =====================================================================
   DOKUMEN 1 — RINGKASAN SISTEM
   ===================================================================== */
async function buildOverview() {
  const docNo = 'TAB-DOC-2026-OVW-01';
  const docTitle = 'Ringkasan Sistem dan Tampilan Antarmuka';

  const cover = Cover({
    kind: 'DOKUMEN RINGKASAN SISTEM',
    title: 'Tethered Balloon\nGeoInt System',
    subtitle: 'Ringkasan Fungsi dan Tampilan Antarmuka Ground Control Station',
    licenseNumbers: [
      'TAB-CC-2026-001-A8F4K2  ·  TAB-CC-2026-002-B7M9X5',
      'TAB-AODGIS-2026-003-C3L8P6  ·  TAB-AODGIS-2026-004-D5Q7W1',
      'TAB-DAEP-2026-005-E9R4T8  ·  TAB-DAEP-2026-006-F2N6Y7',
      'TAB-IRGIS-2026-007-G5V8K3  ·  TAB-IRGIS-2026-008-H7M2Z9',
    ],
    expiry: K.EXPIRY,
    docNo, version: K.VERSI, date: K.TANGGAL,
  });

  const body = [
    ...TOC(),

    H1('Ringkasan Eksekutif'),
    Body(
      'Tethered Balloon Geospatial Intelligence System adalah perangkat lunak Ground Control Station ' +
      'yang mengendalikan, memantau, dan menganalisis sistem pengawasan berbasis balon udara tertambat. ' +
      'Perangkat lunak terhubung langsung dengan muatan gimbal sensor ganda Epsilon 140Z G2, sistem ' +
      'penambat darat, serta kabel penambat yang menyalurkan daya dan data.'
    ),
    Body(
      'Sistem dirancang dengan prinsip pemrosesan lokal penuh. Seluruh inferensi kecerdasan buatan, ' +
      'penyimpanan rekaman, dan penyusunan laporan berlangsung pada workstation di lapangan tanpa ' +
      'ketergantungan pada koneksi internet maupun layanan awan. Dokumen ini merangkum fungsi setiap ' +
      'menu beserta tampilan antarmukanya sebagai pengantar sebelum membaca manual book per lisensi.'
    ),

    H2('Sertifikat Lisensi yang Diterbitkan'),
    DataTable(['Sertifikat', 'Nama Lisensi', 'Sub-modul', 'Manual Book'], [
      ['Commercial Software License', 'Crowd Counting', '1', 'TAB-MB-2026-CC-01'],
      ['Module License', 'Analytic and Object Detection Tethered Balloon Geospatial Intelligence System', '2', 'TAB-MB-2026-AODGIS-01'],
      ['Module License', 'Digital Analytic Enhancement Processing System Module', '4', 'TAB-MB-2026-DAEP-01'],
      ['Module License', 'Information and Reporting Tethered Balloon Geospatial Intelligence System Module', '6', 'TAB-MB-2026-IRGIS-01'],
    ], [22, 42, 10, 26]),

    H2('Peta Menu Aplikasi'),
    DataTable(['Kelompok', 'Menu', 'Kode', 'Lisensi Penaung'], [
      ['Command Center', 'Mission Dashboard', '—', 'Platform (selalu tersedia)'],
      ['Command Center', 'Surveillance Media', '—', 'Platform (selalu tersedia)'],
      ['Crowd Counting', 'Crowd Counting', 'CC-01', 'Crowd Counting'],
      ['Analytic & Object Detection', 'Imaging Analytic', '1.1a', 'AODGIS'],
      ['Analytic & Object Detection', 'Video Analytic', '1.1b', 'AODGIS'],
      ['Enhancement Processing', 'Imaging Enhancement', '1.2a', 'DAEP'],
      ['Enhancement Processing', 'Video Enhancement', '1.2b', 'DAEP'],
      ['Enhancement Processing', 'Tether Cable API', '1.2c', 'DAEP'],
      ['Enhancement Processing', 'Tether Cable Monitor', '1.2d', 'DAEP'],
      ['Information & Reporting', 'Digital Reporting', '1.3a', 'IRGIS'],
      ['Information & Reporting', 'GeoInt Visualisation', '1.3b', 'IRGIS'],
      ['Information & Reporting', 'Smart Notification', '1.3c', 'IRGIS'],
      ['Information & Reporting', 'Flight Information', '1.3d', 'IRGIS'],
      ['Information & Reporting', 'Mooring Availability', '1.3e', 'IRGIS'],
      ['Information & Reporting', 'Flight Simulation', '1.3f', 'IRGIS'],
      ['Administration', 'License Manager', '—', 'Platform (selalu tersedia)'],
      ['Administration', 'User Management', '—', 'Platform (selalu tersedia)'],
      ['Administration', 'Audit Trail', '—', 'Platform (selalu tersedia)'],
      ['Administration', 'System Settings', '—', 'Platform (selalu tersedia)'],
    ], [26, 30, 12, 32]),

    /* ---- Alur masuk ---- */
    H1('Alur Masuk Aplikasi'),
    Body(
      'Halaman masuk menampilkan visualisasi tiga dimensi posisi balon tertambat pada bola bumi. ' +
      'Dua akun stasiun terdaftar: gcs1 untuk Ground Control Station 1 dan gcs2 untuk Ground Control ' +
      'Station 2. Kartu akun di bagian bawah formulir mengisi kolom kredensial secara otomatis.'
    ),
    ...Figure('00-login.png', 'Halaman masuk dengan visualisasi balon tertambat.'),
    ...Figure('02-authenticating.png', 'Empat tahap verifikasi: kredensial, hardware fingerprint, sertifikat lisensi, dan pemuatan modul.'),
    ...Figure('03-access-granted.png', 'Konfirmasi akses beserta ringkasan status stasiun dan jumlah lisensi aktif.'),

    /* ---- Menu per menu ---- */
    H1('Command Center'),

    H2('Mission Dashboard'),
    Body(
      'Halaman pembuka ruang kendali. Panel utama menampilkan visualisasi tiga dimensi wilayah ' +
      'pengawasan, jam misi, status sistem, ketinggian balon, dan durasi misi berjalan. Di bawahnya ' +
      'terdapat empat kartu statistik dengan grafik tren, status keempat sertifikat lisensi, pintasan ' +
      'akses modul, telemetri platform, serta ringkasan peringatan terkini.'
    ),
    ...Figure('10-dashboard.png', 'Mission Dashboard — ringkasan operasi stasiun.'),

    H2('Surveillance Media'),
    Body(
      'Katalog citra dan rekaman hasil pengawasan sekaligus jalur pemasukan berkas baru. Area unggah ' +
      'menerima berkas melalui seret-dan-lepas maupun pemilihan manual, memvalidasi format dan ukuran, ' +
      'lalu menampilkan kemajuan setiap berkas dalam antrean. Katalog dapat ditelusuri berdasarkan ' +
      'nama, label, jenis berkas, dan sensor sumber (EO atau IR), serta ditampilkan sebagai kisi ' +
      'kartu maupun tabel.'
    ),
    ...Figure('11-media-source.png', 'Surveillance Media Source — area unggah dan katalog media.'),

    H1('Modul Analitik'),

    H2('Crowd Counting (CC-01)'),
    Body(
      'Estimasi kepadatan massa berbasis model CSRNet dengan akselerasi CUDA. Panel utama menampilkan ' +
      'angka estimasi jumlah kepala di atas panggung video, disertai statistik sesi, tren kepadatan, ' +
      'dan konfigurasi ambang peringatan yang meneruskan alert ke modul Smart Notification.'
    ),
    ...Figure('12-crowd.png', 'Crowd Counting — estimasi kepadatan dan statistik sesi.'),

    H2('Imaging Analytic (1.1a)'),
    Body(
      'Deteksi objek pada citra statis menggunakan YOLOv8x lokal. Operator memuat berkas JPG, PNG, ' +
      'atau TIFF, mengatur ambang kepercayaan dan kelas objek yang dicari, lalu menjalankan deteksi. ' +
      'Hasil ditampilkan sebagai rincian per kelas dan dapat diteruskan ke Target Bank.'
    ),
    ...Figure('13-detection-image.png', 'Imaging Analytic — pemuatan citra dan parameter deteksi.'),

    H2('Video Analytic (1.1b)'),
    Body(
      'Deteksi objek bergerak secara real-time pada stream RTSP dengan algoritma tracking ByteTrack ' +
      'atau DeepSORT. Mendukung Moving Target Indicator dan pembatasan area deteksi melalui poligon ' +
      'geofence. Log deteksi langsung menampilkan waktu, kelas objek, tingkat kepercayaan, dan ' +
      'identitas pelacakan.'
    ),
    ...Figure('14-detection-video.png', 'Video Analytic — statistik deteksi dan log peristiwa langsung.'),

    H1('Modul Peningkatan Kualitas'),

    H2('Imaging Enhancement (1.2a)'),
    Body(
      'Peningkatan kualitas citra statis dengan algoritma CLAHE, penajaman Laplacian, unsharp masking, ' +
      'dan pengurangan kabut. Tampilan menyandingkan citra asli dengan hasil pemrosesan, dilengkapi ' +
      'pengukuran peningkatan kontras, ketajaman tepi, dan rasio sinyal terhadap derau.'
    ),
    ...Figure('15-enhance-image.png', 'Imaging Enhancement — perbandingan sebelum dan sesudah pemrosesan.'),

    H2('Video Enhancement (1.2b)'),
    Body(
      'Peningkatan stream video termal secara real-time dengan 22 palet false color sesuai Epsilon ' +
      'Manual §5.7.3. Kendali tambahan mencakup Automatic Gain Control, Digital Detail Enhancement, ' +
      'dan reduksi derau temporal.'
    ),
    ...Figure('16-enhance-video.png', 'Video Enhancement — pemilihan palet false color dan kendali termal.'),

    H2('Tether Cable API (1.2c)'),
    Body(
      'Antarmuka REST dan WebSocket lokal untuk pertukaran data daya dan data link kabel penambat. ' +
      'Halaman mendaftar seluruh endpoint yang tersedia, menampilkan contoh respons dalam format JSON, ' +
      'serta mengelola kunci akses yang diterbitkan untuk perangkat di stasiun darat.'
    ),
    ...Figure('17-tether-api.png', 'Tether Cable API — daftar endpoint dan contoh respons.'),

    H2('Tether Cable Monitor (1.2d)'),
    Body(
      'Pemantauan kesehatan kabel penambat berpenguat Kevlar dengan inti serat optik. Delapan ' +
      'parameter dipantau berkelanjutan — tegangan, arus, resistansi isolasi, kontinuitas konduktor, ' +
      'SNR serat optik, redaman optik, suhu selubung, dan tegangan tarik — masing-masing disertai ' +
      'batas operasi dan grafik tren.'
    ),
    ...Figure('18-tether-monitor.png', 'Tether Cable Monitor — parameter kesehatan kabel dan tren pembacaan.'),

    H1('Modul Informasi dan Pelaporan'),

    H2('Digital Reporting (1.3a)'),
    Body(
      'Pembuatan laporan misi otomatis dalam format PDF dan Excel. Tersedia enam templat laporan; ' +
      'operator memilih rentang waktu, format berkas, klasifikasi dokumen, serta bagian konten yang ' +
      'disertakan. Setiap laporan diberi watermark klasifikasi dan identitas stasiun.'
    ),
    ...Figure('19-reporting.png', 'Digital Reporting — pemilihan templat dan parameter laporan.'),

    H2('GeoInt Visualisation (1.3b)'),
    Body(
      'Peta taktis yang seluruh ubinnya dimuat dari penyimpanan lokal. Menampilkan posisi balon, ' +
      'proyeksi cakupan pandang kamera terhadap target terpilih, cincin jangkauan, serta seluruh titik ' +
      'Target Bank dengan penandaan tingkat ancaman. Koordinat target dapat diekspor ke format KML ' +
      'atau GPX.'
    ),
    ...Figure('20-geo-viz.png', 'GeoInt Visualisation — peta taktis, FOV cone, dan Target Bank.'),

    H2('Smart Notification (1.3c)'),
    Body(
      'Mesin aturan peringatan berbasis geofence, ambang batas sensor, dan deteksi intrusi. Peringatan ' +
      'dikelompokkan menurut tingkat kritis, peringatan, dan informasi, serta dieskalasi bertingkat ' +
      'sesuai peran penerima.'
    ),
    ...Figure('21-alerts.png', 'Smart Notification — riwayat peringatan dan aturan aktif.'),

    H2('Flight Information (1.3d)'),
    Body(
      'Logbook penerbangan otomatis dan checklist pra-terbang digital. Checklist membedakan butir ' +
      'kritis dari butir pendukung; lepas landas belum diizinkan selama masih ada butir kritis yang ' +
      'belum terpenuhi.'
    ),
    ...Figure('22-flight-info.png', 'Flight Information — misi berjalan, checklist pra-terbang, dan logbook.'),

    H2('Mooring Availability (1.3e)'),
    Body(
      'Telemetri stasiun penambat darat: anemometer, load cell winch, tekanan helium, suhu ambien, ' +
      'baterai cadangan, inverter darurat, proteksi petir, dan tautan optik. Setiap parameter disertai ' +
      'batas operasi yang menjadi acuan penerbitan peringatan.'
    ),
    ...Figure('23-mooring.png', 'Mooring Availability — sensor stasiun penambat dan status winch.'),

    H2('Flight Simulation (1.3f)'),
    Body(
      'Kalkulator kelayakan terbang yang mengevaluasi sepuluh faktor operasi dan menghasilkan ' +
      'keputusan GO, MARGINAL, atau NO-GO beserta penilaian per faktor dan margin keselamatan gabungan.'
    ),
    ...Figure('24-simulation.png', 'Flight Simulation — parameter skenario dan keputusan kelayakan.'),

    H1('Administrasi Sistem'),

    H2('License Manager'),
    Body(
      'Menampilkan empat sertifikat lisensi lengkap dengan License Number, tanggal berakhir, penerima ' +
      'lisensi, dan daftar sub-modul yang dibuka. Aktivasi dilakukan dengan memasukkan License Number ' +
      'yang tercetak pada sertifikat.'
    ),
    ...Figure('25-licenses.png', 'License Manager — empat sertifikat beserta status aktivasinya.'),
    ...Figure('31-activation-modal.png', 'Formulir aktivasi lisensi dengan daftar sub-modul yang akan terbuka.'),

    H2('User Management'),
    Body(
      'Manajemen akun operator dan kontrol akses berbasis peran untuk kedua stasiun. Lima peran ' +
      'tersedia: Administrator, Commander, Supervisor, Operator, dan Technician, masing-masing dengan ' +
      'matriks izin yang ditampilkan pada halaman.'
    ),
    ...Figure('26-users.png', 'User Management — daftar operator dan matriks izin.'),

    H2('Audit Trail'),
    Body(
      'Catatan aktivitas sistem yang bersifat append-only. Entri dapat disaring menurut kategori dan ' +
      'diekspor ke format CSV untuk keperluan audit.'
    ),
    ...Figure('27-audit-log.png', 'Audit Trail — riwayat aktivitas seluruh stasiun.'),

    H2('System Settings'),
    Body(
      'Konfigurasi terbagi dalam lima tab: Gimbal & Sensor, Jaringan, AI Inference, Tampilan, serta ' +
      'Data dan Retensi. Setiap tab memuat parameter operasional beserta batas nilai yang menjadi ' +
      'acuan penguncian otomatis.'
    ),
    ...Figure('28-settings.png', 'System Settings — konfigurasi gimbal dan batas operasi.'),

    ...K.prerequisites(),

    H1('Penutup'),
    Body(
      'Dokumen ini memberikan gambaran menyeluruh atas fungsi dan tampilan setiap menu. Prosedur ' +
      'operasi terperinci untuk setiap sub-modul diuraikan pada empat manual book terpisah yang ' +
      'diterbitkan bersama dokumen ini, masing-masing menyertai satu sertifikat lisensi.'
    ),
    DataTable(['Dokumen', 'Nomor', 'Cakupan'], [
      ['Manual Book — Crowd Counting', 'TAB-MB-2026-CC-01', 'Sub-modul CC-01'],
      ['Manual Book — Analytic and Object Detection', 'TAB-MB-2026-AODGIS-01', 'Sub-modul 1.1a dan 1.1b'],
      ['Manual Book — Digital Analytic Enhancement Processing', 'TAB-MB-2026-DAEP-01', 'Sub-modul 1.2a s.d. 1.2d'],
      ['Manual Book — Information and Reporting', 'TAB-MB-2026-IRGIS-01', 'Sub-modul 1.3a s.d. 1.3f'],
    ], [46, 26, 28]),
  ];

  return buildDocument({
    fileName: '1. Ringkasan Sistem dan Tampilan Antarmuka.docx',
    docTitle, docNo, cover, body, outDir: OUT_DIR,
  });
}

module.exports = { buildOverview, OUT_DIR };

/* Bagian manual book berada pada berkas terpisah agar mudah dirawat. */
const manuals = require('./manuals');

if (require.main === module) {
  (async () => {
    console.log('Menyusun dokumen keluaran...\n');
    await buildOverview();
    await manuals.buildCrowdCounting(OUT_DIR);
    await manuals.buildAodgis(OUT_DIR);
    await manuals.buildDaep(OUT_DIR);
    await manuals.buildIrgis(OUT_DIR);
    console.log(`\nSelesai. Berkas tersimpan di: ${OUT_DIR}`);
  })().catch((e) => { console.error('GAGAL:', e); process.exit(1); });
}
