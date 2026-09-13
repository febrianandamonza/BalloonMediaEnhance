// ================================================================
// API Service — Frontend → Backend Communication
// ================================================================

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
export const API_BASE_MEDIA = process.env.NEXT_PUBLIC_MEDIA_API_URL || "http://localhost:8000";
/** Sama seperti API_BASE tapi skema http(s) diganti ws(s) — dipakai
    VideoDetectionPage menyambung ke /detect/ws/{job_id}. */
export const WS_BASE = API_BASE.replace(/^http/, 'ws');

/** Profil operator sebagaimana dikirim backend. Hanya medan yang
    benar-benar dibaca aplikasi yang dicantumkan. */
export interface RemoteUser {
  id: string | number;
  user_id?: string | number;
  username: string;
  full_name?: string;
  role_id?: number;
}

/** Respons GET /api/v1/auth/me. `expires_in` (detik tersisa sampai access
    token kedaluwarsa) dipakai context.tsx untuk menjadwalkan auto-logout —
    tanpa itu, sesi yang sebenarnya sudah invalid di backend akan terlihat
    tetap login sampai request berikutnya gagal dengan 401. */
export interface AuthMeResponse {
  user?: RemoteUser;
  expires_in?: number;
  [key: string]: unknown;
}

/** Payload POST /api/v1/flight-simulations — hasil simulasi GO/NO-GO
    (SimulationPage) disimpan sebagai satu baris riwayat. */
export interface CreateFlightSimulationPayload {
  simulation_name: string;
  payload_weight: number;
  helium_volume: number;
  flight_altitude: number;
  estimated_duration: number;
  wind_speed: number;
  gust_speed: number;
  visibility: number;
  rainfall: number;
  temperature: number;
  go_no_go: boolean;
  remarks: string;
}

/** Satu baris dari respons GET /api/v1/flight-simulations — riwayat hasil
    simulasi GO/NO-GO. `created_by` dipakai SimulationPage untuk menyaring
    hanya riwayat milik operator yang sedang login. */
export interface FlightSimulationRecord {
  id: string | number;
  simulation_name: string;
  payload_weight?: number;
  helium_volume?: number;
  flight_altitude?: number;
  estimated_duration?: number;
  wind_speed?: number;
  gust_speed?: number;
  visibility?: number;
  rainfall?: number;
  temperature?: number;
  go_no_go?: boolean;
  remarks?: string;
  created_by?: string | number;
  created_at?: string;
  [key: string]: unknown;
}

/** Bentuk respons GET /api/v1/dashboard/simulations — dipakai kartu
    "Misi Selesai" pada DashboardPage untuk menyaring misi ber-
    mission_status.name === 'Done' lintas semua simulasi. */
export interface DashboardMissionStatusRecord {
  id: number;
  name: string | null;
  description?: string | null;
}

export interface DashboardMediaRecord {
  id: string;
  media_type?: string;
  processing_type?: string;
  file_size?: number;
  [key: string]: unknown;
}

export interface DashboardFlightInformationRecord {
  id: string;
  mission_leader?: string | null;
  takeoff_time?: string | null;
  landing_time?: string | null;
  max_altitude?: number | string | null;
  media?: DashboardMediaRecord[];
  [key: string]: unknown;
}

export interface DashboardMissionRecord {
  id: string;
  mission_code: string;
  mission_name?: string | null;
  mission_status?: DashboardMissionStatusRecord | null;
  flight_information?: DashboardFlightInformationRecord | null;
  created_at?: string | null;
  updated_at?: string | null;
  [key: string]: unknown;
}

export interface DashboardSimulationRecord {
  id: string;
  simulation_name?: string | null;
  missions: DashboardMissionRecord[];
  created_at?: string | null;
  [key: string]: unknown;
}

// ==========================================
// TETHER CABLE MONITOR
// ==========================================
export interface TetherCableMonitorPayload {
  operating_voltage?: number | null;
  load_current?: number | null;
  insulation_resistance?: number | null;
  conductor_continuity?: string | null;
  optical_snr?: number | null;
  optical_attenuation?: number | null;
  sheath_temperature?: number | null;
  kevlar_tension?: number | null;
  description?: string | null;
}

/** Satu baris log sesi live UDP dari /api/v1/tether-cable-api — murni
    pencatatan (uid/status/waktu), bukan yang menjalankan FFmpeg. */
export interface TetherCableApiLogRecord {
  uid: string;
  status: string;
  udp_url: string;
  created_at: string;
  stopped_at: string | null;
}

export interface TetherCableMonitorRecord extends TetherCableMonitorPayload {
  id: string;
  folder_path: string | null;
  created_at: string;
  updated_at: string;
}

// ==========================================
// MOORING AVAILABILITY MONITOR
// ==========================================
export interface MooringAvailabilityMonitorPayload {
  wind_speed?: number | null;
  winch_tension?: number | null;
  helium_pressure?: number | null;
  ambient_temperature?: number | null;
  backup_battery_voltage?: number | null;
  backup_battery_percentage?: number | null;
  emergency_inverter_status?: string | null;
  lightning_protection_status?: string | null;
  optical_link_eop?: number | null;
  description?: string | null;
}

export interface MooringAvailabilityMonitorRecord extends MooringAvailabilityMonitorPayload {
  id: string;
  folder_path: string | null;
  created_at: string;
  updated_at: string;
}

/** Satu baris dari respons GET /api/v1/locations — opsi lokasi misi pada
    formulir Misi Baru (FlightInfoPage). */
export interface LocationRecord {
  id: string | number;
  name?: string;
  city?: string;
  province?: string;
  latitude?: string | number;
  longitude?: string | number;
  [key: string]: unknown;
}

/** Payload POST /api/v1/locations — dibuat otomatis saat Simpan Misi dari
    titik yang diklik pada peta pratinjau lokasi (FlightInfoPage). */
export interface CreateLocationPayload {
  name: string;
  city: string;
  province: string;
  latitude: number;
  longitude: number;
}

/** Payload POST /api/v1/notifications — dibuat lewat notify() di
    context.tsx, satu-satunya titik masuk notifikasi (lihat lib/weather.ts
    untuk salah satu sumbernya, pemantauan cuaca berkala). */
export interface CreateNotificationPayload {
  title: string;
  description: string;
  level: string;
  type: string;
  status: string;
  source: string;
  metadata?: Record<string, unknown>;
}

/** Satu baris dari respons GET /api/v1/notifications — sumber data utama
    Pusat Notifikasi/AlertsPage (lihat notificationFromRecord di
    lib/notifications.ts untuk pemetaannya ke AppNotification). */
export interface NotificationRecord {
  id: string | number;
  title?: string;
  description?: string;
  level?: string;
  type?: string;
  status?: string;
  /** Status baca — sumber kebenaran untuk read/unread (bukan `status`). */
  isRead?: boolean;
  source?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
  [key: string]: unknown;
}

/** Satu baris dari respons GET /api/v1/balloons — opsi platform balon pada
    formulir Misi Baru, dan baris tabel pada halaman Balloon Management. */
export interface BalloonRecord {
  id: string | number;
  name?: string;
  serial_number?: string;
  balloon_name?: string;
  capacity?: string | number;
  max_altitude?: string | number;
  status?: string;
  [key: string]: unknown;
}

/** Payload POST /api/v1/balloons — membuat platform balon baru dari
    halaman Balloon Management. Backend memakai `balloon_name` (bukan
    `name`) dan mengharapkan `capacity`/`max_altitude` sebagai angka. */
export interface CreateBalloonPayload {
  balloon_name: string;
  serial_number?: string;
  capacity?: number;
  max_altitude?: number;
  status?: string;
}

/** Payload PUT /api/v1/balloons/{balloon_id} — semua field opsional
    karena editor mengirim hanya yang diubah operator. */
export type UpdateBalloonPayload = Partial<CreateBalloonPayload>;

/** Satu baris dari respons GET /api/v1/operators — opsi operator penanggung
    jawab misi pada formulir Misi Baru. */
export interface OperatorRecord {
  id: string | number;
  full_name?: string;
  username?: string;
  [key: string]: unknown;
}

/** Payload POST /api/v1/flight-missions — langkah pertama simpan Misi Baru
    (FlightInfoPage); id hasilnya dipakai sebagai flight_mission_id saat
    menyimpan /flight-information. */
export interface CreateFlightMissionPayload {
  simulation_id: string | number | null;
  mission_name: string;
  mission_code: string;
  description: string;
  location_id: string | number;
  balloon_id: string | number;
  status_id: number;
}

/** Satu baris dari respons GET/POST /api/v1/flight-missions — juga sumber
    tabel Logbook Penerbangan (FlightInfoPage). GET mengembalikan relasi
    location/balloon/mission_status sebagai objek penuh TANPA id (cuma
    name/city/... untuk location, serial_number/balloon_name/... untuk
    balloon) — location_id/balloon_id datar tetap ada di sini untuk
    payload PUT/POST (CreateFlightMissionPayload), tapi saat mengirim
    ulang record hasil GET, id-nya harus dicari lewat pencocokan nama
    (location.name → /locations) / serial_number (balloon.serial_number
    → /balloons), lihat setMissionStatus di InfoPages.tsx. Status
    berjalan lewat nama: "Planned" | "Flight" | "Done" (lihat
    MISSION_STATUS_META di InfoPages.tsx) — status_id numerik cuma
    dipakai saat MENGIRIM PUT, bukan lagi field yang dibaca dari GET. */
export interface FlightMissionRecord {
  id: string | number;
  simulation_id?: string | number | null;
  mission_name?: string;
  mission_code?: string;
  description?: string;
  location_id?: string | number;
  balloon_id?: string | number;
  location?: LocationRecord | null;
  balloon?: BalloonRecord | null;
  status_id?: number;
  /** Relasi status misi — nilai name: "Planned" | "Flight" | "Done". */
  mission_status?: { id?: string | number; name?: string;[key: string]: unknown } | string;
  created_at?: string;
  [key: string]: unknown;
}

/** Respons POST /api/v1/enhance/image — dipakai ImageEnhancementPage.
    `preview_url` jadi sisi "sesudah" pada CompareSlider; field lainnya
    ditampung di state untuk dipakai lagi saat menyimpan hasil. */
export interface EnhanceImageResult {
  success: boolean;
  media_type: string;
  processing_type: string;
  temp_path: string;
  preview_url: string;
  processing_time: number;
}

/** Respons POST /api/v1/enhance/video — dipakai VideoEnhancementPage, bentuk
    responsnya sama dengan /enhance/image. */
export type EnhanceVideoResult = EnhanceImageResult;

/** Satu objek yang terdeteksi pada respons /detect/image, atau satu
    pesan WebSocket /detect/ws/{job_id}. `color` (hex, mis. "#00FF00")
    ditetapkan backend per kelas objek — dipakai VideoDetectionPage untuk
    mewarnai baris "Hasil Deteksi" sesuai kelasnya alih-alih warna baku. */
export interface DetectedObject {
  class: string;
  confidence: number;
  color?: string;
}

/** Respons POST /api/v1/detect/image — dipakai ImageDetectionPage. Sama
    dengan EnhanceImageResult ditambah daftar `objects`, ditampilkan sebagai
    "Hasil Deteksi". */
export interface DetectImageResult extends EnhanceImageResult {
  objects: DetectedObject[];
}

/** Respons POST /api/v1/detect/video — proses berjalan asinkron di
    backend; hasil per-frame diikuti lewat WebSocket /detect/ws/{job_id}
    (lihat WS_BASE), bukan lewat respons HTTP ini. */
export interface DetectVideoJobResult {
  success: boolean;
  job_id: string;
}

/** Satu pesan dari WebSocket /detect/ws/{job_id} — frame JPEG berbasis64
    (sudah dianotasi bounding box oleh backend) beserta daftar objek yang
    terdeteksi pada frame tersebut. Field penyelesaian job (temp_path/
    processing_type/dst) bersifat opsional karena hanya muncul saat job
    selesai diproses. */
export interface DetectVideoFrameMessage {
  frame?: string;
  objects?: DetectedObject[];
  /** true pada setiap pesan sesi live (UDP). */
  live?: boolean;
  elapsed_seconds?: number;
  finished?: boolean;
  /** Alasan sesi live berakhir — hanya pada pesan `finished`. */
  reason?: 'stopped' | 'source_lost';
  /** Sesi gagal dimulai (mis. sumber UDP tidak mengirim apa pun). */
  error?: string;
  success?: boolean;
  temp_path?: string;
  processing_type?: string;
  preview_url?: string;
  processing_time?: number;
  [key: string]: unknown;
}

/** Respons POST /api/v1/crowd/video — proses berjalan asinkron di
    backend; hasil per-frame diikuti lewat WebSocket /crowd/ws/{job_id}
    (lihat WS_BASE), bukan lewat respons HTTP ini. */
export interface CrowdVideoJobResult {
  success: boolean;
  job_id: string;
}

/** Ringkasan statistik sesi — hanya muncul pada pesan penyelesaian job. */
export interface CrowdVideoSummary {
  max_count: number;
  min_count: number;
  average_count: number;
  last_count: number;
  total_frames: number;
  fps: number;
}

/** Satu pesan dari WebSocket /crowd/ws/{job_id} — frame JPEG berbasis64
    (sudah dianotasi heatmap density + kotak hitung oleh backend) beserta
    estimasi jumlah orang pada frame tersebut. Field penyelesaian job
    (temp_path/processing_type/summary/dst) bersifat opsional karena hanya
    muncul saat job selesai diproses. */
export interface CrowdVideoFrameMessage {
  frame?: string;
  count?: number;
  /** null pada sesi live (UDP) — stream tidak punya jumlah frame total. */
  progress?: number | null;
  frame_number?: number;
  total_frame?: number | null;
  /** true pada setiap pesan sesi live (UDP). */
  live?: boolean;
  elapsed_seconds?: number;
  /** Alasan sesi live berakhir — hanya pada pesan `finished`. */
  reason?: 'stopped' | 'source_lost';
  /** Sesi gagal dimulai (mis. sumber UDP tidak mengirim apa pun). */
  error?: string;
  finished?: boolean;
  temp_path?: string;
  processing_type?: string;
  preview_url?: string;
  processing_time?: number;
  summary?: CrowdVideoSummary;
  [key: string]: unknown;
}

/** Payload POST /api/v1/media — menyimpan hasil /enhance/image atau
    /enhance/video secara permanen, dikaitkan ke flight mission yang dipilih. */
export interface CreateMediaPayload {
  flight_information_id: string | number;
  temp_path: string;
  processing_type: string;
}

/** Baris GET /api/v1/media — katalog Surveillance Media Source. storage_path
    dipakai membangun URL berkas (lihat API_BASE_MEDIA di GCSPage). */
export interface MediaRecord {
  id: string;
  flight_information_id: string | number;
  media_type: string;
  processing_type?: string;
  original_filename?: string;
  stored_filename?: string;
  storage_path?: string;
  mime_type?: string;
  file_size?: number;
  uploaded_at?: string;
  uploader?: { username?: string; full_name?: string; is_active?: boolean; role?: { id?: number; name?: string } | string };
  [key: string]: unknown;
}

/** Payload PUT /api/v1/flight-missions/{id} — dipakai aksi Play to Flight
    (status_id 1 → 2) dan End Flight (2 → 3) pada Logbook Penerbangan.
    Backend memvalidasi PUT ini sebagai full-replace (bukan partial), jadi
    seluruh field asli misi harus dikirim ulang bersama status_id baru —
    lihat error 422 "simulation_id: Field required" saat hanya status_id
    yang dikirim. */
export type UpdateFlightMissionPayload = CreateFlightMissionPayload;

/** Payload POST /api/v1/flight-information — langkah kedua simpan Misi Baru,
    merujuk ke flight_mission_id dari langkah pertama. */
export interface CreateFlightInformationPayload {
  mission_id: string | number;
  mission_leader: string;
  takeoff_time: string;
  landing_time: string;
  duration: number;
  max_altitude: number;
  cable_length: number;
  weather: string;
  remarks: string;
}

/** Satu baris dari respons GET /api/v1/flight-information — dipakai Logbook
    Penerbangan untuk mengisi kolom Pimpinan (mission_leader) lewat
    pencocokan mission_id, dan modal Detail Misi. */
export interface FlightInformationRecord {
  id?: string | number;
  mission_id: string | number;
  mission_leader?: string;
  takeoff_time?: string;
  landing_time?: string;
  duration?: number;
  max_altitude?: number;
  cable_length?: number;
  weather?: string;
  remarks?: string;
  [key: string]: unknown;
}

/** Payload POST /api/v1/licenses saat operator mengaktivasi lisensi baru —
    menambah baris sertifikat, bukan menandai satu id "aktif". */
export interface CreateLicenseCertificatePayload {
  license_code: string;
  license_name: string;
  description: string;
  issued_date: string;
  expired_date: string;
}

/** Satu baris sertifikat dari respons GET /api/v1/licenses. */
export interface LicenseCertificateRecord {
  id: string | number;
  license_id?: string;
  license_name: string;
  license_code: string;
  status?: string;
  issued_date: string;
  expired_date: string;
  created_at?: string;
  [key: string]: unknown;
}

/** Satu baris dari respons GET /api/v1/audit-logs. Kategori, aktor, dan
    "stasiun" dikirim sebagai objek relasi (module, user, user.role), bukan
    kolom string datar — field lama dipertahankan sebagai fallback untuk
    bentuk lain yang mungkin masih dipakai endpoint lain. */
export interface AuditLogRecord {
  id?: string | number;
  timestamp?: string;
  created_at?: string;
  ts?: string;
  module?: { name?: string;[key: string]: unknown } | string;
  user?: {
    full_name?: string;
    username?: string;
    role?: { name?: string;[key: string]: unknown } | string;
    [key: string]: unknown;
  };
  actor?: string;
  username?: string;
  station?: string;
  station_code?: string;
  category?: string;
  action?: string;
  resource?: string;
  description?: string;
  ip?: string;
  ip_address?: string;
  status?: number;
  status_code?: number;
  [key: string]: unknown;
}

/** Satu baris dari respons GET /api/v1/audit-modules — daftar modul yang
    bisa muncul sebagai `module` pada AuditLogRecord, dipakai untuk mengisi
    filter kategori di AuditLogPage alih-alih daftar tetap yang di-hardcode. */
export interface AuditModuleRecord {
  id?: string | number;
  name: string;
  [key: string]: unknown;
}

/** Record dari tabel user_licenses — sesuai respons backend. */
export interface UserLicenseRecord {
  id: string | number;
  user_license_id: string;
  license_id: string;
  status: string;
  issued_date?: string;
  expired_date?: string;
  description?: string;
  serial_number?: string;
  created_at: string;
  updated_at?: string;
  [key: string]: unknown;
}

class ApiService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  constructor() {
    // Restore tokens from localStorage on init
    if (typeof window !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.refreshToken = localStorage.getItem('refreshToken');
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${API_BASE}${endpoint}`;
    /* FormData butuh boundary yang cuma bisa di-set otomatis oleh browser —
       memaksa Content-Type: application/json di sini akan merusak body
       multipart (dipakai enhanceImage() untuk unggah berkas citra). */
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    const headers: Record<string, string> = {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      ...(options.headers as Record<string, string> || {}),
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    const response = await fetch(url, { ...options, headers });

    // Handle 401 — try to refresh token
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.tryRefreshToken();
      if (refreshed) {
        headers['Authorization'] = `Bearer ${this.accessToken}`;
        const retryResponse = await fetch(url, { ...options, headers });
        if (!retryResponse.ok) throw await this.parseError(retryResponse);
        return retryResponse.json();
      }
    }

    if (!response.ok) throw await this.parseError(response);
    return response.json();
  }

  private async parseError(response: Response) {
    try {
      const body = await response.json();
      return { status: response.status, ...body };
    } catch {
      return { status: response.status, message: response.statusText };
    }
  }

  /** Dipanggil sekali saat aplikasi dibuka untuk memvalidasi refresh token
      tersimpan terhadap backend — access token lokal bisa saja sudah
      kedaluwarsa atau dicabut server walau belum lewat expiresAt yang
      dihitung di klien. */
  async refreshSession(): Promise<boolean> {
    return this.tryRefreshToken();
  }

  /** Memanggil POST /api/v1/auth/refresh apa adanya dan mengembalikan
      body response-nya tanpa efek samping (token yang tersimpan tidak
      diubah) — dipakai untuk memeriksa/menampilkan bentuk data yang
      benar-benar dikirim balik backend. Untuk memperbarui sesi yang
      sedang berjalan, pakai refreshSession(). */
  async getAuthRefreshResult(): Promise<unknown> {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: this.refreshToken }),
    });
    return response.json();
  }

  private async tryRefreshToken(): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: this.refreshToken }),
      });
      if (!response.ok) {
        this.clearTokens();
        return false;
      }
      const data = await response.json();
      this.setTokens(data.access_token, data.refresh_token);
      return true;
    } catch {
      this.clearTokens();
      return false;
    }
  }

  setTokens(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken;
    this.refreshToken = refreshToken;
    if (typeof window !== 'undefined') {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    }
  }

  clearTokens() {
    this.accessToken = null;
    this.refreshToken = null;
    if (typeof window !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
    }
  }

  isAuthenticated() {
    return !!this.accessToken;
  }

  // ==========================================
  // AUTH ENDPOINTS
  // ==========================================
  async login(username: string, password: string) {
    const data = await this.request<{
      access_token: string;
      refresh_token: string;
      token_type: string;
      expires_in: number;
      user_id: string;
      username: string;
      full_name: string;
      role_id: number;
    }>('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: username, password: password }),
    });
    this.setTokens(data.access_token, data.refresh_token);
    return data;
  }

  async logout() {
    try {
      await this.request('/auth/logout', { method: 'POST' });
    } finally {
      this.clearTokens();
    }
  }

  async getProfile() {
    return this.request<AuthMeResponse>('/auth/me');
  }

  // ==========================================
  // USERS
  // ==========================================
  async getUsers() {
    return this.request<unknown[]>('/users');
  }
  async getUsersById(id: string) {
    return this.request<unknown[]>('/users/${id}');
  }


  async register(data: Record<string, unknown>) {
    return this.request<unknown>('/auth/register', { method: 'POST', body: JSON.stringify(data) });
  }

  async updateUser(id: string, data: Record<string, unknown>) {
    return this.request<unknown>(`/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  async deleteUser(id: string) {
    return this.request<unknown>(`/users/${id}`, { method: 'DELETE' });
  }

  // ==========================================
  // LICENSES
  // ==========================================
  /** Seluruh sertifikat: 1 Software License + 3 Module License. */
  async getLicenses() {
    return this.request<LicenseCertificateRecord[]>('/licenses');
  }
  async getLicenseById(id: string) {
    return this.request<unknown[]>('/licenses/' + id);
  }

  /** Menyimpan sertifikat hasil aktivasi operator sebagai baris baru pada
      tabel licenses — dipanggil setelah kode lisensi lolos verifikasi
      lokal (format, kecocokan lisensi, belum aktif, belum expired). */
  async createLicenseCertificate(payload: CreateLicenseCertificatePayload) {
    return this.request<unknown>('/licenses', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Mengunci kembali sertifikat beserta seluruh sub-modulnya. */
  async deactivateLicense(licenseId: string) {
    return this.request<unknown>(`/licenses/${licenseId}/deactivate`, { method: 'POST' });
  }

  async getLicenseHistory(limit = 50) {
    return this.request<unknown[]>(`/licenses/history?limit=${limit}`);
  }
  async getLicensesUser() {
    return this.request<unknown[]>('/user-licenses');
  }

  // ==========================================
  // USER LICENSES
  // ==========================================
  /**
   * Ambil semua record untuk satu user_license_id, kemudian kembalikan
   * record paling baru berdasarkan kolom `created_at`.
   */
  async getUserLicense(userLicenseId: string) {
    return this.request<UserLicenseRecord[]>(`/user-licenses/${userLicenseId}`);
  }

  // ==========================================
  // FLIGHT SIMULATIONS
  // ==========================================
  async createFlightSimulation(payload: CreateFlightSimulationPayload) {
    return this.request<unknown>('/flight-simulations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getFlightSimulations() {
    return this.request<FlightSimulationRecord[]>('/flight-simulations');
  }

  async getFlightSimulationById(id: string | number) {
    return this.request<FlightSimulationRecord>(`/flight-simulations/${id}`);
  }

  // ==========================================
  // DASHBOARD
  // ==========================================
  async getDashboardSimulations() {
    return this.request<DashboardSimulationRecord[]>('/dashboard/simulations');
  }

  // ==========================================
  // MISSION FORM OPTIONS
  // ==========================================
  async getLocations() {
    return this.request<LocationRecord[]>('/locations');
  }

  async createLocation(payload: CreateLocationPayload) {
    return this.request<LocationRecord>('/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getBalloons() {
    return this.request<BalloonRecord[]>('/balloons');
  }

  async createBalloon(payload: CreateBalloonPayload) {
    return this.request<unknown>('/balloons', { method: 'POST', body: JSON.stringify(payload) });
  }

  async updateBalloon(id: string, payload: UpdateBalloonPayload) {
    return this.request<unknown>(`/balloons/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
  }

  async createNotification(payload: CreateNotificationPayload) {
    return this.request<unknown>('/notifications', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getNotifications() {
    return this.request<NotificationRecord[]>('/notifications');
  }

  async markNotificationRead(id: string | number) {
    return this.request<unknown>(`/notifications/${id}/read`, { method: 'PATCH' });
  }

  async markAllNotificationsRead() {
    return this.request<unknown>('/notifications/read-all', { method: 'PATCH' });
  }

  async getOperators() {
    return this.request<OperatorRecord[]>('/users/operators');
  }

  // ==========================================
  // NETWORK STREAM (Live Stream — UDP/RTSP/RTMP via FFmpeg → HLS)
  // ==========================================
  async startNetworkStream(networkUrl: string) {
    return this.request<{ stream_id: string; playlist_url: string }>('/network-stream/start', {
      method: 'POST',
      body: JSON.stringify({ network_url: networkUrl }),
    });
  }

  async stopNetworkStream(streamId: string) {
    return this.request<unknown>(`/network-stream/stop/${streamId}`, { method: 'POST' });
  }

  async getNetworkStreamHealth() {
    return this.request<{ status: string; active_streams: string[] }>('/network-stream/health');
  }

  // ==========================================
  // TETHER CABLE API (log sesi live UDP — terpisah dari network-stream
  // yang menjalankan FFmpeg; endpoint ini murni mencatat)
  // ==========================================
  async startTetherCableApiLog(udpUrl: string) {
    return this.request<TetherCableApiLogRecord>('/tether-cable-api/start', {
      method: 'POST',
      body: JSON.stringify({ udp_url: udpUrl }),
    });
  }

  async stopTetherCableApiLog(uid: string) {
    return this.request<TetherCableApiLogRecord>(`/tether-cable-api/${uid}/stop`, {
      method: 'PATCH',
    });
  }

  async getTetherCableApiLogs() {
    return this.request<TetherCableApiLogRecord[]>('/tether-cable-api');
  }

  // ==========================================
  // IMAGE ENHANCEMENT
  // ==========================================
  async enhanceImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<EnhanceImageResult>('/enhance/image', {
      method: 'POST',
      body: formData,
    });
  }

  // ==========================================
  // VIDEO ENHANCEMENT
  // ==========================================
  /** denoise/contrast/sharpness — 0-100, dikirim sebagai field tambahan
      di luar file (beda dari enhanceImage yang cuma mengirim file). */
  async enhanceVideo(file: File, params: { denoise: number; contrast: number; sharpness: number; mode: 'fast' | 'quality' }) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('denoise', String(params.denoise));
    formData.append('contrast', String(params.contrast));
    formData.append('sharpness', String(params.sharpness));
    formData.append('mode', params.mode);
    return this.request<EnhanceVideoResult>('/enhance/video', {
      method: 'POST',
      body: formData,
    });
  }

  async createMedia(payload: CreateMediaPayload) {
    return this.request<unknown>('/media', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Katalog Surveillance Media Source (GCSPage). */
  async getMedia() {
    return this.request<MediaRecord[]>('/media');
  }

  // ==========================================
  // OBJECT DETECTION
  // ==========================================
  async detectImage(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<DetectImageResult>('/detect/image', {
      method: 'POST',
      body: formData,
    });
  }

  /** Memulai job deteksi video (berkas unggahan). Hasilnya cuma job_id —
      progres per-frame diikuti lewat WebSocket ke WS_BASE + /detect/ws/{job_id}. */
  async detectVideo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<DetectVideoJobResult>('/detect/video', {
      method: 'POST',
      body: formData,
    });
  }

  /** Memulai sesi deteksi objek live dari stream UDP — pola sama dengan
      startCrowdStream: sumber dibuka saat WebSocket /detect/ws/{job_id}
      tersambung, sesi diakhiri dengan {"action":"stop"}, dan hasilnya tidak
      ditulis ke disk. */
  async startDetectionStream(networkUrl: string) {
    return this.request<DetectVideoJobResult>('/detect/stream', {
      method: 'POST',
      body: JSON.stringify({ network_url: networkUrl }),
    });
  }

  /** Memulai sesi crowd counting video (berkas unggahan). Hasilnya cuma
      job_id — hitungan per-frame diikuti lewat WebSocket ke WS_BASE +
      /crowd/ws/{job_id}. */
  async detectCrowdVideo(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.request<CrowdVideoJobResult>('/crowd/video', {
      method: 'POST',
      body: formData,
    });
  }

  /** Memulai sesi crowd counting live dari stream UDP. Backend baru membuka
      sumbernya saat WebSocket /crowd/ws/{job_id} tersambung; sesi diakhiri
      dengan mengirim {"action":"stop"} lewat socket itu. Hasil sesi live
      tidak ditulis ke disk, jadi pesan `finished`-nya tanpa temp_path. */
  async startCrowdStream(networkUrl: string) {
    return this.request<CrowdVideoJobResult>('/crowd/stream', {
      method: 'POST',
      body: JSON.stringify({ network_url: networkUrl }),
    });
  }

  // ==========================================
  // FLIGHT MISSIONS
  // ==========================================
  async createFlightMission(payload: CreateFlightMissionPayload) {
    return this.request<FlightMissionRecord>('/flight-missions', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Sumber data Logbook Penerbangan (FlightInfoPage). */
  async getFlightMissions() {
    return this.request<FlightMissionRecord[]>('/flight-missions');
  }

  /** Dipakai modal Detail Misi pada GeoInt Visualisation. */
  async getFlightMissionById(id: string | number) {
    return this.request<FlightMissionRecord>(`/flight-missions/${id}`);
  }

  /** Dipakai aksi Play to Flight / End Flight untuk mengubah status_id. */
  async updateFlightMission(id: string | number, payload: UpdateFlightMissionPayload) {
    return this.request<unknown>(`/flight-missions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  }

  async createFlightInformation(payload: CreateFlightInformationPayload) {
    return this.request<unknown>('/flight-information', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  /** Dipakai Logbook Penerbangan untuk mengisi kolom Pimpinan lewat
      pencocokan mission_id. */
  async getFlightInformation() {
    return this.request<FlightInformationRecord[]>('/flight-information');
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================
  async getAuditLogs() {
    return this.request<AuditLogRecord[]>('/audit-logs');
  }

  /** Daftar modul yang bisa dipakai memfilter audit trail. */
  async getAuditModules() {
    return this.request<AuditModuleRecord[]>('/audit-modules');
  }

  // ==========================================
  // TETHER CABLE MONITOR
  // ==========================================
  async createTetherCableMonitor(payload: TetherCableMonitorPayload, file: File) {
    const formData = new FormData();
    const entries: [string, string | number | null | undefined][] = [
      ['operating_voltage', payload.operating_voltage],
      ['load_current', payload.load_current],
      ['insulation_resistance', payload.insulation_resistance],
      ['conductor_continuity', payload.conductor_continuity],
      ['optical_snr', payload.optical_snr],
      ['optical_attenuation', payload.optical_attenuation],
      ['sheath_temperature', payload.sheath_temperature],
      ['kevlar_tension', payload.kevlar_tension],
      ['description', payload.description],
    ];
    entries.forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    formData.append('image', file);
    return this.request<TetherCableMonitorRecord>('/tether-cable-monitor', {
      method: 'POST',
      body: formData,
    });
  }

  async getTetherCableMonitors() {
    return this.request<TetherCableMonitorRecord[]>('/tether-cable-monitor');
  }

  async getTetherCableMonitorById(id: string) {
    return this.request<TetherCableMonitorRecord>(`/tether-cable-monitor/${id}`);
  }

  // ==========================================
  // MOORING AVAILABILITY MONITOR
  // ==========================================
  async createMooringAvailabilityMonitor(payload: MooringAvailabilityMonitorPayload, file: File) {
    const formData = new FormData();
    const entries: [string, string | number | null | undefined][] = [
      ['wind_speed', payload.wind_speed],
      ['winch_tension', payload.winch_tension],
      ['helium_pressure', payload.helium_pressure],
      ['ambient_temperature', payload.ambient_temperature],
      ['backup_battery_voltage', payload.backup_battery_voltage],
      ['backup_battery_percentage', payload.backup_battery_percentage],
      ['emergency_inverter_status', payload.emergency_inverter_status],
      ['lightning_protection_status', payload.lightning_protection_status],
      ['optical_link_eop', payload.optical_link_eop],
      ['description', payload.description],
    ];
    entries.forEach(([key, value]) => {
      if (value !== null && value !== undefined) formData.append(key, String(value));
    });
    formData.append('image', file);
    return this.request<MooringAvailabilityMonitorRecord>('/mooring-availability-monitor', {
      method: 'POST',
      body: formData,
    });
  }

  async getMooringAvailabilityMonitors() {
    return this.request<MooringAvailabilityMonitorRecord[]>('/mooring-availability-monitor');
  }

  async getMooringAvailabilityMonitorById(id: string) {
    return this.request<MooringAvailabilityMonitorRecord>(`/mooring-availability-monitor/${id}`);
  }

  // ==========================================
  // HEALTH
  // ==========================================
  async getHealth() {
    return this.request<unknown>('/health');
  }

  async getReadiness() {
    return this.request<unknown>('/health/ready');
  }
}

// Singleton
const api = new ApiService();
export default api;
