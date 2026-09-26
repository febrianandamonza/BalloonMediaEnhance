/* =====================================================================
   Blok konten bersama yang muncul pada seluruh manual book:
   kontrol dokumen, prasyarat, alur masuk aplikasi, dan aktivasi lisensi.
   ===================================================================== */
const {
  H1, H1c, H2, H3, Body, rich, Steps, Bullets, Mono, Note,
  DataTable, Figure, TOC,
} = require('./lib');

const TANGGAL = '27 Juli 2026';
const VERSI = '2.0';
const LICENSOR = 'TAB Integrated Systems Pte Ltd';
const LICENSEE = 'Badan Intelijen Negara';
const EXPIRY = '31 Desember 2027';

/* ---------- Kontrol dokumen ---------- */
function documentControl({ docNo, docTitle, licenseKind, licenseName, serials }) {
  return [
    H1c('Informasi Dokumen'),

    H2('1.1  Identitas Dokumen'),
    DataTable(['Atribut', 'Keterangan'], [
      ['Judul Dokumen', docTitle],
      ['Nomor Dokumen', docNo],
      ['Versi', VERSI],
      ['Tanggal Terbit', TANGGAL],
      ['Klasifikasi', 'TERBATAS'],
      ['Jenis Sertifikat', licenseKind],
      ['Nama Lisensi', licenseName],
      ['License Number', serials.join('  /  ')],
      ['Masa Berlaku', `20 Juli 2026 s.d. ${EXPIRY}`],
      ['Pemberi Lisensi', LICENSOR],
      ['Penerima Lisensi', LICENSEE],
      ['Bahasa', 'Bahasa Indonesia'],
    ], [30, 70]),

    H2('1.2  Riwayat Revisi'),
    DataTable(['Versi', 'Tanggal', 'Uraian Perubahan', 'Penyusun'], [
      ['1.0', '20 Juli 2026', 'Terbitan awal menyertai serah terima lisensi.', LICENSOR],
      ['2.0', TANGGAL, 'Penyesuaian dengan antarmuka GCS v2.0 (mode offline penuh), penambahan prosedur aktivasi lisensi berbasis License Number, dan pembaruan seluruh tangkapan layar.', LICENSOR],
    ], [10, 18, 54, 18]),

    H2('1.3  Pengesahan'),
    DataTable(['Peran', 'Nama / Jabatan', 'Tanggal'], [
      ['Disusun oleh', 'Technical Documentation — ' + LICENSOR, TANGGAL],
      ['Diperiksa oleh', 'Quality Assurance — ' + LICENSOR, TANGGAL],
      ['Disetujui oleh', 'Bram Alexander — Director, ' + LICENSOR, TANGGAL],
      ['Diterima oleh', 'Pejabat Penerima Hasil Pekerjaan — ' + LICENSEE, '____________'],
    ], [22, 56, 22]),

    H2('1.4  Ketentuan Penggunaan Dokumen'),
    Body(
      'Dokumen ini merupakan bagian tidak terpisahkan dari sertifikat lisensi yang diterbitkan ' +
      `${LICENSOR} kepada ${LICENSEE}. Lisensi bersifat non-transferable dan tunduk pada syarat ` +
      'serta ketentuan yang disepakati kedua belah pihak. Penggandaan, penerjemahan, maupun ' +
      'penyebarluasan dokumen kepada pihak di luar penerima lisensi memerlukan persetujuan ' +
      'tertulis dari pemberi lisensi.'
    ),
    Note('Perhatian:', 'Perangkat lunak dioperasikan sepenuhnya secara luring (offline). Tidak ada data operasional yang dikirim keluar jaringan lokal stasiun.'),

    H2('1.5  Daftar Istilah dan Singkatan'),
    DataTable(['Istilah', 'Penjelasan'], [
      ['GCS', 'Ground Control Station — stasiun kendali darat tempat perangkat lunak ini dijalankan.'],
      ['GeoInt', 'Geospatial Intelligence — intelijen berbasis informasi keruangan.'],
      ['Aerostat', 'Balon udara tertambat yang membawa muatan sensor pada ketinggian tetap.'],
      ['Tether Cable', 'Kabel penambat yang menahan balon sekaligus menyalurkan daya dan data.'],
      ['Gimbal', 'Dudukan kamera berstabilisasi yang dapat digerakkan Pan/Tilt/Zoom.'],
      ['EO', 'Electro-Optical — sensor kamera cahaya tampak untuk operasi siang hari.'],
      ['IR', 'Infrared — sensor termal untuk operasi malam hari atau kondisi berkabut.'],
      ['LRF', 'Laser Range Finder — pengukur jarak target berbasis laser.'],
      ['FOV', 'Field of View — luas sudut pandang kamera pada tingkat zoom tertentu.'],
      ['MTI', 'Moving Target Indicator — penandaan otomatis objek yang bergerak.'],
      ['ROI', 'Region of Interest — area terbatas tempat analitik dijalankan.'],
      ['EOP', 'Electro-Optical Path — jalur serat optik di dalam kabel penambat.'],
      ['RTSP', 'Real Time Streaming Protocol — protokol penyaluran video langsung.'],
      ['CUDA', 'Antarmuka komputasi paralel NVIDIA yang mempercepat inferensi model AI.'],
      ['S/N', 'Serial Number — nomor seri lisensi yang tercetak pada sertifikat.'],
      ['RBAC', 'Role Based Access Control — pengaturan hak akses berdasarkan peran pengguna.'],
    ], [16, 84]),
  ];
}

/* ---------- Prasyarat sistem ---------- */
function prerequisites() {
  return [
    H1('Prasyarat Sistem'),
    Body(
      'Perangkat lunak dijalankan secara mandiri pada workstation taktis di lapangan. Seluruh ' +
      'pemrosesan citra, video, dan inferensi kecerdasan buatan berlangsung di perangkat lokal ' +
      'tanpa ketergantungan pada layanan awan. Spesifikasi berikut merupakan konfigurasi minimum ' +
      'agar target performa pada Bab Batas Operasi dapat dipenuhi.'
    ),

    H2('Perangkat Keras'),
    DataTable(['Komponen', 'Spesifikasi Minimum', 'Catatan'], [
      ['Prosesor', 'Intel Core i9-13900HX atau AMD Ryzen 9 7945HX', 'Minimum 16 inti / 24 utas.'],
      ['Kartu Grafis', 'NVIDIA GeForce RTX 4080 Laptop GPU', 'VRAM ≥ 12 GB, mendukung CUDA dan Tensor Core.'],
      ['Memori', '32 GB DDR5 dual channel', '64 GB disarankan bila dua modul analitik berjalan bersamaan.'],
      ['Penyimpanan', '2 TB NVMe PCIe Gen4', 'Kecepatan baca ≥ 5.000 MB/s untuk rekaman video mentah.'],
      ['Jaringan', '1× RJ-45 Gigabit Ethernet', 'Terhubung ke radio data link / IP camera balon.'],
      ['Serial', '1× RS-232 atau konverter USB-to-RS232', 'Jalur kendali gimbal cadangan.'],
      ['Layar', '15,6" Full HD, kecerahan ≥ 300 nit', 'Tema terang tersedia untuk penggunaan di bawah sinar matahari.'],
    ], [18, 40, 42]),

    H2('Perangkat Lunak'),
    DataTable(['Komponen', 'Versi'], [
      ['Sistem Operasi', 'Windows 11 Pro 64-bit, atau Ubuntu 22.04 LTS'],
      ['Docker Desktop', '4.30 atau lebih baru (dengan backend WSL2 pada Windows)'],
      ['Driver NVIDIA', '550.xx atau lebih baru, dengan CUDA Toolkit 12.x'],
      ['Peramban', 'Chromium 120+, Microsoft Edge 120+, atau Firefox 121+'],
      ['Resolusi Tampilan', 'Minimum 1600 × 900; disarankan 1920 × 1080'],
    ], [30, 70]),

    H2('Jaringan Lokal'),
    Body(
      'Stasiun dioperasikan pada segmen jaringan terisolasi. Konfigurasi bawaan menggunakan ' +
      'alamat berikut dan dapat disesuaikan melalui menu System Settings.'
    ),
    DataTable(['Perangkat', 'Alamat', 'Protokol'], [
      ['Workstation GCS', '192.168.10.10 / 24', '—'],
      ['Gimbal Epsilon 140Z G2', '192.168.10.100 : 15004', 'UDP kendali, RTSP video'],
      ['Ground Winch Controller', '192.168.10.60 : 502', 'Modbus TCP'],
      ['Gateway', '192.168.10.1', '—'],
    ], [34, 34, 32]),
    Note('Kebijakan isolasi:', 'Trafik keluar ke internet diblokir pada tingkat reverse proxy. Seluruh rekaman disimpan terenkripsi AES-256 pada volume lokal.'),
  ];
}

/* ---------- Masuk aplikasi ---------- */
function gettingStarted({ withActivation = true } = {}) {
  const out = [
    H1('Memulai Pengoperasian'),

    H2('Membuka Aplikasi dan Masuk Sesi'),
    Body(
      'Ruang kendali diakses melalui peramban pada alamat lokal stasiun. Halaman masuk ' +
      'menampilkan visualisasi tiga dimensi posisi balon tertambat terhadap bola bumi, sekaligus ' +
      'sebagai penanda bahwa layanan telemetri lokal telah aktif.'
    ),
    ...Figure('00-login.png', 'Halaman masuk Ground Control Station dengan visualisasi balon tertambat.'),

    Body('Langkah masuk sesi:'),
    ...Steps([
      'Buka peramban, lalu akses http://localhost:3000 (atau alamat stasiun yang telah dikonfigurasi).',
      'Masukkan username operator pada kolom pertama. Dua akun stasiun terdaftar: gcs1 untuk Ground Control Station 1 dan gcs2 untuk Ground Control Station 2.',
      'Masukkan password. Tombol mata di sisi kanan kolom dapat digunakan untuk menampilkan karakter yang diketik. Sistem memberi peringatan bila Caps Lock sedang aktif.',
      'Pilih salah satu kartu Akun Stasiun Terdaftar bila ingin mengisi kolom secara otomatis.',
      'Tekan tombol Masuk ke Ruang Kendali.',
    ]),
    ...Figure('01-login-filled.png', 'Kolom kredensial terisi untuk stasiun GCS-01.'),

    Body(
      'Setelah kredensial dikirim, sistem menjalankan empat tahap verifikasi berurutan: pemeriksaan ' +
      'kredensial operator, pembacaan hardware fingerprint stasiun, validasi sertifikat lisensi, dan ' +
      'pemuatan modul yang terlisensi. Tahap yang telah selesai ditandai dengan centang.'
    ),
    ...Figure('02-authenticating.png', 'Tahapan verifikasi kredensial dan sertifikat lisensi.'),
    ...Figure('03-access-granted.png', 'Konfirmasi akses diberikan beserta ringkasan status stasiun.'),

    H2('Struktur Antarmuka'),
    Body(
      'Ruang kendali terbagi menjadi tiga area utama. Panel navigasi di sisi kiri mengelompokkan ' +
      'seluruh menu menurut lisensi yang menaunginya; bilah atas menampilkan konteks halaman, jam ' +
      'misi, stasiun aktif, status tautan data, dan pengaturan tampilan; area kerja di tengah memuat ' +
      'konten halaman yang sedang dibuka.'
    ),
    ...Figure('10-dashboard.png', 'Mission Dashboard — ringkasan status sistem, lisensi, dan telemetri platform.'),

    H3('Panel Navigasi'),
    Body(
      'Setiap kelompok menu diberi penanda status lisensi. Penanda ACTIVE berwarna hijau berarti ' +
      'sertifikat penaung telah diaktivasi dan seluruh menu di dalamnya dapat dibuka. Penanda LOCKED ' +
      'berwarna merah berarti sertifikat belum diaktivasi; menu tetap terlihat agar operator ' +
      'mengetahui kapabilitas yang tersedia, namun isinya terkunci.'
    ),
    ...Bullets([
      'Kolom pencarian di bagian atas panel menyaring menu berdasarkan nama maupun kode sub-lisensi (misalnya mengetik “1.3b” langsung menyorot GeoInt Visualisation).',
      'Setiap butir menu menampilkan kode sub-lisensi pada sisi kanan sebagai rujukan silang ke sertifikat.',
      'Tombol Ciutkan di bagian bawah memperkecil panel menjadi deretan ikon; nama menu muncul sebagai keterangan mengambang saat kursor diarahkan.',
      'Kartu operator di bagian bawah menampilkan stasiun dan peran yang sedang aktif, beserta tombol keluar sesi.',
    ]),
    ...Figure('35-sidebar-collapsed.png', 'Panel navigasi dalam mode ciut untuk memperluas area kerja.'),

    H3('Tema Tampilan'),
    Body(
      'Dua tema disediakan dan dapat dipertukarkan melalui ikon bulan/matahari pada bilah atas. ' +
      'Tema Tactical Dark dirancang untuk ruang kendali redup dan operasi malam; tema Daylight ' +
      'High-Contrast menaikkan kontras agar layar tetap terbaca di bawah sinar matahari langsung. ' +
      'Pilihan tema tersimpan per perangkat.'
    ),
    ...Figure('36-light-theme.png', 'Mission Dashboard pada tema Daylight High-Contrast.'),
  ];

  if (withActivation) out.push(...licenseActivation());
  return out;
}

/* ---------- Aktivasi lisensi ---------- */
function licenseActivation() {
  return [
    H1('Aktivasi Lisensi'),
    Body(
      'Seluruh kapabilitas perangkat lunak dibuka melalui empat sertifikat yang diterbitkan ' +
      `${LICENSOR}: satu Commercial Software License untuk Crowd Counting dan tiga Module License. ` +
      'Setiap sertifikat diterbitkan dalam dua unit nomor seri — satu untuk masing-masing stasiun ' +
      'GCS — dan keduanya sah digunakan pada kedua stasiun milik penerima lisensi.'
    ),

    H2('Struktur Lisensi'),
    DataTable(['Jenis Sertifikat', 'Nama Lisensi', 'License Number', 'Sub-modul'], [
      ['Commercial Software License', 'Crowd Counting', 'TAB-CC-2026-001-A8F4K2\nTAB-CC-2026-002-B7M9X5', '1'],
      ['Module License', 'Analytic and Object Detection Tethered Balloon Geospatial Intelligence System', 'TAB-AODGIS-2026-003-C3L8P6\nTAB-AODGIS-2026-004-D5Q7W1', '2'],
      ['Module License', 'Digital Analytic Enhancement Processing System Module', 'TAB-DAEP-2026-005-E9R4T8\nTAB-DAEP-2026-006-F2N6Y7', '4'],
      ['Module License', 'Information and Reporting Tethered Balloon Geospatial Intelligence System Module', 'TAB-IRGIS-2026-007-G5V8K3\nTAB-IRGIS-2026-008-H7M2Z9', '6'],
    ], [20, 38, 32, 10]),

    H2('Halaman License Manager'),
    Body(
      'Menu License Manager berada pada kelompok Administration. Halaman menampilkan empat kartu ' +
      'lisensi yang menyalin bahasa visual sertifikat cetak, lengkap dengan License Number (S/N), ' +
      'tanggal berakhir, nama penerima lisensi, serta daftar sub-modul yang dibuka oleh sertifikat ' +
      'tersebut. Baris ringkasan di bagian atas merangkum jumlah lisensi aktif, jumlah sub-modul ' +
      'yang terbuka, dan sisa masa berlaku terdekat.'
    ),
    ...Figure('25-licenses.png', 'License Manager — empat sertifikat dengan nomor seri dan masa berlaku.'),

    H2('Prosedur Aktivasi'),
    Body(
      'Aktivasi dilakukan oleh operator dengan peran Administrator. Setiap tindakan aktivasi maupun ' +
      'penonaktifan tercatat pada Audit Trail.'
    ),
    ...Steps([
      'Buka menu Administration → License Manager.',
      'Temukan kartu lisensi yang berstatus LOCKED. Kartu menampilkan jumlah sub-modul yang masih terkunci.',
      'Tekan tombol Aktivasi License Key pada kartu tersebut.',
      'Salin License Number yang tercetak pada sertifikat ke kolom yang tersedia. Penulisan tidak membedakan huruf besar/kecil dan spasi berlebih diabaikan.',
      'Tekan Aktivasi Lisensi. Sistem memverifikasi kunci terhadap hardware fingerprint stasiun.',
      'Bila kunci sah, status kartu berubah menjadi ACTIVE, seluruh sub-modul terbuka, dan notifikasi konfirmasi muncul di sudut kanan bawah.',
    ]),
    ...Figure('30-license-locked.png', 'Kartu lisensi berstatus LOCKED dengan sub-modul yang belum terbuka.'),
    ...Figure('31-activation-modal.png', 'Formulir aktivasi menampilkan daftar sub-modul yang akan terbuka.'),

    H2('Penanganan Kunci Tidak Sah'),
    Body(
      'Sistem menolak kunci yang tidak memenuhi ketentuan dan menampilkan alasan penolakan secara ' +
      'spesifik agar operator dapat memperbaikinya tanpa menebak.'
    ),
    DataTable(['Kondisi', 'Pesan yang Ditampilkan'], [
      ['Kolom kosong', 'License key belum diisi.'],
      ['Format tidak sesuai pola TAB-XXXX-YYYY-NNN-XXXXXX', 'Format license key tidak valid, disertai contoh penulisan yang benar.'],
      ['Nomor seri tidak terdaftar', 'License key tidak dikenali; operator diarahkan memeriksa kembali sertifikat.'],
      ['Nomor seri sah namun milik lisensi lain', 'License key valid, namun diterbitkan untuk lisensi lain.'],
      ['Lisensi sudah aktif', 'Lisensi ini sudah dalam status ACTIVE.'],
      ['Melewati tanggal berakhir', 'Masa berlaku lisensi telah berakhir; operator diarahkan menghubungi pemberi lisensi.'],
    ], [40, 60]),
    ...Figure('32-activation-error.png', 'Penolakan kunci yang diterbitkan untuk lisensi lain.'),
    ...Figure('34-activation-success.png', 'Lisensi kembali berstatus ACTIVE setelah kunci yang benar dimasukkan.'),

    Note('Catatan:', 'Menonaktifkan sebuah lisensi mengunci seluruh sub-modul di bawahnya. Untuk mengaktifkan kembali, License Number pada sertifikat harus dimasukkan ulang.'),
  ];
}

/* ---------- Pemecahan masalah umum ---------- */
function troubleshootingCommon(extraRows = []) {
  return [
    H1('Pemecahan Masalah'),
    Body(
      'Tabel berikut memuat gangguan yang paling sering ditemui beserta langkah penanganan yang ' +
      'dapat dilakukan operator di lapangan sebelum meneruskan persoalan kepada tim dukungan teknis.'
    ),
    DataTable(['Gejala', 'Kemungkinan Penyebab', 'Tindakan'], [
      ['Kredensial ditolak meskipun benar', 'Caps Lock aktif, atau akun dinonaktifkan administrator.', 'Periksa peringatan Caps Lock pada halaman masuk. Hubungi Administrator untuk memeriksa status akun pada menu User Management.'],
      ['Menu tampak redup dan tidak dapat dibuka', 'Sertifikat penaung belum diaktivasi.', 'Buka License Manager, aktifkan lisensi terkait menggunakan License Number pada sertifikat.'],
      ['Halaman terbuka namun tidak menampilkan data', 'Tautan data ke balon terputus.', 'Periksa indikator tautan data pada bilah atas. Verifikasi kabel penambat melalui menu Tether Cable Monitor.'],
      ['Video tidak tampil', 'Alamat RTSP salah atau gimbal belum tersambung.', 'Periksa alamat pada System Settings → Gimbal & Sensor, lalu uji sambungan ulang.'],
      ['Pemrosesan terasa lambat', 'GPU dipakai bersamaan oleh beberapa modul analitik.', 'Hentikan sesi analitik yang tidak diperlukan, atau turunkan resolusi inferensi pada System Settings → AI Inference.'],
      ['Notifikasi tidak muncul', 'Kanal notifikasi dinonaktifkan.', 'Buka Smart Notification → Kanal Notifikasi dan aktifkan kembali kanal yang diperlukan.'],
      ...extraRows,
    ], [24, 30, 46]),

    H2('Dukungan Teknis'),
    Body(
      `Permintaan dukungan disampaikan kepada ${LICENSOR} dengan menyertakan nomor dokumen manual, ` +
      'License Number stasiun yang bersangkutan, tangkapan layar gangguan, dan berkas ekspor Audit ' +
      'Trail pada rentang waktu kejadian. Berkas Audit Trail dapat diunduh melalui menu Administration ' +
      '→ Audit Trail → Ekspor CSV.'
    ),
  ];
}

/* ---------- Lampiran peran pengguna ---------- */
function appendixRoles() {
  return [
    H1('Lampiran A — Peran dan Hak Akses'),
    Body(
      'Perangkat lunak menerapkan kontrol akses berbasis peran. Peran menentukan kapabilitas yang ' +
      'dapat dijalankan operator, terlepas dari lisensi yang aktif. Tanda centang pada matriks ' +
      'antarmuka menyatakan kapabilitas diizinkan.'
    ),
    DataTable(['Peran', 'Cakupan Kewenangan'], [
      ['Administrator', 'Akses penuh — konfigurasi sistem, manajemen lisensi, dan manajemen pengguna.'],
      ['Commander', 'Pengawasan operasional misi, persetujuan laporan, dan konfigurasi aturan peringatan.'],
      ['Supervisor', 'Supervisi analitik, pembuatan laporan, dan manajemen lokasi pengawasan.'],
      ['Operator', 'Pengendalian gimbal, pelaksanaan analitik video, dan operasi misi harian.'],
      ['Technician', 'Pemeliharaan perangkat, pemantauan mooring, dan diagnostik kabel penambat.'],
    ], [22, 78]),
    ...Figure('26-users.png', 'User Management — daftar operator dan matriks izin berbasis peran.'),
  ];
}

/* ---------- Lampiran jejak audit ---------- */
function appendixAudit() {
  return [
    H1('Lampiran B — Jejak Audit'),
    Body(
      'Seluruh tindakan yang memengaruhi konfigurasi, lisensi, atau operasi misi dicatat pada Audit ' +
      'Trail. Catatan bersifat append-only: entri tidak dapat diubah maupun dihapus dari antarmuka ' +
      'operator. Retensi bawaan adalah 1.095 hari dan dapat disesuaikan pada System Settings → Data ' +
      'dan Retensi.'
    ),
    DataTable(['Kategori', 'Contoh Aksi yang Dicatat'], [
      ['Autentikasi', 'auth:login, auth:login_failed, auth:logout'],
      ['Lisensi', 'license:verify, license:activate, license:deactivate'],
      ['Kendali', 'gimbal:connect, gimbal:pan_tilt, lrf:range, flight:landing'],
      ['Analitik', 'crowd:session_start, detection:video_start, enhance:apply'],
      ['Pelaporan', 'report:generate'],
      ['Sistem', 'alert:trigger, alert:acknowledge, tether:diagnostic'],
    ], [22, 78]),
    ...Figure('27-audit-log.png', 'Audit Trail dengan penyaringan berdasarkan kategori aktivitas.'),
  ];
}

module.exports = {
  TANGGAL, VERSI, LICENSOR, LICENSEE, EXPIRY,
  documentControl, prerequisites, gettingStarted, licenseActivation,
  troubleshootingCommon, appendixRoles, appendixAudit,
};
