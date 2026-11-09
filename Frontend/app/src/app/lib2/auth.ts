/* =====================================================================
   AUTHENTICATION
   ---------------------------------------------------------------------
   Seluruh kredensial diverifikasi lewat backend (/auth/login). Tidak ada
   lagi jalur akun operator lokal — bila backend tidak dapat dihubungi,
   login gagal apa adanya.
   ===================================================================== */

export interface OperatorAccount {
  /** id user pada backend — dipakai memfilter data milik user ini (mis. riwayat simulasi) */
  userId: string | number;
  username: string;
  /** Nama stasiun GCS yang dioperasikan akun ini */
  station: string;
  stationCode: string;
  fullName: string;
  role: string;
  roleCode: 'admin' | 'operator';
  initials: string;
  /** Lokasi penempatan stasiun */
  siteName: string;
  siteCoords: { lat: number; lon: number };
}
