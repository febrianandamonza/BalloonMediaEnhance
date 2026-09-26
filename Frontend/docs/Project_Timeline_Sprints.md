# Rencana Timeline Proyek (Project Timeline & Sprint Plan)
## Pengembangan SkyStar GeoInt Ground Control Station (GCS)

Dokumen ini memuat jadwal pengerjaan proyek dalam dua skenario sprint:
1.  **Skenario 10 Sprint (10 Minggu)**: Pendekatan akselerasi untuk delivery cepat.
2.  **Skenario 12 Sprint (12 Minggu)**: Pendekatan komprehensif dengan alokasi waktu tambahan untuk pengujian hardware lapangan (Field Test), kalibrasi sensor fisik, dan perbaikan kestabilan sistem (hardening).

Setiap Sprint berdurasi **1 minggu** (5 hari kerja efektif).

---

## SKENARIO 1: TIMELINE 10 SPRINT (10 MINGGU)

### Sprint 1: Pondasi Arsitektur Lokal & Basis Data
*   **Target Utama**: Ketersediaan arsitektur sistem dasar di localhost menggunakan Docker Compose.
*   **Pekerjaan Detail**:
    *   Setup container Docker: PostgreSQL 16, Redis 7, Nginx, Next.js frontend, dan NestJS backend.
    *   Inisialisasi basis data PostgreSQL lokal menggunakan Prisma ORM.
    *   Implementasi skema tabel User, Role (RBAC), Audit Log, dan Lisensi.
    *   Pembuatan modul autentikasi operator lokal berbasis JWT Token.

### Sprint 2: Integrasi Komunikasi Hardware & Serial
*   **Target Utama**: Terjalinnya komunikasi dua arah antara software GCS dengan simulator/hardware gimbal Epsilon.
*   **Pekerjaan Detail**:
    *   Implementasi parser serial port RS-232 (baud rate 57600) untuk perintah Pan/Tilt/Zoom (PTZ).
    *   Implementasi driver UDP Ethernet untuk penerimaan data koordinat dan telemetri dasar dari gimbal.
    *   Pembuatan GUI kendali arah D-Pad virtual dan slider kecepatan rotasi gimbal.
    *   Integrasi parser input dari joystick fisik USB (menggunakan API XInput/DirectInput).

### Sprint 3: Streaming Video & Video Overlay (HUD HUD)
*   **Target Utama**: Streaming video lancar di browser Next.js dengan visual overlay HUD kritis.
*   **Pekerjaan Detail**:
    *   Konfigurasi RTSP-to-WebSockets gateway lokal (misal menggunakan node-rtsp-stream / GStreamer lokal) untuk menyalurkan stream H.264 kamera Epsilon ke Next.js.
    *   Pengujian latensi video agar tetap berada di bawah 150ms pada localhost.
    *   Pembuatan HUD Overlay di Next.js: Tampilan crosshair tengah, indikator perekaman aktif, penanda status stabilisasi, serta jam sistem UTC+7.

### Sprint 4: Kendali Sensor LRF, Laser Pointer, & Toggle EO/IR
*   **Target Utama**: Fungsionalitas penuh kendali lensa zoom optik, sensor termal, dan jangkauan laser.
*   **Pekerjaan Detail**:
    *   Implementasi kontrol peralihan cepat (toggle) antara sensor siang hari (EO - Sony 1080p) dan sensor malam hari (IR - FLIR Tau 2).
    *   Pengiriman perintah aktivasi Laser Range Finder (LRF) dan Laser Pointer via serial/UDP.
    *   Pemetaan otomatis parameter telemetri yang diterima (sudut Pan, Tilt, tingkat Zoom, nilai jarak LRF) ke sidebar telemetri utama.

### Sprint 5: Python AI Server & Estimasi Kepadatan (Crowd Counting)
*   **Target Utama**: Server AI lokal berjalan dengan akselerasi GPU CUDA untuk menghitung kepadatan kerumunan.
*   **Pekerjaan Detail**:
    *   Setup server Python FastAPI lokal yang mendeteksi tersedianya GPU NVIDIA (RTX 40-series) dan memuat pustaka PyTorch + CUDA.
    *   Deploy model kepadatan kerumunan **CSRNet** secara lokal.
    *   Implementasi pipeline transfer frame video RTSP ke server Python untuk diproses, lalu mengembalikan nilai jumlah estimasi kepala dan matriks peta panas (density map).
    *   Menampilkan overlay density map secara real-time di atas video Next.js.

### Sprint 6: Deteksi Objek YOLOv8 & Peningkatan Citra (Enhancement)
*   **Target Utama**: Berjalannya model deteksi objek taktis lokal dan fitur peningkatan kualitas citra (false color termal).
*   **Pekerjaan Detail**:
    *   Integrasi model **YOLOv8x** lokal (100% offline) untuk mendeteksi manusia, kendaraan, dan bangunan taktis.
    *   Implementasi pengolahan citra lokal: filter CLAHE untuk kontras buruk, penajaman tepi Laplacian (LAP), dan bilateral denoising (Lisensi 1.2a).
    *   Implementasi 22+ pilihan palet False Color untuk video termal IR (White Hot, Black Hot, Rainbow, Iron, dll.) sesuai manual Epsilon §5.7.3 (Lisensi 1.2b).

### Sprint 7: Peta Bergerak Offline (GIS) & Target Bank
*   **Target Utama**: Visualisasi geospasial balon dan target pada peta Leaflet tanpa internet.
*   **Pekerjaan Detail**:
    *   Setup server peta tile lokal menggunakan file MBTiles (Cached OpenStreetMap / raster citra satelit area pengujian).
    *   Visualisasi posisi GPS Balon dan proyeksi segitiga area pandang kamera (FOV Cone) di atas peta.
    *   Pengembangan modul Target Bank: Database koordinat POI yang ditandai dari hasil jepretan LRF, lengkap dengan fitur ekspor data koordinat ke format KML/GPX.

### Sprint 8: Monitoring Tether Cable & Mooring System
*   **Target Utama**: Dashboard visual lengkap untuk memantau keselamatan balon dan winch darat.
*   **Pekerjaan Detail**:
    *   Implementasi pembacaan data sensor dari ground station via Modbus TCP (parameter kelistrikan, daya, angin, helium).
    *   Pembuatan dashboard monitoring Tether Cable (Tegangan AC 230V, arus, isolasi kabel, SNR optik).
    *   Pembuatan dashboard monitoring Mooring System (kecepatan anemometer, tegangan beban winch dalam Newton, level Helium balon 150-180 bar).

### Sprint 9: Sistem Pelaporan, Logbook Penerbangan & Simulator
*   **Target Utama**: Otomatisasi berkas pelaporan digital, pencatatan misi, dan kalkulator simulator terbang.
*   **Pekerjaan Detail**:
    *   Implementasi generator laporan lokal (NestJS + PDFKit / ExcelJS) untuk mengekspor data misi, grafik sensor mooring, tangkapan layar kamera, dan data AI ke file PDF/Excel ber-watermark keamanan.
    *   Pembuatan modul Logbook Penerbangan digital (Takeoff/Landing time, flight hours, operator logs, digital pre-flight checklist).
    *   Pembuatan Flight Simulator kalkulator GO/NO-GO assessment berdasarkan variabel cuaca, kecepatan angin, dan status helium.

### Sprint 10: Integrasi Akhir, Stress Testing, & Serah Terima
*   **Target Utama**: Handover sistem GCS lokal yang stabil, teruji offline, dan bersih dari jejak AI.
*   **Pekerjaan Detail**:
    *   Stress-testing aplikasi secara terus-menerus selama minimal 6 jam di laptop gaming target untuk memastikan ketiadaan memory leaks.
    *   Uji coba pencabutan total koneksi internet pada laptop gaming untuk memverifikasi fungsionalitas peta offline, database lokal, dan inferensi AI berjalan normal.
    *   Pembersihan akhir kode sumber dari file-file log developer, folder cache, dan penanda AI.
    *   Penyusunan panduan instalasi dan manual penggunaan untuk operator lapangan.

---

## SKENARIO 2: TIMELINE 12 SPRINT (12 MINGGU)

Skenario 12 Sprint memberikan alokasi waktu tambahan pada fase integrasi hardware fisik di lapangan, optimalisasi kecepatan inferensi AI menggunakan NVIDIA TensorRT, serta fase hardening sistem (bug-fixing dan stabilisasi latensi).

### Sprint 1: Setup Docker Compose & Basis Data Lokal (Prisma)
*   **Pekerjaan**: Konstruksi container Docker lokal (Postgres, Redis, Nginx, Next.js, NestJS), instalasi Prisma ORM lokal, setup database skystar_geoint, dan sistem keamanan RBAC lokal.

### Sprint 2: Integrasi Komunikasi Protokol Serial RS-232 & UDP
*   **Pekerjaan**: Penulisan driver parser serial komunikasi dua arah untuk kontrol gimbal Epsilon. Setup simulator data telemetri serial untuk mempermudah testing backend.

### Sprint 3: Kontrol Navigasi Gimbal & Integrasi Joystick Fisik
*   **Pekerjaan**: Pembuatan GUI D-Pad kontrol arah gimbal, pengujian slider kecepatan respon motor penggerak gimbal, dan integrasi input controller joystick USB fisik (Gamepad) dengan fitur auto-reconnect.

### Sprint 4: Streaming Video RTSP Rendah Latensi & HUD Overlay
*   **Pekerjaan**: Konfigurasi RTSP-to-WebSockets lokal. Optimasi decoder video H.264 di sisi client untuk meminimalkan rendering latency (< 150ms). Pembuatan HUD Overlay Next.js di atas video feed.

### Sprint 5: Telemetri LRF, Laser Pointer & Toggle EO/IR
*   **Pekerjaan**: Pengintegrasian fungsionalitas Laser Range Finder dan Laser Pointer. Sinkronisasi data jarak LRF untuk modul kalkulasi koordinat target. Uji coba perpindahan sensor EO/IR.

### Sprint 6: Python AI Server & Akselerasi GPU CUDA (CSRNet)
*   **Pekerjaan**: Instalan CUDA Toolkit dan cuDNN lokal di laptop gaming target. Setup Python FastAPI server. Implementasi model Crowd Counting CSRNet lokal untuk density map estimation.

### Sprint 7: Deteksi Objek YOLOv8 (Gambar Statis & Video MTI)
*   **Pekerjaan**: Integrasi YOLOv8 lokal untuk deteksi gambar snapshot (1.1a) dan video real-time dengan ByteTrack tracking (1.1b). Konfigurasi ROI poligon geofence untuk membatasi wilayah deteksi.

### Sprint 8: Optimalisasi AI TensorRT & Image/Video Enhancement
*   **Pekerjaan**: Konversi model PyTorch YOLOv8 dan CSRNet ke format **NVIDIA TensorRT (.engine)** untuk meminimalkan inference time (< 30ms per frame). Pengembangan fitur CLAHE, filter LAP, dan 22+ False Color palettes termal.

### Sprint 9: Offline GIS Map, FOV Cone & Target Bank Database
*   **Pekerjaan**: Integrasi Leaflet.js dengan folder penyimpanan peta lokal (.mbtiles). Implementasi penggambaran area jangkauan kamera (FOV Cone) secara dinamis. Pembuatan sistem database Target Bank.

### Sprint 10: Integrasi Monitoring Kabel Tether & Instrumen Mooring
*   **Pekerjaan**: Implementasi pembacaan data kelistrikan kabel penambat (AC 230V, SNR optik) via Modbus TCP. Pembuatan dashboard keselamatan Mooring (anemometer angin, beban winch Newton, tekanan Helium bar).

### Sprint 11: Digital Reporting, Flight Logbook & Simulator GO/NO-GO
*   **Pekerjaan**: Pembuatan PDF/Excel generator ber-watermark lokal untuk laporan misi. Pembuatan modul Logbook Penerbangan digital, checklist pra-terbang, dan kalkulator simulasi penerbangan.

### Sprint 12: Pengujian Lapangan Bersama Hardware Fisik & Hardening
*   **Pekerjaan**: 
    *   Pengujian sistem secara offline total bersama hardware balon udara tertambat dan gimbal kamera Epsilon fisik di lapangan (Field Test).
    *   Kalibrasi data GPS, sudut giroskop gimbal, dan akurasi LRF pada kondisi nyata.
    *   Stress-test performa GPU & CPU laptop gaming selama operasi terus-menerus.
    *   Bug hardening, pembersihan akhir repositori dari metadata AI, dan serah terima (handover) deliverables.
