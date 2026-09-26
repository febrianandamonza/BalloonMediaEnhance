# Product Requirement Document (PRD)
## SkyStar GeoInt — Ground Control Station (GCS) System

| Dokumen Info | Detail |
| --- | --- |
| **Judul Proyek** | SkyStar GeoInt GCS (Ground Control Station) |
| **Versi** | 2.0 (Local / Offline GCS Deploy) |
| **Status** | Approved |
| **Tanggal** | 13 Juli 2026 |
| **Target Deployment** | Localhost Laptop Gaming / Tactical GCS Workstation |
| **Kebijakan Data** | 100% Offline (Zero Cloud Data Processing) |

---

## 1. Latar Belakang & Tujuan
SkyStar GeoInt adalah sistem pengawasan taktis berbasis balon udara tertambat (tethered balloon system) yang dirancang untuk kebutuhan intelijen geografis (GeoInt), pemantauan perbatasan, penanggulangan bencana, dan pengawasan kerumunan. 

Dokumen PRD ini menetapkan spesifikasi fungsional dan teknis untuk aplikasi **Ground Control Station (GCS)** yang bertindak sebagai pusat kendali operator di lapangan. GCS ini terintegrasi langsung dengan gimbal sensor kamera **Epsilon 140Z G2** serta sensor pendukung pada balon tertambat dan sistem penambatan (mooring). 

Aplikasi ini dioptimalkan sepenuhnya untuk berjalan secara mandiri (offline) pada laptop berspesifikasi gaming tinggi atau workstation taktis lokal di lapangan, tanpa adanya ketergantungan pada jaringan internet atau infrastruktur cloud eksternal.

---

## 2. Arsitektur Sistem & Spesifikasi Perangkat Target
Untuk mendukung komputasi visual secara real-time dan analisis kecerdasan buatan (AI) lokal dengan latensi minimal, sistem GCS dirancang dengan arsitektur berikut:

### 2.1 Arsitektur Server Lokal (Containerized)
Sistem dideploy secara lokal menggunakan orkestrasi **Docker Compose** yang terdiri dari:
*   **Web Reverse Proxy**: Nginx (melakukan routing lokal, SSL lokal, enkripsi, dan rate limiting internal).
*   **Frontend**: Next.js (menyajikan antarmuka visual berbasis Glassmorphic dengan performa render tinggi).
*   **Backend API**: NestJS (menangani logika kontrol serial/IP, enkripsi data, manajemen lisensi, dan manajemen sesi).
*   **Database**: PostgreSQL 16 (menyimpan koordinat target bank, log misi, data lisensi, dan log audit).
*   **Caching & Message Broker**: Redis 7 (mendukung real-time telemetry streaming via WebSocket).
*   **AI Inference Server (Local API)**: Flask/FastAPI server yang membungkus PyTorch, CUDA, dan TensorRT secara lokal untuk mengeksekusi model deteksi YOLOv8 dan model kepadatan kerumunan CSRNet.

### 2.2 Spesifikasi Minimum Laptop Gaming / Tactical GCS
Aplikasi membutuhkan perangkat keras lokal dengan kualifikasi berikut agar pemrosesan video 1080p dan AI berjalan lancar:
*   **CPU**: Intel Core i9-13900HX / AMD Ryzen 9 7945HX (atau generasi di atasnya, min. 16 Cores / 24 Threads).
*   **GPU**: NVIDIA GeForce RTX 4080 / RTX 4090 Laptop GPU (VRAM minimal 12GB GDDR6, mendukung CUDA Core dan Tensor Core).
*   **RAM**: 32 GB atau 64 GB DDR5 Dual Channel (5200 MHz atau lebih cepat).
*   **Penyimpanan**: 2 TB NVMe PCIe Gen4 x4 SSD (kecepatan baca min. 5000 MB/s untuk log telemetri dan rekaman video mentah).
*   **Konektivitas**: 
    *   1x RJ-45 Gigabit Ethernet Port (untuk koneksi ke IP Camera / Router Radio Data Link).
    *   1x Serial Port RS-232 / USB-to-RS232 Converter (untuk kendali perintah PTZ cadangan).
*   **Sistem Operasi**: Windows 11 Pro 64-bit dengan Docker Desktop WSL2 (Ubuntu 22.04 LTS backend).

---

## 3. Spesifikasi Modul Fitur (100% Offline)

Sistem dibagi menjadi 12 sub-modul utama yang diatur berdasarkan tingkat lisensi (Base License hingga Lisensi Opsional Lanjutan):

### Modul A: Gimbal Epsilon Control & Telemetry (GCS Utama)
#### 1. Kontrol Gimbal PTZ Lokal (Pan/Tilt/Zoom)
*   **Deskripsi**: Operator dapat mengendalikan sudut pandang kamera Epsilon 140Z G2 secara real-time.
*   **Spesifikasi Teknis**:
    *   Mendukung kontrol Pan (360° continuous) dan Tilt (-35° s.d. +67°).
    *   Kontrol via antarmuka GUI (D-Pad virtual), slider kecepatan, dan integrasi joystick USB fisik (Direct Input / XInput).
    *   Komunikasi data menggunakan protokol RS-232 serial pada baudrate 57600 atau paket UDP via Ethernet (IP default kamera: `192.168.10.100`).
*   **Visual**: Dilengkapi tombol pintas arah, tombol stabilisasi giroskop (STAB), dan tombol pemosisian otomatis (STOW).

#### 2. Kontrol Sensor Ganda (EO/IR)
*   **Deskripsi**: Pemilihan stream video antara sensor siang hari (Electro-Optical) dan sensor malam hari/panas (Thermal Infrared).
*   **Spesifikasi Teknis**:
    *   **Daylight EO**: Sony FCB-EV7520 (Resolusi Full HD 1920x1080, 30x Zoom Optik, 4x Zoom Digital, FOV Vertikal 24.8° s.d. 0.8°).
    *   **Night IR**: FLIR Tau 2 (Resolusi 640x512, uncooled VOx microbolometer, frame rate 30 fps, digital zoom 4x).
    *   Perpindahan stream video lokal instan (latensi transisi < 100ms).

#### 3. Laser Range Finder (LRF) & Laser Pointer
*   **Deskripsi**: Pengukuran jarak absolut target dari balon udara dan penandaan visual taktis.
*   **Spesifikasi Teknis**:
    *   Aktivasi LRF kelas I (Eye Safe) 1.5 μm dengan jangkauan ukur s.d. 5000 meter dan akurasi <1 meter.
    *   Aktivasi Laser Pointer 830 nm (30 mW, Class IIIb) untuk penandaan target di malam hari.
    *   Integrasi otomatis nilai jarak ke dalam perhitungan koordinat geografis (GEO geolocation target).

#### 4. Overlay Telemetri Video (HUD)
*   **Deskripsi**: Overlay informasi kritis di atas tayangan video langsung (Head-Up Display).
*   **Spesifikasi Teknis**:
    *   Parameter telemetri yang ditampilkan: Sudut Pan/Tilt, tingkat zoom, Field of View (FOV) saat ini, koordinat GPS Balon (Lat, Lon, Alt), koordinat GPS target estimasi (Target Lat, Target Lon), jarak target (Range), status rekaman video, status stabilisasi video elektronis, dan jam UTC+7 aktual.

---

### Modul B: AI Video Analytics (Local CUDA Core)
#### 5. Crowd Counting / Estimasi Kepadatan (Base License)
*   **Deskripsi**: Analisis kepadatan massa pada area pengawasan untuk mitigasi risiko keamanan.
*   **Spesifikasi Teknis**:
    *   Menggunakan model deep learning lokal **CSRNet** (Density Map Estimation) yang dikonversi ke format **ONNX / TensorRT** untuk akselerasi GPU.
    *   Mampu menghitung jumlah kerumunan di area terbatas dengan tingkat kesalahan (MAE) < 8% dalam kondisi pencahayaan cukup.
    *   Menampilkan overlay warna gradasi densitas (kuning s.d. merah) di atas video feed secara real-time.
    *   Inference time lokal maks. 35ms per frame pada GPU RTX 4080 Laptop.

#### 6. Deteksi Objek Gambar Statis (Lisensi 1.1a)
*   **Deskripsi**: Analisis kecerdasan buatan pada gambar snapshot (.JPG/.PNG/.TIFF) yang diunggah secara lokal.
*   **Spesifikasi Teknis**:
    *   Menggunakan arsitektur model **YOLOv8x** lokal (100% offline, tanpa API Ultralytics Cloud).
    *   Mendeteksi kelas objek taktis: Person, Vehicle (Car, Truck, Motorcycle), Boat, Airplane, dan Building/Structure.
    *   Menampilkan bounding box, label kelas, dan tingkat confidence (kepercayaan) dalam persen.
    *   Mendukung penyesuaian threshold kepercayaan secara real-time via slider GUI.

#### 7. Deteksi Objek Video Real-Time & MTI (Lisensi 1.1b)
*   **Deskripsi**: Deteksi objek bergerak terus-menerus pada live stream RTSP dari kamera.
*   **Spesifikasi Teknis**:
    *   Integrasi model YOLOv8 dengan algoritma tracking lokal **ByteTrack** / **DeepSORT**.
    *   Mendukung Moving Target Indicator (MTI) bawaan pemroses gambar Epsilon, memfokuskan kotak deteksi pada target bergerak meskipun kamera dalam posisi panning cepat.
    *   Mendukung konfigurasi ROI (Region of Interest) berupa poligon untuk mendeteksi objek yang hanya masuk ke wilayah geofence tertentu.

#### 8. Image & Video Enhancement (Lisensi 1.2a & 1.2b)
*   **Deskripsi**: Peningkatan kualitas visual gambar diam dan stream video termal dalam kondisi buruk (kabut, minim kontras, debu).
*   **Spesifikasi Teknis**:
    *   **Fitur Citra (1.2a)**: Implementasi algoritma lokal CLAHE (Contrast Limited Adaptive Histogram Equalization) untuk meningkatkan kontras, filter Laplacian (LAP) untuk penajaman tepi (edge sharpening), dan metode filter denoising bilateral lokal.
    *   **Fitur Video (1.2b)**: Konversi sinyal termal monokromatik menjadi representasi warna semu (False Color) dengan 22+ pilihan palet (seperti *White Hot, Black Hot, Rainbow, Iron, Hot/Cold, IceFire, Sepia*, dll.) secara real-time sesuai spesifikasi teknis manual Epsilon §5.7.3.

---

### Modul C: Monitoring Kabel Tether & Mooring
#### 9. Interface Integrasi API Tether Cable (Lisensi 1.2c)
*   **Deskripsi**: Penyediaan interface data lokal (REST API dan WebSocket) untuk pertukaran data daya dan data link.
*   **Spesifikasi Teknis**:
    *   Endpoint lokal untuk membaca parameter kelistrikan kabel utama yang menyalurkan daya AC to balon.
    *   Penerimaan data mentah melalui protokol Modbus TCP / Serial RTU dari sensor monitoring daya di ground winch.

#### 10. Monitoring Capability Tether Cable (Lisensi 1.2d)
*   **Deskripsi**: Dashboard visual pemantauan kesehatan kabel penambat utama (tether cable dengan Kevlar reinforcement & serat optik).
*   **Spesifikasi Teknis**:
    *   Visualisasi tegangan operasional (target: 230VAC), arus listrik (target: ~1.8A), nilai isolasi kabel (target: >100 MΩ), kontinuitas koneksi fisik, dan tingkat redaman sinyal serat optik (SNR EOP, target: >40dB).
    *   Grafik tren real-time parameter kelistrikan kabel dalam durasi misi berjalan.

#### 11. Monitoring Availability Mooring System (Lisensi 1.3e)
*   **Deskripsi**: Pemantauan instrumen penambatan balon di darat (mooring station).
*   **Spesifikasi Teknis**:
    *   Integrasi sensor kecepatan angin anemometer (deteksi batas aman < 35 km/h).
    *   Monitoring sensor beban tegangan (Load Cell) pada winch penambat (target: dalam satuan Newton).
    *   Monitoring sensor tekanan gas Helium balon (target: 150 s.d. 180 bar).
    *   Status daya listrik darurat/inverter backup dan sistem proteksi petir (lightning rod isolation status).

---

### Modul D: Informasi Penerbangan, Peta & Pelaporan
#### 12. Peta Informasi GEO Visual & Target Bank (Lisensi 1.3b)
*   **Deskripsi**: Sistem Informasi Geografis (GIS) offline untuk visualisasi taktis.
*   **Spesifikasi Teknis**:
    *   Peta bergerak berbasis **Leaflet.js** dengan tile peta offline yang disimpan secara lokal di laptop (format MBTiles / raster DEM lokal / GeoTIFF).
    *   Menampilkan posisi balon (berdasarkan koordinat GPS internal).
    *   Menampilkan proyeksi area pandang kamera (FOV Cone) berupa poligon segitiga di atas peta berdasarkan arah Pan/Tilt dan tingkat zoom.
    *   **Target Bank**: Database koordinat target (POI) yang dikunci oleh LRF/kamera. Operator dapat menambahkan nama target, menandai tipe ancaman, dan mengekspor koordinat target ke format KML/GPX.

#### 13. Digital Reporting & Flight Info (Lisensi 1.3a, 1.3d, & 1.3f)
*   **Deskripsi**: Administrasi operasional misi, simulasi, dan pelaporan terenkripsi.
*   **Spesifikasi Teknis**:
    *   **Reporting (1.3a)**: Ekspor otomatis laporan misi operasional harian/mingguan ke format PDF dan Excel (.xlsx) dengan penambahan watermark instansi/klasifikasi rahasia. Laporan mencakup data penerbangan, grafik sensor mooring, tangkapan layar kamera, dan statistik deteksi AI.
    *   **Flight Info (1.3d)**: Logbook penerbangan otomatis mencakup waktu lepas landas (takeoff), waktu mendarat (landing), total jam terbang (flight hours), logbook tim operator, serta Checklist pra-terbang digital.
    *   **Simulation (1.3f)**: Alat simulasi skenario penerbangan (GO/NO-GO assessment) berdasarkan input perkiraan cuaca lokal, kapasitas gas Helium, kecepatan angin darat/udara, dan bobot payload.

---

## 4. Kebutuhan Non-Fungsional (NFR)
Untuk menjamin aplikasi dapat dioperasikan secara taktis di lapangan:
1.  **Zero Network Latency**: Latensi tayangan video RTSP pada penampil lokal Next.js harus di bawah 150ms dengan buffer minimal.
2.  **Robust Serial Comm**: Driver komunikasi serial untuk joystick dan modul serial kamera harus memiliki fitur auto-reconnect jika kabel USB/Serial terputus secara tidak sengaja.
3.  **Local Data Protection**: Semua file video lokal yang direkam dilindungi enkripsi AES-256 lokal pada database PostgreSQL.
4.  **UI Kontras Tinggi**: Antarmuka visual menggunakan tema gelap (cyber-dark) dengan skema warna kontras tinggi (Neon Cyan, Neon Green, Neon Amber) untuk menjamin keterbacaan layar di bawah sinar matahari langsung di lapangan.
