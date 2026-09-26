/* =====================================================================
   Empat manual book — satu untuk setiap sertifikat lisensi.
   Struktur bab dibuat seragam agar operator yang telah membaca satu
   manual dapat langsung mengenali susunan manual lainnya.
   ===================================================================== */
const {
  H1, H1c, H2, H3, Body, rich, Steps, Bullets, Mono, Note,
  DataTable, Figure, Cover, TOC, buildDocument,
} = require('./lib');
const K = require('./common');

/* Kerangka umum: sampul + bab pembuka yang identik pada seluruh manual. */
function frontMatter({ docNo, docTitle, licenseKind, licenseName, serials, purpose, scopeRows }) {
  return {
    cover: Cover({
      kind: licenseKind.toUpperCase(),
      title: 'Manual Book',
      subtitle: licenseName,
      licenseNumbers: serials,
      expiry: K.EXPIRY,
      docNo, version: K.VERSI, date: K.TANGGAL,
    }),
    opening: [
      ...TOC(),
      ...K.documentControl({ docNo, docTitle, licenseKind, licenseName, serials }),

      H1('Pendahuluan'),

      H2('2.1  Latar Belakang'),
      Body(
        'Tethered Balloon Geospatial Intelligence System merupakan sistem pengawasan taktis berbasis ' +
        'balon udara tertambat yang dioperasikan untuk kebutuhan intelijen geografis, pemantauan ' +
        'perbatasan, penanggulangan bencana, dan pengawasan kerumunan. Perangkat lunak Ground Control ' +
        'Station bertindak sebagai pusat kendali operator di lapangan dan terhubung langsung dengan ' +
        'muatan gimbal sensor ganda Epsilon 140Z G2 serta instrumen pada stasiun penambat darat.'
      ),

      H2('2.2  Tujuan Manual'),
      Body(purpose),

      H2('2.3  Ruang Lingkup'),
      Body(
        'Manual ini membahas sub-modul yang dibuka oleh sertifikat lisensi berikut. Sub-modul di luar ' +
        'daftar ini dibahas pada manual book yang menyertai sertifikatnya masing-masing.'
      ),
      DataTable(['Kode', 'Nama Sub-modul', 'Menu pada Aplikasi'], scopeRows, [12, 48, 40]),

      H2('2.4  Pembaca yang Dituju'),
      ...Bullets([
        'Operator stasiun GCS yang menjalankan misi pengawasan harian.',
        'Supervisor dan Commander yang mengawasi mutu keluaran analitik serta menyetujui laporan.',
        'Teknisi pemeliharaan yang melakukan diagnostik perangkat dan kabel penambat.',
        'Administrator sistem yang mengelola lisensi, akun operator, dan konfigurasi stasiun.',
      ]),

      H2('2.5  Cara Membaca Manual'),
      ...Bullets([
        'Bab 3 memuat prasyarat perangkat keras, perangkat lunak, dan jaringan yang harus dipenuhi sebelum instalasi.',
        'Bab 4 menguraikan alur masuk aplikasi dan pengenalan antarmuka.',
        'Bab 5 menjelaskan prosedur aktivasi lisensi beserta penanganan kunci yang ditolak.',
        'Bab 6 dan seterusnya memuat prosedur operasi untuk setiap sub-modul dalam ruang lingkup manual ini.',
        'Bab penutup memuat batas operasi, pemecahan masalah, dan lampiran rujukan.',
      ]),
      Note('Konvensi penulisan:', 'Nama menu dan tombol ditulis persis seperti yang tampil pada antarmuka. Nilai numerik menggunakan format Indonesia — koma sebagai pemisah desimal dan titik sebagai pemisah ribuan.'),

      ...K.prerequisites(),
      ...K.gettingStarted({ withActivation: true }),
    ],
  };
}

/* =====================================================================
   MANUAL 1 — CROWD COUNTING
   ===================================================================== */
async function buildCrowdCounting(outDir) {
  const docNo = 'TAB-MB-2026-CC-01';
  const docTitle = 'Manual Book — Crowd Counting';

  const { cover, opening } = frontMatter({
    docNo, docTitle,
    licenseKind: 'Commercial Software License',
    licenseName: 'Crowd Counting',
    serials: ['TAB-CC-2026-001-A8F4K2', 'TAB-CC-2026-002-B7M9X5'],
    purpose:
      'Manual ini menguraikan prosedur pengoperasian modul Crowd Counting, yaitu estimasi kepadatan ' +
      'massa pada area pengawasan menggunakan model pembelajaran mendalam CSRNet yang dijalankan ' +
      'secara lokal dengan akselerasi CUDA. Manual mencakup persiapan sumber video, konfigurasi model, ' +
      'penetapan ambang peringatan, pembacaan hasil, serta penanganan kondisi yang memengaruhi akurasi.',
    scopeRows: [
      ['CC-01', 'Crowd Density Estimation', 'Crowd Counting → Crowd Counting'],
    ],
  });

  const body = [
    ...opening,

    H1('Konsep Pengukuran Kepadatan'),
    Body(
      'Modul tidak menghitung kepala satu per satu sebagaimana pendekatan deteksi objek. Model CSRNet ' +
      'menghasilkan peta kepadatan (density map) — representasi dua dimensi yang menyatakan konsentrasi ' +
      'orang pada setiap wilayah citra. Estimasi jumlah diperoleh dengan menjumlahkan seluruh nilai ' +
      'pada peta tersebut. Pendekatan ini tetap andal pada kerumunan padat tempat individu saling ' +
      'menutupi, kondisi yang menyulitkan metode deteksi objek konvensional.'
    ),
    Body(
      'Overlay gradasi warna ditampilkan di atas video feed: wilayah bergradasi kuning menandakan ' +
      'kepadatan sedang, dan gradasi merah menandakan kepadatan tinggi. Gradasi ini membantu operator ' +
      'mengenali titik penumpukan massa sebelum jumlah total melewati ambang peringatan.'
    ),

    H2('Faktor yang Memengaruhi Akurasi'),
    DataTable(['Faktor', 'Pengaruh', 'Tindakan Mitigasi'], [
      ['Pencahayaan', 'Akurasi menurun pada kondisi remang atau kontras rendah.', 'Aktifkan modul Digital Imaging Enhancement bila tersedia, atau alihkan ke sensor termal.'],
      ['Sudut Tilt', 'Sudut terlalu datar menyebabkan individu saling menutupi berlebihan.', 'Pertahankan sudut tilt antara −25° dan −45° terhadap area pengamatan.'],
      ['Tingkat Zoom', 'Zoom berlebihan mempersempit cakupan dan memotong kerumunan.', 'Gunakan tingkat zoom yang mencakup seluruh poligon zona pengawasan.'],
      ['Ketinggian Balon', 'Ketinggian rendah memperkecil luas terpantau.', 'Operasikan pada 400–500 m AGL untuk cakupan optimal.'],
      ['Cuaca', 'Kabut dan hujan menurunkan kontras citra.', 'Periksa jarak pandang melalui modul Flight Simulation sebelum memulai sesi.'],
    ], [18, 40, 42]),

    H1('Prosedur Pengoperasian'),

    H2('Persiapan Sebelum Sesi'),
    ...Steps([
      'Pastikan kartu lisensi Crowd Counting pada License Manager berstatus ACTIVE.',
      'Verifikasi tautan data ke balon melalui indikator pada bilah atas; indikator berwarna hijau menandakan tautan aktif.',
      'Pastikan balon telah berada pada ketinggian operasi dan gimbal mengarah ke zona yang akan diawasi.',
      'Buka menu Crowd Counting → Crowd Counting.',
    ]),
    ...Figure('12-crowd.png', 'Halaman Crowd Counting sebelum sesi analisis dijalankan.'),

    H2('Mengatur Sumber Video'),
    Body('Panel Sumber Video berada pada kolom kanan halaman.'),
    ...Steps([
      'Pilih Jenis Sumber. Gunakan RTSP Stream (Epsilon) untuk pengawasan langsung, Berkas Video Lokal untuk analisis ulang rekaman, atau Kamera USB untuk perangkat uji.',
      'Isi kolom Alamat. Nilai bawaan untuk gimbal adalah rtsp://192.168.10.100:15004/stream1.',
      'Tetapkan Resolusi Inferensi. Resolusi 1920 × 1080 memberikan akurasi tertinggi; turunkan ke 1280 × 720 bila waktu inferensi melewati 35 ms per frame.',
    ]),

    H2('Mengatur Model dan Ambang Peringatan'),
    ...Steps([
      'Pada panel Konfigurasi Model, pilih Arsitektur. CSRNet merupakan pilihan bawaan dan direkomendasikan untuk kerumunan padat. DM-Count memberikan hasil lebih baik pada kerumunan renggang, sedangkan MCNN disediakan sebagai pembanding.',
      'Pilih Perangkat komputasi. CUDA:0 menggunakan akselerasi GPU; opsi CPU hanya digunakan bila GPU tidak tersedia dan akan menurunkan kecepatan pemrosesan secara signifikan.',
      'Isi Ambang Peringatan Kepadatan sesuai daya tampung aman area yang diawasi. Nilai bawaan 500 jiwa.',
      'Tetapkan Interval Sampling. Nilai bawaan setiap 25 frame setara dengan satu pembacaan per detik.',
    ]),
    Note('Ambang peringatan:', 'Ketika estimasi melewati nilai ambang, angka pada panggung video berubah menjadi merah dan sistem menerbitkan peringatan ke modul Smart Notification bila lisensi Information and Reporting aktif.'),

    H2('Menjalankan dan Menghentikan Sesi'),
    ...Steps([
      'Tekan tombol Mulai Analisis pada sudut kanan atas halaman. Model dimuat ke memori GPU dan indikator status pada panggung video berubah menjadi PROCESSING.',
      'Amati angka estimasi yang diperbarui setiap interval sampling, serta grafik Tren Kepadatan yang merekam empat puluh pembacaan terakhir.',
      'Gunakan tombol Jeda untuk menghentikan sementara pemrosesan tanpa mengosongkan statistik sesi, lalu Lanjutkan untuk melanjutkan.',
      'Tekan Hentikan untuk mengakhiri sesi. Sistem menampilkan ringkasan jumlah frame yang diproses dan nilai puncak yang tercatat.',
    ]),

    H2('Membaca Statistik Sesi'),
    DataTable(['Indikator', 'Makna', 'Rentang Wajar'], [
      ['Saat Ini', 'Estimasi jumlah kepala pada pembacaan terakhir.', 'Bergantung area pengawasan.'],
      ['Rata-rata', 'Nilai rata-rata seluruh pembacaan sepanjang sesi.', 'Bergantung area pengawasan.'],
      ['Puncak', 'Nilai tertinggi yang tercatat sepanjang sesi.', 'Menjadi acuan pelaporan.'],
      ['Frame Diproses', 'Akumulasi frame yang telah melalui inferensi.', 'Meningkat ±25 per detik.'],
      ['Utilisasi GPU', 'Persentase pemakaian kartu grafis.', '60–85% pada operasi normal.'],
      ['Waktu Inferensi', 'Durasi pemrosesan satu frame.', '≤ 35 ms sesuai target performa.'],
    ], [20, 48, 32]),

    H2('Zona Pengawasan'),
    Body(
      'Panel Zona Pengawasan menampilkan poligon area yang sedang dipantau beserta luas terpantau, ' +
      'ketinggian balon, sudut tilt, dan skala piksel. Skala piksel menyatakan jarak sebenarnya yang ' +
      'diwakili satu piksel citra dan digunakan sistem untuk mengoreksi perspektif saat menyusun peta ' +
      'kepadatan. Tombol Ubah Poligon Zona membuka penyunting area pada modul GeoInt Visualisation ' +
      'apabila lisensi Information and Reporting aktif.'
    ),

    H1('Batas Operasi dan Target Performa'),
    DataTable(['Parameter', 'Nilai', 'Keterangan'], [
      ['Waktu inferensi', '≤ 35 ms per frame', 'Pada GPU RTX 4080 Laptop atau lebih tinggi.'],
      ['Kesalahan rata-rata (MAE)', '< 8%', 'Pada kondisi pencahayaan cukup dan sudut tilt sesuai anjuran.'],
      ['Frame rate pemrosesan', '≥ 25 FPS', 'Resolusi masukan 1920 × 1080.'],
      ['Latensi tayang', '< 150 ms', 'Dari kamera hingga tampil pada layar operator.'],
      ['Ketinggian operasi', '400–500 m AGL', 'Rentang cakupan optimal.'],
      ['Sudut tilt', '−25° s.d. −45°', 'Meminimalkan saling tutup antarindividu.'],
      ['Kepadatan maksimum', '≈ 8 orang per m²', 'Di atas nilai ini akurasi menurun tajam.'],
    ], [30, 26, 44]),

    ...K.troubleshootingCommon([
      ['Angka estimasi berfluktuasi tajam antarpembacaan', 'Interval sampling terlalu rapat atau pencahayaan tidak stabil.', 'Perlebar interval sampling menjadi 50 frame, atau aktifkan peningkatan kualitas citra pada modul 1.2a.'],
      ['Waktu inferensi melebihi 35 ms', 'Resolusi terlalu tinggi atau GPU dipakai modul lain.', 'Turunkan resolusi inferensi, atau hentikan sesi Video Analytic yang berjalan bersamaan.'],
      ['Estimasi jauh lebih rendah dari pengamatan visual', 'Sudut tilt terlalu datar sehingga individu saling menutupi.', 'Naikkan sudut tilt mendekati −40°, atau naikkan ketinggian balon.'],
    ]),

    ...K.appendixRoles(),
    ...K.appendixAudit(),

    H1('Lampiran C — Rujukan Teknis'),
    DataTable(['Dokumen', 'Bagian Terkait'], [
      ['Epsilon 140 / 140Z / 140Z G2 / 140LC User Manual v2.0', 'Kendali gimbal, pemilihan sensor EO/IR, dan pengaturan video.'],
      ['Epsilon GEO-location v1.4', 'Perhitungan koordinat target dan koreksi perspektif.'],
      ['UserManual Crowd Counting', 'Landasan metode estimasi kepadatan berbasis peta kepadatan.'],
      ['Product Requirement Document — SkyStar GeoInt GCS v2.0', 'Spesifikasi fungsional dan target performa modul.'],
    ], [52, 48]),
  ];

  return buildDocument({
    fileName: '2. Manual Book - Crowd Counting.docx',
    docTitle, docNo, cover, body, outDir,
  });
}

/* =====================================================================
   MANUAL 2 — ANALYTIC AND OBJECT DETECTION
   ===================================================================== */
async function buildAodgis(outDir) {
  const docNo = 'TAB-MB-2026-AODGIS-01';
  const docTitle = 'Manual Book — Analytic and Object Detection';

  const { cover, opening } = frontMatter({
    docNo, docTitle,
    licenseKind: 'Module License',
    licenseName: 'Analytic and Object Detection\nTethered Balloon Geospatial Intelligence System',
    serials: ['TAB-AODGIS-2026-003-C3L8P6', 'TAB-AODGIS-2026-004-D5Q7W1'],
    purpose:
      'Manual ini menguraikan prosedur pengoperasian dua sub-modul deteksi objek: analisis citra statis ' +
      'dan analisis video real-time. Keduanya menggunakan model YOLOv8x yang dijalankan sepenuhnya ' +
      'secara lokal. Manual mencakup pemuatan sumber, pengaturan ambang kepercayaan, pemilihan kelas ' +
      'objek, penerapan Region of Interest, serta pembacaan dan penerusan hasil deteksi.',
    scopeRows: [
      ['1.1a', 'Digital Imaging Analytic & Object Detection', 'Analytic & Object Detection → Imaging Analytic'],
      ['1.1b', 'Digital Video Analytic & Object Detection', 'Analytic & Object Detection → Video Analytic'],
    ],
  });

  const body = [
    ...opening,

    H1('Konsep Deteksi Objek'),
    Body(
      'Deteksi objek mengidentifikasi keberadaan dan posisi objek taktis di dalam citra, lalu ' +
      'menandainya dengan kotak pembatas (bounding box) beserta label kelas dan tingkat kepercayaan. ' +
      'Model YOLOv8x memproses seluruh citra dalam satu tahap, sehingga cukup cepat untuk dijalankan ' +
      'pada aliran video langsung.'
    ),

    H2('Kelas Objek yang Didukung'),
    DataTable(['Kelas', 'Cakupan', 'Catatan Operasional'], [
      ['Person', 'Personel berjalan, berdiri, maupun berkendara terbuka.', 'Untuk kerumunan padat, gunakan modul Crowd Counting yang lebih akurat.'],
      ['Car', 'Kendaraan penumpang roda empat.', 'Terdeteksi andal hingga ketinggian 500 m AGL.'],
      ['Truck', 'Kendaraan angkut berat dan bus.', 'Pembeda utama terhadap Car adalah panjang bayangan dan proporsi bodi.'],
      ['Motorcycle', 'Kendaraan roda dua.', 'Memerlukan zoom lebih tinggi pada ketinggian di atas 400 m.'],
      ['Boat', 'Perahu dan kapal kecil di perairan.', 'Kontras terhadap permukaan air memengaruhi keandalan.'],
      ['Building', 'Struktur bangunan dan instalasi tetap.', 'Digunakan sebagai penanda rujukan, bukan objek bergerak.'],
    ], [16, 40, 44]),

    H2('Ambang Kepercayaan'),
    Body(
      'Ambang kepercayaan menentukan nilai minimum keyakinan model agar sebuah deteksi ditampilkan. ' +
      'Nilai rendah menaikkan sensitivitas namun memunculkan lebih banyak deteksi keliru; nilai tinggi ' +
      'menaikkan ketelitian namun berisiko melewatkan objek yang sebenarnya ada.'
    ),
    DataTable(['Nilai Ambang', 'Karakteristik', 'Situasi Penggunaan'], [
      ['25–40%', 'Sangat sensitif, deteksi keliru meningkat.', 'Pencarian awal objek pada area luas yang belum terpetakan.'],
      ['45–60%', 'Seimbang antara sensitivitas dan ketelitian.', 'Pengawasan rutin — rentang yang direkomendasikan.'],
      ['65–85%', 'Sangat selektif, hanya deteksi berkeyakinan tinggi.', 'Verifikasi target sebelum dimasukkan ke Target Bank.'],
    ], [18, 40, 42]),

    H1('Sub-modul 1.1a — Digital Imaging Analytic'),
    Body(
      'Sub-modul ini menjalankan deteksi objek pada berkas citra statis: snapshot kamera EO maupun IR, ' +
      'citra udara, atau tangkapan layar peta. Seluruh pemrosesan berlangsung pada perangkat lokal ' +
      'tanpa pengiriman berkas ke layanan luar.'
    ),
    ...Figure('13-detection-image.png', 'Imaging Analytic — area pemuatan citra dan parameter deteksi.'),

    H2('Memuat Citra'),
    ...Steps([
      'Buka menu Analytic & Object Detection → Imaging Analytic.',
      'Seret berkas citra ke area unggah, atau tekan Telusuri Berkas untuk memilih melalui penjelajah berkas.',
      'Format yang diterima: JPG, JPEG, PNG, dan TIFF, dengan ukuran maksimum 50 MB per berkas. Berkas di luar ketentuan ditolak disertai pesan penjelas.',
      'Citra yang berhasil dimuat ditampilkan pada panel Citra Sumber beserta nama dan ukuran berkas.',
    ]),

    H2('Mengatur Parameter Deteksi'),
    ...Steps([
      'Pilih varian Model. YOLOv8x memberikan akurasi tertinggi; YOLOv8l dan YOLOv8m tersedia bila kecepatan lebih diutamakan.',
      'Geser Ambang Kepercayaan sesuai kebutuhan. Nilai bawaan 55%.',
      'Tetapkan IoU Non-Max Suppression. Nilai bawaan 0,45 menekan kotak pembatas yang bertumpuk; turunkan ke 0,35 bila objek berdekatan sering tergabung menjadi satu deteksi.',
      'Pilih Kelas yang Dideteksi. Menonaktifkan kelas yang tidak relevan mempercepat pemrosesan dan mengurangi gangguan visual.',
    ]),

    H2('Menjalankan Deteksi dan Membaca Hasil'),
    ...Steps([
      'Tekan Jalankan Deteksi pada sudut kanan atas halaman.',
      'Setelah pemrosesan selesai, panel Rincian Deteksi menampilkan jumlah objek per kelas beserta tingkat kepercayaan rata-rata.',
      'Panel Sumber Daya Komputasi menampilkan waktu inferensi, waktu praproses, dan pemakaian memori GPU sebagai bahan evaluasi performa.',
      'Gunakan tombol Simpan Citra Beranotasi untuk menyimpan hasil beserta kotak pembatas ke katalog Surveillance Media.',
      'Gunakan Kirim Semua ke Target Bank untuk meneruskan koordinat objek ke modul GeoInt Visualisation apabila lisensi Information and Reporting aktif.',
    ]),

    H1('Sub-modul 1.1b — Digital Video Analytic'),
    Body(
      'Sub-modul ini menjalankan deteksi objek secara berkelanjutan pada aliran video langsung, ' +
      'dilengkapi pelacakan identitas objek antar-frame. Setiap objek memperoleh Track ID yang tetap ' +
      'selama objek berada dalam cakupan pandang, sehingga pergerakan satu objek dapat ditelusuri ' +
      'meskipun sempat terhalang.'
    ),
    ...Figure('14-detection-video.png', 'Video Analytic — statistik deteksi, tren frame rate, dan log peristiwa.'),

    H2('Memilih Algoritma Pelacakan'),
    DataTable(['Algoritma', 'Karakteristik', 'Situasi Penggunaan'], [
      ['ByteTrack', 'Ringan, mempertahankan deteksi berkeyakinan rendah agar jejak tidak terputus.', 'Pilihan bawaan untuk pengawasan area dengan banyak objek bergerak.'],
      ['DeepSORT', 'Menggunakan ciri visual objek sehingga lebih tahan terhadap objek yang saling melintas.', 'Pengawasan objek spesifik yang harus tetap teridentifikasi meski berpapasan.'],
    ], [18, 44, 38]),

    H2('Moving Target Indicator'),
    Body(
      'Moving Target Indicator memanfaatkan kemampuan pemroses citra bawaan Epsilon untuk ' +
      'mempertahankan fokus kotak deteksi pada objek yang benar-benar bergerak, termasuk ketika kamera ' +
      'sedang melakukan panning cepat. Fitur ini menekan deteksi palsu yang timbul akibat pergeseran ' +
      'latar belakang dan disarankan tetap aktif selama pengawasan area terbuka.'
    ),

    H2('Region of Interest'),
    Body(
      'Region of Interest membatasi area tempat deteksi dihitung. Pada mode Seluruh Frame, setiap objek ' +
      'yang tampak akan dilaporkan. Pada mode Poligon, hanya objek yang titik pusatnya berada di dalam ' +
      'poligon geofence yang dilaporkan — berguna untuk memantau perimeter tertentu tanpa terganggu ' +
      'lalu lintas di luar area kepentingan. Poligon digambar pada modul GeoInt Visualisation.'
    ),

    H2('Menjalankan Sesi Deteksi'),
    ...Steps([
      'Buka menu Analytic & Object Detection → Video Analytic.',
      'Atur Sumber Video: jenis sumber, alamat stream, dan sensor aktif (EO untuk operasi siang, IR untuk operasi malam).',
      'Tetapkan Parameter Deteksi: model, algoritma pelacakan, ambang kepercayaan, mode Region of Interest, dan kelas objek.',
      'Aktifkan Moving Target Indicator bila pengawasan dilakukan sambil menggerakkan gimbal.',
      'Tekan Mulai Deteksi. Indikator pada panggung video berubah menjadi PROCESSING dan garis pindai mulai bergerak.',
      'Amati panel Statistik Deteksi serta Log Deteksi Langsung yang menampilkan dua belas peristiwa terakhir.',
      'Tekan Hentikan untuk mengakhiri sesi. Jumlah peristiwa yang terekam ditampilkan pada notifikasi penutup.',
    ]),

    H2('Membaca Statistik Deteksi'),
    DataTable(['Indikator', 'Makna'], [
      ['Objek Terlacak', 'Jumlah objek yang tercatat pada jendela log berjalan.'],
      ['Personel', 'Jumlah deteksi berkelas Person.'],
      ['Kendaraan', 'Gabungan deteksi berkelas Car, Truck, dan Motorcycle.'],
      ['Frame Rate', 'Kecepatan pemrosesan; target minimum 25 FPS.'],
      ['Track ID', 'Identitas pelacakan objek; nilai tetap selama objek berada dalam cakupan pandang.'],
    ], [26, 74]),

    H1('Batas Operasi dan Target Performa'),
    DataTable(['Parameter', 'Nilai', 'Keterangan'], [
      ['Waktu inferensi citra statis', '≤ 40 ms', 'Resolusi 1920 × 1080, YOLOv8x, TensorRT FP16.'],
      ['Frame rate video', '≥ 25 FPS', 'Dengan pelacakan ByteTrack aktif.'],
      ['Ukuran berkas citra', '≤ 50 MB', 'Format JPG, PNG, atau TIFF.'],
      ['Jumlah objek terlacak serentak', '≤ 120', 'Di atas nilai ini frame rate menurun bertahap.'],
      ['Jangkauan deteksi Person', '≈ 500 m AGL', 'Dengan zoom optik memadai pada sensor EO.'],
      ['Jangkauan deteksi Kendaraan', '≈ 800 m AGL', 'Dengan zoom optik memadai pada sensor EO.'],
      ['Pemakaian VRAM', '≈ 4,2 GB', 'Model YOLOv8x termuat penuh.'],
    ], [34, 22, 44]),

    ...K.troubleshootingCommon([
      ['Objek berdekatan tergabung menjadi satu deteksi', 'Nilai IoU Non-Max Suppression terlalu tinggi.', 'Turunkan nilai IoU ke 0,35 pada panel Parameter Deteksi.'],
      ['Banyak deteksi keliru pada latar belakang', 'Ambang kepercayaan terlalu rendah atau MTI nonaktif.', 'Naikkan ambang ke rentang 55–65% dan aktifkan Moving Target Indicator.'],
      ['Track ID berganti pada objek yang sama', 'Objek sempat terhalang lebih lama dari batas pelacakan.', 'Beralih ke algoritma DeepSORT yang memanfaatkan ciri visual objek.'],
      ['Deteksi tidak muncul pada mode Poligon', 'Titik pusat objek berada di luar geofence.', 'Periksa dan sesuaikan poligon melalui modul GeoInt Visualisation.'],
    ]),

    ...K.appendixRoles(),
    ...K.appendixAudit(),

    H1('Lampiran C — Rujukan Teknis'),
    DataTable(['Dokumen', 'Bagian Terkait'], [
      ['Epsilon 140 / 140Z / 140Z G2 / 140LC User Manual v2.0', 'Pemilihan sensor EO/IR, kendali zoom, dan Moving Target Indicator.'],
      ['Epsilon GEO-location v1.4', 'Konversi posisi objek pada citra menjadi koordinat geografis.'],
      ['Product Requirement Document — SkyStar GeoInt GCS v2.0', 'Spesifikasi sub-lisensi 1.1a dan 1.1b.'],
    ], [52, 48]),
  ];

  return buildDocument({
    fileName: '3. Manual Book - Analytic and Object Detection.docx',
    docTitle, docNo, cover, body, outDir,
  });
}

/* =====================================================================
   MANUAL 3 — DIGITAL ANALYTIC ENHANCEMENT PROCESSING
   ===================================================================== */
async function buildDaep(outDir) {
  const docNo = 'TAB-MB-2026-DAEP-01';
  const docTitle = 'Manual Book — Digital Analytic Enhancement Processing';

  const { cover, opening } = frontMatter({
    docNo, docTitle,
    licenseKind: 'Module License',
    licenseName: 'Digital Analytic Enhancement\nProcessing System Module',
    serials: ['TAB-DAEP-2026-005-E9R4T8', 'TAB-DAEP-2026-006-F2N6Y7'],
    purpose:
      'Manual ini menguraikan prosedur pengoperasian empat sub-modul: peningkatan kualitas citra statis, ' +
      'peningkatan stream video termal, antarmuka integrasi data kabel penambat, serta pemantauan ' +
      'kesehatan kabel penambat. Keempatnya menopang mutu masukan analitik sekaligus keandalan jalur ' +
      'daya dan data antara stasiun darat dan muatan di udara.',
    scopeRows: [
      ['1.2a', 'Digital Imaging Enhancement', 'Enhancement Processing → Imaging Enhancement'],
      ['1.2b', 'Digital Video Enhancement', 'Enhancement Processing → Video Enhancement'],
      ['1.2c', 'Interface Integrasi (API) Main Tether Cable', 'Enhancement Processing → Tether Cable API'],
      ['1.2d', 'Monitoring Checking Capability Tether Cable', 'Enhancement Processing → Tether Cable Monitor'],
    ],
  });

  const body = [
    ...opening,

    H1('Sub-modul 1.2a — Digital Imaging Enhancement'),
    Body(
      'Sub-modul ini meningkatkan keterbacaan citra statis yang diambil pada kondisi tidak ideal — ' +
      'berkabut, kontras rendah, berdebu, atau minim cahaya. Empat algoritma tersedia dan dapat ' +
      'dipadukan dengan pengurangan derau bilateral.'
    ),
    ...Figure('15-enhance-image.png', 'Imaging Enhancement — perbandingan citra asli dan hasil pemrosesan.'),

    H2('Algoritma yang Tersedia'),
    DataTable(['Algoritma', 'Cara Kerja', 'Situasi Penggunaan'], [
      ['CLAHE', 'Menyamakan histogram secara adaptif per petak citra dengan pembatasan kontras, sehingga detail pada area gelap terangkat tanpa membakar area terang.', 'Citra dengan rentang pencahayaan lebar, misalnya bayangan bangunan pada siang terik.'],
      ['Laplacian', 'Menonjolkan tepi melalui operator turunan kedua.', 'Memperjelas kontur bangunan, jalan, dan kendaraan.'],
      ['Unsharp Mask', 'Menajamkan citra berdasarkan selisih antara citra asli dan versi kaburnya.', 'Citra yang sedikit kabur akibat getaran atau fokus tidak sempurna.'],
      ['Dehaze', 'Menekan hamburan atmosferik untuk memulihkan kontras jarak jauh.', 'Pengambilan jarak jauh pada kondisi berkabut atau berdebu.'],
    ], [16, 46, 38]),

    H2('Prosedur Peningkatan Citra'),
    ...Steps([
      'Buka menu Enhancement Processing → Imaging Enhancement.',
      'Muat citra melalui area unggah atau tombol Muat Citra. Format yang diterima: JPG, PNG, dan TIFF hingga 50 MB.',
      'Pilih Algoritma pada panel Kendali Penajaman. Keterangan singkat setiap algoritma tampil di bawah deretan pilihan.',
      'Atur Kekuatan untuk menentukan intensitas efek, dan Blend Hasil untuk menentukan proporsi pencampuran antara citra asli dan hasil pemrosesan.',
      'Pilih tingkat Bilateral Denoising. Tingkat tinggi menghaluskan derau namun dapat mengurangi detail halus.',
      'Tekan Terapkan. Panel kanan menampilkan hasil pemrosesan berdampingan dengan citra asli.',
      'Periksa panel Metrik Kualitas untuk menilai peningkatan kontras, ketajaman tepi, dan rasio sinyal terhadap derau.',
      'Tekan Simpan Hasil untuk menyimpan citra terproses ke katalog Surveillance Media.',
    ]),
    Note('Anjuran:', 'Terapkan peningkatan kualitas sebelum menjalankan deteksi objek pada citra yang sama. Kontras yang lebih baik umumnya menaikkan tingkat kepercayaan hasil deteksi.'),

    H1('Sub-modul 1.2b — Digital Video Enhancement'),
    Body(
      'Sub-modul ini mengubah sinyal termal monokromatik menjadi representasi warna semu (false color) ' +
      'secara real-time, sehingga perbedaan suhu yang halus menjadi lebih mudah dikenali mata. Dua ' +
      'puluh dua palet disediakan sesuai spesifikasi Epsilon Manual §5.7.3.'
    ),
    ...Figure('16-enhance-video.png', 'Video Enhancement — pemilihan palet false color dan kendali pemrosesan termal.'),

    H2('Pemilihan Palet'),
    DataTable(['Palet', 'Karakteristik', 'Situasi Penggunaan'], [
      ['White Hot', 'Objek panas tampil putih pada latar gelap.', 'Pilihan bawaan untuk pengamatan umum malam hari.'],
      ['Black Hot', 'Kebalikan White Hot; objek panas tampil gelap.', 'Membedakan personel pada latar bervegetasi hangat.'],
      ['Iron / Iron 256', 'Gradasi hitam–merah–kuning menyerupai logam berpijar.', 'Menonjolkan gradasi suhu pada mesin dan kendaraan.'],
      ['Rainbow / Rainbow HC', 'Spektrum warna penuh dengan pembedaan tajam.', 'Analisis distribusi suhu pada area luas.'],
      ['Hot / Cold', 'Biru untuk suhu rendah, merah untuk suhu tinggi.', 'Membedakan objek yang lebih dingin dari lingkungannya, misalnya kendaraan yang baru berhenti.'],
      ['IceFire, Sepia, Ocean, Arctic', 'Gradasi kontras rendah yang nyaman untuk pengamatan lama.', 'Pemantauan berdurasi panjang guna mengurangi kelelahan mata.'],
      ['Isotherm', 'Menyorot rentang suhu tertentu dengan warna kontras.', 'Menandai objek pada rentang suhu tubuh manusia.'],
    ], [22, 40, 38]),

    H2('Kendali Pemrosesan Termal'),
    DataTable(['Kendali', 'Fungsi', 'Anjuran'], [
      ['Automatic Gain Control', 'Menyesuaikan rentang tampilan secara otomatis mengikuti suhu pemandangan.', 'Biarkan aktif kecuali diperlukan pengamatan pada rentang suhu tetap.'],
      ['Digital Detail Enhancement', 'Menonjolkan detail bertekstur halus pada citra termal.', 'Nilai 40–60% memadai untuk sebagian besar kondisi.'],
      ['Gain Manual', 'Mengatur penguatan sinyal secara manual.', 'Hanya tersedia setelah Automatic Gain Control dinonaktifkan.'],
      ['Reduksi Derau Temporal', 'Menekan derau dengan merata-ratakan beberapa frame berurutan.', 'Nilai tinggi dapat menimbulkan jejak pada objek yang bergerak cepat.'],
    ], [26, 42, 32]),

    H2('Prosedur Pengoperasian'),
    ...Steps([
      'Buka menu Enhancement Processing → Video Enhancement.',
      'Tekan Mulai Pratinjau untuk mengaktifkan pemrosesan pada kanal termal.',
      'Pilih palet false color yang sesuai dengan kondisi pengamatan.',
      'Sesuaikan Digital Detail Enhancement dan Reduksi Derau Temporal hingga detail objek terlihat jelas tanpa jejak berlebih.',
      'Tetapkan Tujuan Stream: tampilan operator saja, rekam ke penyimpanan lokal, atau teruskan ke modul deteksi.',
      'Gunakan Ambil Snapshot Terproses untuk menyimpan satu bingkai hasil pemrosesan ke katalog media.',
    ]),

    H1('Sub-modul 1.2c — Tether Cable Integration API'),
    Body(
      'Sub-modul ini menyediakan antarmuka data lokal bagi perangkat dan sistem lain di stasiun darat ' +
      'untuk membaca parameter kelistrikan serta kualitas jalur optik kabel penambat. Data mentah ' +
      'diperoleh dari pengendali ground winch melalui protokol Modbus TCP atau Serial RTU, lalu ' +
      'disajikan sebagai endpoint REST dan aliran WebSocket.'
    ),
    ...Figure('17-tether-api.png', 'Tether Cable API — daftar endpoint, contoh respons, dan kunci akses.'),

    H2('Daftar Endpoint'),
    DataTable(['Metode', 'Path', 'Keterangan'], [
      ['GET', '/api/v1/tether/status', 'Ringkasan status kabel: tegangan, arus, isolasi, dan kontinuitas.'],
      ['GET', '/api/v1/tether/power', 'Parameter kelistrikan terkini beserta stempel waktu pembacaan.'],
      ['GET', '/api/v1/tether/optical', 'Redaman dan rasio sinyal terhadap derau jalur serat optik.'],
      ['GET', '/api/v1/tether/history', 'Riwayat pembacaan sensor pada rentang waktu tertentu.'],
      ['POST', '/api/v1/tether/calibrate', 'Menjalankan kalibrasi ulang sensor arus dan tegangan.'],
      ['WS', '/ws/tether/telemetry', 'Aliran telemetri real-time melalui WebSocket.'],
    ], [12, 34, 54]),

    H2('Pengelolaan Kunci Akses'),
    ...Steps([
      'Buka menu Enhancement Processing → Tether Cable API.',
      'Pada panel Kunci Akses API, tekan Terbitkan untuk membuat kunci baru bagi sebuah perangkat.',
      'Salin kunci yang ditampilkan. Kunci hanya tampil sekali pada saat diterbitkan dan selanjutnya disimpan dalam bentuk hash.',
      'Sertakan kunci pada setiap permintaan melalui header Authorization.',
      'Cabut kunci yang tidak lagi digunakan agar tidak menjadi celah akses.',
    ]),
    Note('Batas akses:', 'Seluruh endpoint hanya dapat diakses dari segmen jaringan lokal stasiun dengan batas 600 permintaan per menit per klien.'),

    H1('Sub-modul 1.2d — Tether Cable Monitoring'),
    Body(
      'Sub-modul ini memantau kesehatan kabel penambat utama secara berkelanjutan. Kabel berpenguat ' +
      'Kevlar dengan inti serat optik menyalurkan daya 230 VAC ke muatan di udara sekaligus membawa ' +
      'jalur data. Kegagalan pada salah satu fungsi berdampak langsung pada keselamatan operasi.'
    ),
    ...Figure('18-tether-monitor.png', 'Tether Cable Monitor — delapan parameter kesehatan kabel beserta batas operasinya.'),

    H2('Parameter yang Dipantau'),
    DataTable(['Parameter', 'Batas Operasi', 'Makna Penyimpangan'], [
      ['Tegangan Operasi', '230 VAC ±5%', 'Penurunan menandakan kehilangan daya pada penghantar atau gangguan pada sumber.'],
      ['Arus Beban', '≤ 2,2 A', 'Kenaikan mendadak menandakan hubungan singkat atau beban muatan berlebih.'],
      ['Resistansi Isolasi', '> 100 MΩ', 'Penurunan menandakan kelembapan masuk atau selubung terkelupas.'],
      ['Kontinuitas Konduktor', 'Tersambung', 'Terputus berarti konduktor patah — penurunan balon segera diperlukan.'],
      ['SNR Serat Optik (EOP)', '> 40 dB', 'Penurunan menandakan serat tertekuk atau sambungan optik kotor.'],
      ['Redaman Optik', '< 0,40 dB/km', 'Kenaikan menandakan tekukan mikro pada serat.'],
      ['Suhu Selubung', '< 70 °C', 'Kenaikan menandakan pemanasan berlebih akibat arus tinggi.'],
      ['Tegangan Tarik Kevlar', '< 4.500 N', 'Mendekati batas berarti beban angin melampaui rentang aman.'],
    ], [24, 20, 56]),

    H2('Menjalankan Diagnostik'),
    ...Steps([
      'Buka menu Enhancement Processing → Tether Cable Monitor.',
      'Periksa delapan kartu parameter di bagian atas halaman. Nilai berwarna hijau berarti berada dalam batas operasi.',
      'Tekan Jalankan Diagnostik untuk melakukan pemeriksaan menyeluruh. Proses berlangsung sekitar dua detik dan tidak mengganggu penyaluran daya.',
      'Amati grafik Tren Kelistrikan serta Tren Isolasi dan Optik untuk mengenali penurunan bertahap yang belum melewati ambang.',
      'Catat hasil pada panel Riwayat Diagnostik sebagai bagian dari dokumentasi pemeliharaan.',
    ]),
    Note('Jadwal pemeriksaan:', 'Diagnostik rutin dijalankan setiap hari sebelum penerbangan pertama, serta setelah kejadian cuaca ekstrem seperti badai atau petir di sekitar lokasi.'),

    H1('Batas Operasi dan Target Performa'),
    DataTable(['Parameter', 'Nilai', 'Keterangan'], [
      ['Waktu pemrosesan citra (1.2a)', '≈ 72 ms', 'Resolusi 1920 × 1080 dengan akselerasi CUDA.'],
      ['Latensi pemrosesan video (1.2b)', '≈ 18 ms', 'Frame rate keluaran dipertahankan pada 30 FPS.'],
      ['Jumlah palet false color', '22 palet', 'Sesuai Epsilon Manual §5.7.3.'],
      ['Rentang termal', '−40 °C s.d. +150 °C', 'Sensor FLIR Tau 2, resolusi 640 × 512.'],
      ['Interval polling Modbus (1.2c)', '1 detik', 'Waktu respons perangkat ≈ 12 ms.'],
      ['Batas laju permintaan API', '600 per menit', 'Per klien, berlaku pada seluruh endpoint.'],
      ['Panjang kabel terpasang', '600 m', 'Panjang operasi lazim 450 m.'],
      ['Umur layanan kabel', '5.000 jam', 'Pemakaian tercatat ditampilkan pada panel spesifikasi.'],
    ], [34, 24, 42]),

    ...K.troubleshootingCommon([
      ['Hasil peningkatan citra tampak berbintik', 'Kekuatan algoritma terlalu tinggi atau denoising nonaktif.', 'Turunkan Kekuatan ke rentang 40–60% dan naikkan Bilateral Denoising ke tingkat Sedang.'],
      ['Palet false color tidak berubah', 'Pratinjau belum diaktifkan.', 'Tekan Mulai Pratinjau terlebih dahulu, lalu pilih palet yang diinginkan.'],
      ['Objek bergerak meninggalkan jejak pada video termal', 'Reduksi Derau Temporal terlalu tinggi.', 'Turunkan nilai reduksi derau hingga jejak menghilang.'],
      ['Endpoint API mengembalikan galat sambungan', 'Pengendali ground winch tidak terjangkau.', 'Periksa alamat Modbus pada System Settings → Jaringan dan pastikan perangkat menyala.'],
      ['Resistansi isolasi turun bertahap', 'Kelembapan mulai masuk melalui selubung kabel.', 'Jadwalkan pemeriksaan fisik kabel; turunkan balon bila nilai mendekati 100 MΩ.'],
    ]),

    ...K.appendixRoles(),
    ...K.appendixAudit(),

    H1('Lampiran C — Rujukan Teknis'),
    DataTable(['Dokumen', 'Bagian Terkait'], [
      ['Epsilon 140 / 140Z / 140Z G2 / 140LC User Manual v2.0', '§5.7.3 palet false color; §5.11 penajaman citra.'],
      ['Codan MG-001-6-0-0 MT-4E Maintenance Guide', 'Pemeliharaan jalur daya dan pengukuran isolasi.'],
      ['TN267-8 UHF MT-4E Receiver / TN367-6 UHF MT-4E Transmitter', 'Karakteristik jalur data pada kabel penambat.'],
      ['Product Requirement Document — SkyStar GeoInt GCS v2.0', 'Spesifikasi sub-lisensi 1.2a s.d. 1.2d.'],
    ], [52, 48]),
  ];

  return buildDocument({
    fileName: '4. Manual Book - Digital Analytic Enhancement Processing.docx',
    docTitle, docNo, cover, body, outDir,
  });
}

/* =====================================================================
   MANUAL 4 — INFORMATION AND REPORTING
   ===================================================================== */
async function buildIrgis(outDir) {
  const docNo = 'TAB-MB-2026-IRGIS-01';
  const docTitle = 'Manual Book — Information and Reporting';

  const { cover, opening } = frontMatter({
    docNo, docTitle,
    licenseKind: 'Module License',
    licenseName: 'Information and Reporting\nTethered Balloon Geospatial Intelligence System Module',
    serials: ['TAB-IRGIS-2026-007-G5V8K3', 'TAB-IRGIS-2026-008-H7M2Z9'],
    purpose:
      'Manual ini menguraikan prosedur pengoperasian enam sub-modul yang menopang siklus informasi ' +
      'operasi: penyusunan laporan, visualisasi geospasial, mesin peringatan, administrasi penerbangan, ' +
      'pemantauan stasiun penambat, dan simulasi kelayakan terbang. Keenamnya membentuk rangkaian dari ' +
      'perencanaan misi, pelaksanaan, hingga pelaporan.',
    scopeRows: [
      ['1.3a', 'Digital Reporting Tethered Balloon', 'Information & Reporting → Digital Reporting'],
      ['1.3b', 'Digital Visualisation Information GeoInt', 'Information & Reporting → GeoInt Visualisation'],
      ['1.3c', 'Digital Smart Notification Alert', 'Information & Reporting → Smart Notification'],
      ['1.3d', 'Information Flight Balloon Intelligent App', 'Information & Reporting → Flight Information'],
      ['1.3e', 'Monitoring Availability Mooring App System', 'Information & Reporting → Mooring Availability'],
      ['1.3f', 'Simulation Plan Skenario Flight Balloon', 'Information & Reporting → Flight Simulation'],
    ],
  });

  const body = [
    ...opening,

    H1('Alur Kerja Misi'),
    Body(
      'Keenam sub-modul dalam lisensi ini dirancang untuk digunakan berurutan sepanjang satu siklus ' +
      'misi. Memahami urutan tersebut membantu operator menempatkan setiap menu pada konteks yang tepat.'
    ),
    DataTable(['Tahap', 'Sub-modul', 'Keluaran'], [
      ['1. Perencanaan', 'Flight Simulation (1.3f)', 'Keputusan GO / MARGINAL / NO-GO beserta penilaian per faktor.'],
      ['2. Persiapan', 'Flight Information (1.3d)', 'Checklist pra-terbang terpenuhi dan misi tercatat pada logbook.'],
      ['3. Pelaksanaan', 'Mooring Availability (1.3e)', 'Pemantauan berkelanjutan instrumen stasiun penambat.'],
      ['4. Pengawasan', 'GeoInt Visualisation (1.3b)', 'Koordinat target tercatat pada Target Bank.'],
      ['5. Respons', 'Smart Notification (1.3c)', 'Peringatan diterbitkan dan ditangani sesuai tingkat eskalasi.'],
      ['6. Pelaporan', 'Digital Reporting (1.3a)', 'Laporan misi berformat PDF atau Excel dengan watermark klasifikasi.'],
    ], [18, 32, 50]),

    H1('Sub-modul 1.3f — Flight Simulation'),
    Body(
      'Sub-modul ini mengevaluasi kelayakan terbang sebelum balon dinaikkan. Sepuluh faktor dinilai ' +
      'terhadap batas operasi, lalu digabungkan menjadi satu keputusan. Simulasi wajib dijalankan pada ' +
      'awal setiap siklus misi.'
    ),
    ...Figure('24-simulation.png', 'Flight Simulation — parameter skenario dan keputusan kelayakan terbang.'),

    H2('Faktor yang Dinilai'),
    DataTable(['Faktor', 'Batas Aman (GO)', 'Batas Operasi (MARGINAL)'], [
      ['Kecepatan Angin', '< 25 km/h', '< 35 km/h'],
      ['Hembusan Angin', '< 35 km/h', '< 45 km/h'],
      ['Jarak Pandang', '≥ 8 km', '≥ 4 km'],
      ['Suhu Ambien', '−5 °C s.d. 40 °C', '≤ 45 °C'],
      ['Curah Hujan', '≤ 5 mm/jam', '≤ 15 mm/jam'],
      ['Ketinggian Rencana', '≤ 500 m AGL', '≤ 600 m AGL'],
      ['Cadangan Helium', '≥ 160 bar', '≥ 150 bar'],
      ['Bobot Payload', '≤ 12 kg', '≤ 15 kg'],
      ['Daya Angkut Bersih', '> 170 kg', '> 165 kg'],
      ['Durasi Misi', '≤ 8 jam', '≤ 10 jam'],
    ], [34, 33, 33]),

    H2('Makna Keputusan'),
    DataTable(['Keputusan', 'Makna', 'Tindakan'], [
      ['GO', 'Seluruh faktor berada dalam batas aman.', 'Penerbangan dilaksanakan sesuai rencana.'],
      ['MARGINAL', 'Terdapat faktor yang mendekati batas operasi.', 'Penerbangan dapat dilanjutkan dengan pemantauan ketat dan rencana penurunan dini yang disiapkan sebelum lepas landas.'],
      ['NO-GO', 'Satu atau lebih faktor melewati batas operasi.', 'Penerbangan ditunda hingga kondisi membaik. Jalankan simulasi ulang setelah pembaruan perkiraan cuaca.'],
    ], [16, 34, 50]),

    H2('Prosedur Simulasi'),
    ...Steps([
      'Buka menu Information & Reporting → Flight Simulation.',
      'Isi kelompok Kondisi Meteorologi berdasarkan perkiraan cuaca lokal terbaru: kecepatan angin, hembusan, jarak pandang, suhu, dan curah hujan.',
      'Isi kelompok Rencana Penerbangan: ketinggian operasi, cadangan helium, bobot payload, dan durasi misi dalam satuan menit.',
      'Pilih Platform Balon dan Payload Terpasang. Kapasitas angkut ikut disesuaikan mengikuti pilihan platform.',
      'Tekan Jalankan Simulasi.',
      'Baca keputusan pada panel Keputusan Kelayakan beserta margin keselamatan gabungan.',
      'Periksa panel Penilaian per Faktor untuk mengetahui faktor mana yang menahan keputusan, lalu sesuaikan rencana bila diperlukan.',
    ]),

    H1('Sub-modul 1.3d — Flight Information'),
    Body(
      'Sub-modul ini mencatat administrasi penerbangan: misi berjalan, checklist pra-terbang digital, ' +
      'dan logbook seluruh misi. Checklist membedakan butir kritis yang wajib terpenuhi dari butir ' +
      'pendukung yang bersifat anjuran.'
    ),
    ...Figure('22-flight-info.png', 'Flight Information — misi berjalan, checklist pra-terbang, dan logbook penerbangan.'),

    H2('Checklist Pra-Terbang'),
    Body(
      'Dua belas butir diperiksa sebelum lepas landas. Tujuh butir pertama ditandai KRITIS: selama ' +
      'salah satunya belum terpenuhi, sistem menyatakan lepas landas belum diizinkan dan menampilkan ' +
      'jumlah butir kritis yang tersisa pada bilah kelengkapan.'
    ),
    DataTable(['Butir', 'Sifat', 'Sumber Verifikasi'], [
      ['Tekanan helium ≥ 150 bar', 'Kritis', 'Mooring Availability (1.3e)'],
      ['Tegangan baterai cadangan ≥ 24 V', 'Kritis', 'Mooring Availability (1.3e)'],
      ['Kontinuitas kabel penambat terverifikasi', 'Kritis', 'Tether Cable Monitor (1.2d)'],
      ['Resistansi isolasi > 100 MΩ', 'Kritis', 'Tether Cable Monitor (1.2d)'],
      ['GPS lock diperoleh (≥ 8 satelit)', 'Kritis', 'Telemetri gimbal'],
      ['Kecepatan angin darat < 35 km/h', 'Kritis', 'Mooring Availability (1.3e)'],
      ['Payload Epsilon terpasang dan terkunci', 'Kritis', 'Pemeriksaan fisik'],
      ['Tautan optik EOP terverifikasi (> 40 dB)', 'Pendukung', 'Tether Cable Monitor (1.2d)'],
      ['Sistem proteksi petir terhubung', 'Pendukung', 'Mooring Availability (1.3e)'],
      ['Winch dan rem darurat berfungsi', 'Pendukung', 'Pemeriksaan fisik'],
      ['Area lepas landas steril dari personel', 'Pendukung', 'Pemeriksaan visual'],
      ['Izin operasi ruang udara diperoleh', 'Pendukung', 'Dokumen administrasi'],
    ], [40, 16, 44]),

    H2('Prosedur Pencatatan Misi'),
    ...Steps([
      'Buka menu Information & Reporting → Flight Information.',
      'Tekan Misi Baru, lalu isi parameter misi dan tetapkan tim operator yang bertugas.',
      'Kerjakan checklist pra-terbang. Centang setiap butir setelah diverifikasi pada sumber yang tercantum.',
      'Pastikan bilah kelengkapan menyatakan seluruh butir kritis telah terpenuhi sebelum lepas landas.',
      'Setelah balon naik, panel Misi Berjalan memperbarui durasi, ketinggian, dan panjang kabel terulur secara otomatis.',
      'Saat misi berakhir, catatan berpindah ke Logbook Penerbangan beserta waktu lepas landas, waktu mendarat, dan total durasi.',
    ]),

    H1('Sub-modul 1.3e — Mooring Availability Monitoring'),
    Body(
      'Sub-modul ini memantau instrumen pada stasiun penambat darat. Delapan sensor dibaca secara ' +
      'berkelanjutan dan menjadi sumber utama bagi checklist pra-terbang serta mesin peringatan.'
    ),
    ...Figure('23-mooring.png', 'Mooring Availability — sensor stasiun penambat dan status unit winch.'),

    H2('Sensor yang Dipantau'),
    DataTable(['Sensor', 'Batas Operasi', 'Konsekuensi Pelanggaran'], [
      ['Anemometer', '< 35 km/h berkelanjutan', 'Peringatan kritis; penurunan balon direkomendasikan.'],
      ['Load Cell Winch', '< 4.500 N', 'Beban angin melampaui rentang aman kabel penambat.'],
      ['Tekanan Helium', '150 – 180 bar', 'Di bawah 150 bar daya angkut tidak mencukupi untuk lepas landas.'],
      ['Suhu Ambien', '< 45 °C', 'Suhu tinggi menurunkan daya angkut dan mempercepat penuaan selubung kabel.'],
      ['Baterai Cadangan', '> 22 V', 'Cadangan tidak mencukupi bila daya utama terputus.'],
      ['Inverter Darurat', 'Selalu siaga', 'Kehilangan daya cadangan saat gangguan pasokan.'],
      ['Proteksi Petir', 'Isolasi utuh', 'Risiko sambaran merambat ke muatan dan stasiun.'],
      ['Tautan Optik EOP', '> 40 dB', 'Penurunan kualitas jalur data dari muatan.'],
    ], [22, 24, 54]),

    H2('Status Unit Winch'),
    Body(
      'Panel Status Winch menampilkan kondisi winch utama, tiga winch bantu pengarah, rem darurat, dan ' +
      'sumber daya eksternal. Winch bantu menjaga kestabilan balon terhadap hembusan lateral; ' +
      'ketidakseimbangan beban antar-winch bantu menandakan arah angin berubah dan menuntut penyesuaian ' +
      'orientasi stasiun.'
    ),

    H1('Sub-modul 1.3b — GeoInt Visualisation'),
    Body(
      'Sub-modul ini menyajikan gambaran keruangan operasi. Seluruh ubin peta dimuat dari penyimpanan ' +
      'lokal berformat MBTiles sehingga tetap tersedia tanpa koneksi internet. Peta menampilkan posisi ' +
      'balon, cincin jangkauan, proyeksi cakupan pandang kamera terhadap target terpilih, serta seluruh ' +
      'titik Target Bank dengan penandaan tingkat ancaman.'
    ),
    ...Figure('20-geo-viz.png', 'GeoInt Visualisation — peta taktis, proyeksi FOV, dan Target Bank.'),

    H2('Lapisan Peta'),
    DataTable(['Lapisan', 'Isi', 'Sumber'], [
      ['Raster', 'Peta dasar jalan dan bangunan.', 'MBTiles lokal.'],
      ['Terrain', 'Relief ketinggian permukaan.', 'Berkas DEM (.HGT / SRTM) yang dimuat operator.'],
      ['Satelit', 'Citra satelit wilayah operasi.', 'Berkas GeoTIFF yang dimuat operator.'],
    ], [18, 42, 40]),

    H2('Target Bank'),
    Body(
      'Target Bank menyimpan koordinat titik kepentingan yang telah dikunci melalui Laser Range Finder ' +
      'atau ditandai manual oleh operator. Setiap titik memuat nama, koordinat, jarak miring dari balon, ' +
      'dan tingkat ancaman.'
    ),
    ...Steps([
      'Buka menu Information & Reporting → GeoInt Visualisation.',
      'Pilih lapisan peta yang sesuai dengan kebutuhan pengamatan.',
      'Tekan Tambah pada panel Target Bank untuk mencatat titik baru, atau pilih titik yang telah ada untuk menampilkan proyeksi cakupan pandang kamera ke arah titik tersebut.',
      'Periksa panel Solusi Geolokasi yang menampilkan koordinat kamera, koordinat target, dan jarak miring hasil pengukuran laser.',
      'Gunakan Ekspor KML atau Ekspor GPX untuk menyerahkan koordinat kepada satuan lain.',
    ]),
    Note('Ketelitian:', 'Koordinat target dihitung dari posisi balon, sudut pan dan tilt, serta jarak hasil Laser Range Finder dengan ketelitian ±1 meter pada jangkauan hingga 5.000 meter.'),

    H1('Sub-modul 1.3c — Smart Notification Alert'),
    Body(
      'Sub-modul ini menerbitkan peringatan ketika kondisi yang dipantau melewati aturan yang ' +
      'ditetapkan. Peringatan dikelompokkan dalam tiga tingkat dan dieskalasi kepada peran yang sesuai.'
    ),
    ...Figure('21-alerts.png', 'Smart Notification — riwayat peringatan, aturan aktif, dan kanal notifikasi.'),

    H2('Tingkat dan Eskalasi'),
    DataTable(['Tingkat', 'Penerima', 'Batas Waktu Tanggapan'], [
      ['Informasi', 'Operator stasiun', 'Tanpa batas waktu khusus.'],
      ['Peringatan', 'Operator dan Supervisor', '15 menit.'],
      ['Kritis', 'Seluruh peran, termasuk Commander', '5 menit.'],
    ], [20, 46, 34]),

    H2('Aturan Bawaan'),
    DataTable(['Aturan', 'Tingkat', 'Sumber Data'], [
      ['Kepadatan massa melewati 500 jiwa', 'Peringatan', 'Crowd Counting'],
      ['Kecepatan angin melewati 30 km/h', 'Peringatan', 'Mooring Availability (1.3e)'],
      ['Kecepatan angin melewati 35 km/h', 'Kritis', 'Mooring Availability (1.3e)'],
      ['Intrusi pada geofence perimeter', 'Kritis', 'Video Analytic (1.1b)'],
      ['Resistansi isolasi kabel di bawah 100 MΩ', 'Kritis', 'Tether Cable Monitor (1.2d)'],
      ['Tekanan helium di bawah 150 bar', 'Peringatan', 'Mooring Availability (1.3e)'],
    ], [44, 18, 38]),

    H2('Menangani Peringatan'),
    ...Steps([
      'Buka menu Information & Reporting → Smart Notification.',
      'Gunakan penyaring tingkat pada judul panel untuk memusatkan perhatian pada peringatan kritis terlebih dahulu.',
      'Baca uraian peringatan beserta sumber data yang menerbitkannya.',
      'Tekan Tangani pada peringatan berstatus terbuka setelah tindakan penanganan dilakukan. Status berubah menjadi ditangani dan tercatat pada Audit Trail.',
      'Peringatan berpindah ke status selesai setelah kondisi pemicunya kembali normal.',
    ]),
    Note('Tindakan otomatis:', 'Peringatan bertingkat kritis memicu perekaman video selama 60 detik sebagai bukti kejadian, terlepas dari status perekaman manual.'),

    H1('Sub-modul 1.3a — Digital Reporting'),
    Body(
      'Sub-modul ini menyusun laporan misi secara otomatis dari data yang terekam sepanjang operasi. ' +
      'Enam templat tersedia, masing-masing dengan susunan bagian yang berbeda sesuai peruntukannya.'
    ),
    ...Figure('19-reporting.png', 'Digital Reporting — pemilihan templat, parameter, dan konten laporan.'),

    H2('Templat yang Tersedia'),
    DataTable(['Templat', 'Peruntukan', 'Bagian'], [
      ['Laporan Operasi Harian', 'Rekapitulasi seluruh kegiatan dalam satu hari operasi.', '7'],
      ['Rekapitulasi Mingguan', 'Agregasi tujuh hari beserta tren dan ketersediaan sistem.', '9'],
      ['Laporan Insiden', 'Kronologi peristiwa disertai bukti dan tindakan penanganan.', '6'],
      ['Laporan Penerbangan', 'Logbook per misi beserta konsumsi helium dan tim operator.', '8'],
      ['Analisis Kepadatan Massa', 'Grafik kepadatan per zona beserta pelanggaran ambang.', '5'],
      ['Laporan Pemeliharaan', 'Hasil diagnostik kabel penambat, mooring, dan gimbal.', '6'],
    ], [30, 56, 14]),

    H2('Klasifikasi Dokumen'),
    Body(
      'Setiap laporan diberi watermark klasifikasi yang tercetak pada seluruh halaman. Klasifikasi ' +
      'dipilih sebelum laporan dibuat dan tidak dapat diubah setelah berkas dihasilkan.'
    ),
    DataTable(['Klasifikasi', 'Peruntukan'], [
      ['BIASA', 'Informasi yang dapat dibagikan lintas satuan tanpa pembatasan khusus.'],
      ['TERBATAS', 'Informasi operasional yang hanya boleh diakses personel bertugas.'],
      ['RAHASIA', 'Informasi yang pengungkapannya dapat merugikan pelaksanaan operasi.'],
      ['SANGAT RAHASIA', 'Informasi yang pengungkapannya berdampak strategis.'],
    ], [24, 76]),

    H2('Prosedur Pembuatan Laporan'),
    ...Steps([
      'Buka menu Information & Reporting → Digital Reporting.',
      'Pilih templat laporan pada panel Pilih Templat Laporan.',
      'Tetapkan rentang waktu melalui pilihan cepat atau kolom tanggal Dari dan Sampai.',
      'Pilih format berkas: PDF untuk dokumen final yang akan ditandatangani, atau Excel untuk data yang masih akan diolah lebih lanjut.',
      'Tetapkan klasifikasi dokumen sesuai peruntukan laporan.',
      'Pilih bagian konten yang disertakan pada panel Konten yang Disertakan.',
      'Periksa panel Watermark dan Pengesahan untuk memastikan identitas instansi, stasiun, dan penyusun telah benar.',
      'Tekan Buat Laporan. Berkas tersimpan dan muncul pada panel Riwayat Laporan.',
    ]),

    H1('Batas Operasi dan Target Performa'),
    DataTable(['Parameter', 'Nilai', 'Keterangan'], [
      ['Ketelitian koordinat target', '±1 m', 'Pada jangkauan Laser Range Finder hingga 5.000 m.'],
      ['Jangkauan Laser Range Finder', '50 – 5.000 m', 'Laser kelas I eye-safe 1,5 μm.'],
      ['Batas waktu tanggapan peringatan kritis', '5 menit', 'Terhitung sejak peringatan diterbitkan.'],
      ['Durasi perekaman otomatis', '60 detik', 'Dipicu oleh peringatan bertingkat kritis.'],
      ['Blok waktu misi maksimum', '8 jam', 'Batas MARGINAL hingga 10 jam.'],
      ['Ketinggian operasi maksimum', '600 m AGL', 'Sesuai panjang kabel penambat terpasang.'],
      ['Retensi laporan', '1.095 hari', 'Dapat disesuaikan pada System Settings → Data dan Retensi.'],
      ['Format ekspor koordinat', 'KML dan GPX', 'Sistem referensi WGS-84.'],
    ], [38, 22, 40]),

    ...K.troubleshootingCommon([
      ['Simulasi selalu menghasilkan NO-GO', 'Satu faktor melewati batas operasi.', 'Periksa panel Penilaian per Faktor untuk mengetahui faktor penahan, lalu sesuaikan rencana misi.'],
      ['Checklist tidak mengizinkan lepas landas', 'Masih ada butir bertanda KRITIS yang belum terpenuhi.', 'Verifikasi butir tersebut pada sumber yang tercantum di kolom Sumber Verifikasi.'],
      ['Peta tidak menampilkan ubin', 'Berkas MBTiles wilayah operasi belum dimuat.', 'Muat berkas raster atau DEM melalui panel Lapisan Peta.'],
      ['Peringatan tidak terbit meski ambang terlampaui', 'Aturan terkait dinonaktifkan.', 'Periksa panel Aturan Aktif pada menu Smart Notification.'],
      ['Laporan tidak memuat grafik sensor', 'Bagian konten tersebut tidak dicentang.', 'Aktifkan bagian yang diperlukan pada panel Konten yang Disertakan sebelum membuat laporan.'],
    ]),

    ...K.appendixRoles(),
    ...K.appendixAudit(),

    H1('Lampiran C — Rujukan Teknis'),
    DataTable(['Dokumen', 'Bagian Terkait'], [
      ['Epsilon GEO-location v1.4', 'Perhitungan koordinat target dari sudut gimbal dan jarak laser.'],
      ['Epsilon 140 / 140Z / 140Z G2 / 140LC User Manual v2.0', 'Pengoperasian Laser Range Finder dan overlay telemetri.'],
      ['Technical Training — Tethered Aerostat System', 'Prosedur mooring, batas angin, dan pengelolaan helium.'],
      ['Product Requirement Document — SkyStar GeoInt GCS v2.0', 'Spesifikasi sub-lisensi 1.3a s.d. 1.3f.'],
    ], [52, 48]),
  ];

  return buildDocument({
    fileName: '5. Manual Book - Information and Reporting.docx',
    docTitle, docNo, cover, body, outDir,
  });
}

module.exports = { buildCrowdCounting, buildAodgis, buildDaep, buildIrgis };
