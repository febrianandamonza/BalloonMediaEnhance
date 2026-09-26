# Kerangka Acuan Kerja (KAK) & Scope of Works (SOW)
## Pengembangan & Implementasi SkyStar GeoInt Ground Control Station (GCS)

---

## 1. PENDAHULUAN
### 1.1 Latar Belakang
Penggunaan sistem balon udara tertambat (tethered balloon system) untuk misi pengawasan area luas (wide-area surveillance) membutuhkan sistem kontrol darat atau Ground Control Station (GCS) yang andal. GCS berfungsi sebagai pusat penerima data sensor, kendali muatan (payload gimbal kamera Epsilon 140Z G2), dan visualisasi peta taktis.

Dalam operasi militer, pengamanan perbatasan, serta penanggulangan bencana, ketersediaan jaringan internet sering kali sangat terbatas atau bahkan tidak ada sama sekali. Oleh karena itu, diperlukan pengembangan perangkat lunak GCS yang **berorientasi 100% offline** (local deployment) yang dipasang pada laptop gaming spesifikasi tinggi/workstation taktis. Sistem ini mengolah seluruh streaming video HD, data telemetri serial, visualisasi geografis (GIS), serta analisis AI berbasis visi komputer secara langsung menggunakan akselerasi perangkat keras lokal (NVIDIA CUDA) tanpa mengirimkan data apa pun ke jaringan cloud luar.

### 1.2 Maksud dan Tujuan
*   **Maksud**: Menjadi acuan pelaksanaan kerja bagi tim pengembang dalam membangun, mengintegrasikan, dan mendepoliasikan sistem GCS taktis lokal yang bersih dan terdokumentasi dengan baik.
*   **Tujuan**: 
    1.  Membangun aplikasi GCS berbasis web modern (Next.js & NestJS) yang dijalankan menggunakan Docker Compose secara lokal.
    2.  Mengintegrasikan kendali penuh (Pan, Tilt, Zoom, LRF) kamera gimbal Epsilon 140Z G2 secara real-time via IP/UDP dan RS-232 serial.
    3.  Mengimplementasikan model kecerdasan buatan lokal untuk Crowd Counting (CSRNet) dan Object Detection (YOLOv8) dengan performa tinggi berbasis akselerasi CUDA.
    4.  Membangun modul pemantauan real-time untuk parameter Mooring (sistem penambat) dan Tether Cable (kabel daya/serat optik).
    5.  Menyediakan peta taktis offline untuk visualisasi posisi balon udara, koordinat target, dan jangkauan kamera (FOV cone).

---

## 2. RUANG LINGKUP PEKERJAAN (SCOPE OF WORKS)
Pekerjaan pengembangan dan implementasi sistem ini mencakup beberapa fase kerja terperinci sebagai berikut:

### 2.1 Fase 1: Konfigurasi Lingkungan Lokal & Basis Data
1.  **Orkestrasi Docker Compose**: Menyiapkan file konfigurasi multi-container yang membungkus database PostgreSQL 16, cache Redis 7, reverse proxy Nginx, layanan frontend Next.js, dan layanan backend NestJS.
2.  **Skema Basis Data (Prisma ORM)**: Menginisialisasi skema basis data PostgreSQL taktis lokal untuk mengelola:
    *   Autentikasi operator lokal (Role-Based Access Control / RBAC).
    *   Penyimpanan log misi penerbangan (Flight Logs & Mission Database).
    *   Target Bank (kumpulan koordinat POI yang di-tag oleh operator).
    *   Log audit aktivitas operator untuk kebutuhan investigasi internal (Audit Logs).
    *   Konfigurasi lisensi modul (License Modules).

### 2.2 Fase 2: Integrasi Komunikasi Hardware & Serial
1.  **Protokol Kontrol Epsilon**: Mengembangkan driver/modul parser protokol komunikasi serial RS-232 (baud rate 57600) dan Ethernet UDP untuk mengirimkan perintah kendali gimbal (Pan, Tilt, Zoom, Laser Range Finder, Laser Pointer) sesuai panduan instruksi manual Epsilon.
2.  **Streaming Video RTSP Rendah Latensi**: Konfigurasi penampil video pada frontend Next.js untuk menerima dan mendekode stream digital H.264 video dari Epsilon 140Z G2 (IP default `192.168.10.100` port `15004`) secara lokal dengan latensi < 150ms.
3.  **Integrasi Hardware Controller (Joystick)**: Menyediakan interface parser input joystick fisik USB (DirectInput/XInput) untuk menggantikan kendali navigasi D-Pad pada layar komputer.

### 2.3 Fase 3: Pengembangan UI/UX Dashboard Taktis (Frontend)
1.  **Antarmuka Ground Control Station**: Membangun tampilan utama GCS bergaya Glassmorphism gelap dengan kontras warna neon tinggi untuk visibilitas lapangan, menampilkan:
    *   Video Player dengan visual overlay HUD (Overlay Telemetri, Crosshair, Penanda LRF, Indikator Rekaman).
    *   Sidebar Telemetri Real-Time (Nilai Pan, Tilt, Zoom, FOV, LRF Range, Posisi Koordinat).
    *   Gimbal Controller D-pad virtual dan Slider Zoom analog.
2.  **Sistem Gerbang Lisensi Modular (LicenseGate)**: Implementasi validasi lisensi lokal berbasis kode enkripsi hardware laptop (CPU/Motherboard UUID). Fitur-fitur lanjutan (seperti deteksi video real-time dan analisis false color termal) akan otomatis terkunci/terbuka berdasarkan file lisensi lokal.

### 2.4 Fase 4: Analisis Visi Komputer & AI Lokal (CUDA Accelerated)
1.  **Inference Server Lokal**: Membangun server API Python ringan menggunakan FastAPI/Flask yang berjalan di localhost untuk menjembatani kode AI berbasis PyTorch/OpenCV dengan NestJS backend.
2.  **Crowd Counting (Base License)**: Integrasi model CSRNet untuk mengestimasi kepadatan massa pada area target pengawasan. Output berupa nilai jumlah estimasi kepala dan overlay peta panas (density map) yang diproyeksikan langsung ke video stream Next.js.
3.  **Deteksi Objek Taktis**:
    *   **Gambar Statis (1.1a)**: Parser file gambar lokal untuk menjalankan YOLOv8x lokal (bounding box kendaraan, manusia, bangunan taktis).
    *   **Video Real-Time & MTI (1.1b)**: Optimasi pelacakan YOLOv8 + ByteTrack untuk mendeteksi target bergerak pada streaming video secara langsung dengan akurasi tinggi.
4.  **Optimalisasi CUDA**: Melakukan konfigurasi pustaka CUDA, cuDNN, dan konversi model ke format TensorRT (.engine) agar inference speed model AI berjalan di bawah 30-35ms per frame di GPU laptop gaming RTX 40-series.

### 2.5 Fase 5: Integrasi Pemantauan Kabel & Penambatan (Mooring)
1.  **API Kabel Tether (1.2c)**: Pembuatan interface Modbus/Serial untuk membaca status kelistrikan ground station.
2.  **Tether Cable Monitor (1.2d)**: Dashboard visual pemantauan kesehatan kabel penambat (tegangan daya AC 230V, arus 1.8A, ketahanan isolasi 125 MΩ, dan SNR transmisi serat optik).
3.  **Mooring Availability Monitor (1.3e)**: Visualisasi dashboard real-time untuk parameter keselamatan mooring station: Kecepatan & arah angin anemometer, beban tegangan Winch (dalam Newton), tekanan gas Helium balon (150-180 bar), proteksi sambaran petir, dan ketersediaan catu daya cadangan (Inverter).

### 2.6 Fase 6: Peta Bergerak (Moving Map) & Pelaporan Digital
1.  **Offline GIS Map Visualization (1.3b)**: Integrasi pustaka Leaflet.js dengan cache tile server lokal. Peta taktis harus dapat dirender dengan detail (jalan, kontur topografi DEM, batas wilayah) tanpa memerlukan koneksi internet.
2.  **Overlay FOV Cone**: Menampilkan segitiga jangkauan pandangan kamera secara dinamis di atas peta berdasarkan derajat Pan/Tilt gimbal dan tingkat zoom lensa.
3.  **Target Bank**: Sinkronisasi database lokal untuk mencatat koordinat hasil pengukuran LRF (Target Latitude, Longitude, Altitude, Timestamp, Deskripsi Target).
4.  **Reporting (1.3a)**: Implementasi pembuat laporan otomatis lokal berbasis PDFKit / ExcelJS yang menghasilkan dokumen laporan terstruktur dengan watermark klasifikasi keamanan.
5.  **Flight Simulation (1.3f)**: Pembuatan kalkulator kelayakan terbang (GO/NO-GO) berdasarkan batas parameter hembusan angin, tekanan gas helium balon, dan beban payload sensor.

---

## 3. DELIVERABLES (HASIL PEKERJAAN)
Di akhir proyek, tim pengembang harus menyerahkan hasil pekerjaan sebagai berikut:

| No | Deliverable | Format / Media | Deskripsi |
| --- | --- | --- | --- |
| 1 | **Source Code Repositori Bersih** | Repositori Git (GitLab/GitHub) | Folder proyek lengkap Next.js frontend, NestJS backend, Nginx proxy, dan FastAPI Python AI server tanpa file log developer atau cache rule AI. |
| 2 | **Docker Compose Setup Script** | File `docker-compose.yml` & `.env` | File konfigurasi siap pakai untuk menjalankan seluruh servis dalam 1 perintah (`docker-compose up`). |
| 3 | **Model AI Taktis Teroptimasi** | File `.onnx` / `.engine` | File bobot model YOLOv8 dan CSRNet yang telah dioptimasi untuk berjalan di GPU NVIDIA RTX Laptop lokal. |
| 4 | **Offline Tile Maps Sample** | Folder Data Peta Lokal | Sampel data peta offline (MBTiles) untuk visualisasi geospasial lokal di area pengujian lapangan. |
| 5 | **Dokumentasi Teknis Lengkap** | File Markdown / PDF | Buku Panduan Instalasi Lokal (Installation Guide), Buku Manual Operator GCS (User Manual), dan Skema Integrasi API Hardware. |

---

## 4. JAMINAN KUALITAS & PENGUJIAN (QA & TESTING)
Pengujian sistem wajib dilakukan secara offline total untuk memvalidasi performa di lapangan:
1.  **Pengujian Latensi**: Latensi pipeline video RTSP dari hardware simulator ke UI Next.js diuji tidak boleh melebihi 150ms.
2.  **Inference Speed Test**: Menjalankan YOLOv8 dan CSRNet secara bersamaan pada laptop gaming target untuk memvalidasi FPS video tetap di atas 24 FPS (inference time di bawah 40ms per frame).
3.  **Stress Test Durasi**: Aplikasi dijalankan terus-menerus selama minimal 6 jam dengan koneksi simulasi serial dan video untuk memastikan stabilitas RAM dan ketiadaan kebocoran memori (memory leaks) pada backend NestJS dan Python AI Server.
4.  **Offline Verification**: Mencabut koneksi Wi-Fi/LAN internet laptop sepenuhnya dan mematikan data seluler, lalu memverifikasi seluruh fungsi peta taktis, database, AI, dan PDF generator tetap berjalan 100% normal.
