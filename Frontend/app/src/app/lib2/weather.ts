/* =====================================================================
   PEMANTAUAN CUACA — Open-Meteo
   ---------------------------------------------------------------------
   Helper murni (tanpa React) untuk memeriksa cuaca di lokasi misi yang
   sedang Flight, dipakai oleh loop pemantauan berkala di context.tsx.
   ===================================================================== */

export const WEATHER_POLL_INTERVAL_MS = 5 * 60_000;

export interface OpenMeteoCurrent {
  time: string;
  temperature_2m: number;
  relative_humidity_2m: number;
  rain: number;
  snowfall: number;
  weather_code: number;
  wind_speed_10m: number;
  cloud_cover: number;
  [key: string]: unknown;
}

export interface OpenMeteoResponse {
  current: OpenMeteoCurrent;
  [key: string]: unknown;
}

export async function fetchCurrentWeather(lat: number, lon: number): Promise<OpenMeteoResponse> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,rain,snowfall,weather_code,wind_speed_10m,cloud_cover` +
    `&timezone=auto`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Open-Meteo request failed: ${res.status}`);
  return res.json();
}

/** Kode cuaca WMO (dipakai Open-Meteo) → deskripsi ringkas Bahasa Indonesia. */
const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'cerah',
  1: 'cerah berawan sebagian',
  2: 'berawan sebagian',
  3: 'mendung',
  45: 'berkabut',
  48: 'berkabut beku',
  51: 'gerimis ringan',
  53: 'gerimis sedang',
  55: 'gerimis lebat',
  56: 'gerimis beku ringan',
  57: 'gerimis beku lebat',
  61: 'hujan ringan',
  63: 'hujan sedang',
  65: 'hujan lebat',
  66: 'hujan beku ringan',
  67: 'hujan beku lebat',
  71: 'salju ringan',
  73: 'salju sedang',
  75: 'salju lebat',
  77: 'butiran salju',
  80: 'hujan lokal ringan',
  81: 'hujan lokal sedang',
  82: 'hujan lokal lebat',
  85: 'hujan salju lokal ringan',
  86: 'hujan salju lokal lebat',
  95: 'badai petir',
  96: 'badai petir disertai hujan es ringan',
  99: 'badai petir disertai hujan es lebat',
};

export function describeWeatherCode(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? 'kondisi tidak diketahui';
}

const FOG_OR_LIGHT_RAIN_CODES = new Set([45, 48, 51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82]);

/** Ambang batas berorientasi keselamatan balon tertambat — angin jadi
    faktor utama, karena paling berisiko terhadap tether/platform. */
export function deriveWeatherLevel(c: OpenMeteoCurrent): 'informasi' | 'peringatan' | 'kritis' {
  if (c.weather_code >= 95 || c.wind_speed_10m >= 40 || c.snowfall > 0 || c.rain >= 10) {
    return 'kritis';
  }
  if (c.wind_speed_10m >= 20 || c.rain >= 1 || c.cloud_cover >= 90 || FOG_OR_LIGHT_RAIN_CODES.has(c.weather_code)) {
    return 'peringatan';
  }
  return 'informasi';
}

export function buildWeatherSentence(c: OpenMeteoCurrent, missionName: string): string {
  const jam = new Date(c.time).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
  const snowClause = c.snowfall > 0 ? `, salju ${c.snowfall} cm` : '';
  return `Cuaca di lokasi misi ${missionName} jam ${jam}: ${describeWeatherCode(c.weather_code)}, ` +
    `suhu ${c.temperature_2m}°C, kelembapan ${c.relative_humidity_2m}%, angin ${c.wind_speed_10m} km/h, ` +
    `tutupan awan ${c.cloud_cover}%, curah hujan ${c.rain} mm${snowClause}.`;
}

export function buildWeatherTitle(date: Date): string {
  return `Cuaca ${date.toLocaleDateString('id-ID')} ${date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}
