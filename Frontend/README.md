# Tethered Balloon GeoInt — Ground Control Station

Perangkat lunak Ground Control Station (GCS) taktis untuk mengendalikan, memantau, dan menganalisis sistem pengawasan berbasis balon udara tertambat. Terintegrasi langsung dengan muatan gimbal sensor ganda **Epsilon 140Z G2**, sistem penambat darat (mooring), dan kabel penambat daya utama.

Dirancang dengan prinsip **100% Offline (Zero Cloud Data Processing)** — seluruh inferensi AI, penyimpanan rekaman, dan penyusunan laporan berlangsung pada workstation taktis di lapangan.

---

## 1. Akun Stasiun

Dua stasiun GCS terdaftar. Kredensial berlaku baik saat backend aktif maupun saat GCS berjalan mandiri tanpa layanan pendukung.

| Username | Password | Stasiun | Lokasi |
| --- | --- | --- | --- |
| `gcs1` | `admin123` | Ground Control Station 1 | Jakarta Surveillance Post Alpha |
| `gcs2` | `admin123` | Ground Control Station 2 | Bandung Surveillance Post Bravo |

---

## 2. Struktur Lisensi

Empat sertifikat diterbitkan **TAB Integrated Systems Pte Ltd** kepada **Badan Intelijen Negara** — satu Commercial Software License dan tiga Module License. Setiap sertifikat terbit dalam dua unit nomor seri (satu per stasiun); keduanya sah dipakai pada kedua stasiun.

| Sertifikat | Lisensi | License Number | Sub-modul |
| --- | --- | --- | --- |
| Commercial Software License | Crowd Counting | `TAB-CC-2026-001-A8F4K2`<br>`TAB-CC-2026-002-B7M9X5` | `CC-01` |
| Module License | Analytic and Object Detection Tethered Balloon Geospatial Intelligence System | `TAB-AODGIS-2026-003-C3L8P6`<br>`TAB-AODGIS-2026-004-D5Q7W1` | `1.1a`, `1.1b` |
| Module License | Digital Analytic Enhancement Processing System Module | `TAB-DAEP-2026-005-E9R4T8`<br>`TAB-DAEP-2026-006-F2N6Y7` | `1.2a` – `1.2d` |
| Module License | Information and Reporting Tethered Balloon Geospatial Intelligence System Module | `TAB-IRGIS-2026-007-G5V8K3`<br>`TAB-IRGIS-2026-008-H7M2Z9` | `1.3a` – `1.3f` |

Masa berlaku seluruh sertifikat: **20 Juli 2026 s.d. 31 Desember 2027**.

Aktivasi dilakukan melalui menu **Administration → License Manager** dengan memasukkan License Number yang tercetak pada sertifikat. Mengaktifkan satu sertifikat membuka seluruh sub-modul di bawahnya; menonaktifkannya mengunci kembali seluruhnya. Katalog dan logika validasi berada di [`app/src/app/lib/licensing.ts`](app/src/app/lib/licensing.ts).

---

## 3. Peta Menu

| Kelompok | Menu | Kode | Lisensi Penaung |
| --- | --- | --- | --- |
| Command Center | Mission Dashboard | — | Platform |
| Command Center | Surveillance Media | — | Platform |
| Crowd Counting | Crowd Counting | `CC-01` | Crowd Counting |
| Analytic & Object Detection | Imaging Analytic | `1.1a` | AODGIS |
| Analytic & Object Detection | Video Analytic | `1.1b` | AODGIS |
| Enhancement Processing | Imaging Enhancement | `1.2a` | DAEP |
| Enhancement Processing | Video Enhancement | `1.2b` | DAEP |
| Enhancement Processing | Tether Cable API | `1.2c` | DAEP |
| Enhancement Processing | Tether Cable Monitor | `1.2d` | DAEP |
| Information & Reporting | Digital Reporting | `1.3a` | IRGIS |
| Information & Reporting | GeoInt Visualisation | `1.3b` | IRGIS |
| Information & Reporting | Smart Notification | `1.3c` | IRGIS |
| Information & Reporting | Flight Information | `1.3d` | IRGIS |
| Information & Reporting | Mooring Availability | `1.3e` | IRGIS |
| Information & Reporting | Flight Simulation | `1.3f` | IRGIS |
| Administration | License Manager · User Management · Audit Trail · System Settings | — | Platform |

---

## 4. Arsitektur

| Komponen | Teknologi | Peran |
| --- | --- | --- |
| Frontend | Next.js 16 · React 19 · Three.js | Antarmuka operator taktis, visualisasi 3D, HUD telemetri. |
| Backend API | NestJS · Prisma | Kendali serial/IP gimbal, manajemen lisensi, audit trail. |
| Database | PostgreSQL 16 | Log misi, target bank, data lisensi, audit log. |
| Cache & Broker | Redis 7 | Telemetri real-time via WebSocket. |
| Reverse Proxy | Nginx | Routing lokal, TLS internal, rate limiting. |
| AI Inference | FastAPI · PyTorch · CUDA · TensorRT | YOLOv8x (deteksi objek), CSRNet (kepadatan massa). |

Frontend dapat berjalan mandiri tanpa backend: verifikasi kredensial dan status lisensi jatuh ke penyimpanan lokal stasiun, sehingga GCS tetap dapat dioperasikan di lapangan.

---

## 5. Struktur Proyek

```text
skystar-gcs/
├── app/                      # Frontend Next.js
│   └── src/app/
│       ├── components/       # Shell, sidebar, header, primitif UI, adegan 3D
│       ├── lib/              # Katalog lisensi + verifikasi operator lokal
│       ├── pages/            # Halaman per menu
│       │   └── modules/      # Halaman sub-modul berlisensi
│       ├── services/         # Klien API & WebSocket
│       ├── globals.css       # Sistem desain dasar
│       └── premium.css       # Lapisan komponen (sidebar, kartu lisensi, uploader)
├── backend/                  # Backend NestJS + Prisma
├── docs/                     # PRD, KAK/SOW, timeline, manual perangkat, tangkapan layar
├── output/                   # 5 dokumen keluaran (.docx)
├── tools/docs-generator/     # Pembangkit dokumen & penangkap tangkapan layar
├── nginx/                    # Konfigurasi reverse proxy
└── docker-compose.yml
```

---

## 6. Prasyarat

| Komponen | Spesifikasi Minimum |
| --- | --- |
| CPU | Intel Core i9-13900HX / AMD Ryzen 9 7945HX (16 inti / 24 utas) |
| GPU | NVIDIA RTX 4080 Laptop, VRAM ≥ 12 GB, dukungan CUDA |
| RAM | 32 GB DDR5 (64 GB disarankan) |
| Penyimpanan | 2 TB NVMe PCIe Gen4 |
| OS | Windows 11 Pro + WSL2, atau Ubuntu 22.04 LTS |
| Konektivitas | RJ-45 Gigabit Ethernet · RS-232 / USB-to-RS232 |

---

## 7. Menjalankan Aplikasi

### Opsi A — Docker Compose (direkomendasikan)

```bash
docker-compose up --build
```

| Layanan | Alamat |
| --- | --- |
| Antarmuka GCS | `http://localhost:3000` |
| Backend API | `http://localhost:4000/api/v1` |
| Dokumentasi API | `http://localhost:4000/docs` |

### Opsi B — Manual (pengembangan)

```bash
# 1. Basis data & cache
docker-compose up postgres redis -d

# 2. Backend
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# 3. Frontend
cd ../app
npm install
npm run dev
```

Frontend saja (tanpa backend) cukup dengan langkah 3 — aplikasi otomatis memakai verifikasi operator lokal.

---

## 8. Dokumen Keluaran

Folder [`output/`](output/) memuat lima dokumen `.docx` yang dapat disunting:

1. **Ringkasan Sistem dan Tampilan Antarmuka** — penjelasan singkat dan tangkapan layar setiap menu.
2. **Manual Book — Crowd Counting**
3. **Manual Book — Analytic and Object Detection**
4. **Manual Book — Digital Analytic Enhancement Processing**
5. **Manual Book — Information and Reporting**

Dokumen disusun ulang melalui [`tools/docs-generator`](tools/docs-generator/README.md).

---

## 9. Penyebaran

Push ke cabang `master` memicu alur kerja [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) yang membangun ulang frontend di VPS dan memuat ulang proses PM2 `skystar-balon` pada port 3001, dilanjutkan pemeriksaan kesehatan otomatis.

Secret repositori yang diperlukan: `VPS_HOST` dan `VPS_PASSWORD`.

---

## 10. Lisensi dan Hak Cipta

Hak cipta perangkat lunak ini diatur oleh kontrak perjanjian pengerjaan. Lisensi bersifat non-transferable. Dilarang mendistribusikan ulang atau menyalin kode tanpa izin tertulis dari pemilik lisensi.
