/* =====================================================================
   GEODESI & KATALOG BASEMAP
   ---------------------------------------------------------------------
   Berkas ini sengaja bebas dari Leaflet maupun API peramban, sehingga
   aman diimpor oleh komponen mana pun — termasuk saat halaman dirakit
   di server. Komponen peta yang benar-benar menyentuh objek window
   berada terpisah di components/EsriMap.tsx.
   ===================================================================== */

export type BasemapId = 'imagery' | 'streets' | 'topo' | 'darkgray' | 'offline';

export interface BasemapDef {
  id: BasemapId;
  label: string;
  note: string;
  /** Contoh warna untuk kotak kecil pada pemilih lapisan */
  chip: string;
  url?: string;
  /** Lapisan label kota/jalan yang ditumpuk di atas citra */
  reference?: string;
  maxZoom: number;
  attribution: string;
}

const ESRI_HOST = 'https://server.arcgisonline.com/ArcGIS/rest/services';

/* Layanan ubin publik ArcGIS Online. Basemap ini yang diminta dipakai
   sebagai peta dasar; bila stasiun dioperasikan tertutup, komponen peta
   berpindah sendiri ke entri 'offline' di bawah. */
export const BASEMAPS: BasemapDef[] = [
  {
    id: 'imagery',
    label: 'Esri World Imagery',
    note: 'Citra satelit resolusi tinggi',
    chip: 'linear-gradient(135deg,#2f4f34,#6b7f52 55%,#8d8264)',
    url: `${ESRI_HOST}/World_Imagery/MapServer/tile/{z}/{y}/{x}`,
    reference: `${ESRI_HOST}/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}`,
    maxZoom: 19,
    attribution: 'Citra: Esri, Maxar, Earthstar Geographics, GIS User Community',
  },
  {
    id: 'topo',
    label: 'Esri World Topographic',
    note: 'Kontur, tutupan lahan, hidrografi',
    chip: 'linear-gradient(135deg,#d8e3c8,#b9cfa2 55%,#e8ddc4)',
    url: `${ESRI_HOST}/World_Topo_Map/MapServer/tile/{z}/{y}/{x}`,
    maxZoom: 19,
    attribution: 'Esri, HERE, Garmin, Intermap, USGS, METI/NASA',
  },
  {
    id: 'streets',
    label: 'Esri World Street Map',
    note: 'Jaringan jalan dan nama tempat',
    chip: 'linear-gradient(135deg,#f2efe9,#dcd7cd 55%,#c9d6c0)',
    url: `${ESRI_HOST}/World_Street_Map/MapServer/tile/{z}/{y}/{x}`,
    maxZoom: 19,
    attribution: 'Esri, HERE, Garmin, USGS, NGA, OpenStreetMap contributors',
  },
  {
    id: 'darkgray',
    label: 'Esri Dark Gray Canvas',
    note: 'Kanvas gelap — kontras tinggi untuk overlay',
    chip: 'linear-gradient(135deg,#2b2b2b,#3d3d3d 55%,#565656)',
    url: `${ESRI_HOST}/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}`,
    reference: `${ESRI_HOST}/Canvas/World_Dark_Gray_Reference/MapServer/tile/{z}/{y}/{x}`,
    maxZoom: 16,
    attribution: 'Esri, HERE, Garmin, FAO, NOAA, USGS',
  },
  {
    id: 'offline',
    label: 'Grid Referensi Lokal',
    note: 'Graticule luring — tanpa sambungan keluar',
    chip: 'linear-gradient(135deg,#0d1526,#16233c 55%,#0b1220)',
    maxZoom: 20,
    attribution: 'Graticule WGS-84 — dilukis lokal oleh stasiun',
  },
];

/* ---------------------------------------------------------------------
   Geodesi ringkas — cukup akurat untuk jangkauan taktis (< 20 km)
   --------------------------------------------------------------------- */
const R_EARTH = 6371000;

/** Titik tujuan dari sebuah titik asal, diberi azimut (derajat) dan jarak (meter). */
export function destination(
  lat: number, lon: number, bearingDeg: number, distM: number,
): [number, number] {
  const br = (bearingDeg * Math.PI) / 180;
  const la1 = (lat * Math.PI) / 180;
  const lo1 = (lon * Math.PI) / 180;
  const dr = distM / R_EARTH;

  const la2 = Math.asin(Math.sin(la1) * Math.cos(dr) + Math.cos(la1) * Math.sin(dr) * Math.cos(br));
  const lo2 = lo1 + Math.atan2(
    Math.sin(br) * Math.sin(dr) * Math.cos(la1),
    Math.cos(dr) - Math.sin(la1) * Math.sin(la2),
  );
  return [(la2 * 180) / Math.PI, (lo2 * 180) / Math.PI];
}

/** Azimut dari titik A ke titik B, dalam derajat 0–360 dari utara sejati. */
export function bearingBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const y = Math.sin(dl) * Math.cos(f2);
  const x = Math.cos(f1) * Math.sin(f2) - Math.sin(f1) * Math.cos(f2) * Math.cos(dl);
  return (((Math.atan2(y, x) * 180) / Math.PI) + 360) % 360;
}

/** Jarak permukaan antara dua titik, dalam meter (haversine). */
export function distanceBetween(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const f1 = (lat1 * Math.PI) / 180;
  const f2 = (lat2 * Math.PI) / 180;
  const df = f2 - f1;
  const dl = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(df / 2) ** 2 + Math.cos(f1) * Math.cos(f2) * Math.sin(dl / 2) ** 2;
  return 2 * R_EARTH * Math.asin(Math.sqrt(a));
}

/* ---------------------------------------------------------------------
   Titik pada Target Bank
   --------------------------------------------------------------------- */
export interface MapTarget {
  id: number;
  name: string;
  lat: number;
  lon: number;
  threat: 'rendah' | 'sedang' | 'tinggi';
  range: number;
}

export const THREAT_COLOR: Record<MapTarget['threat'], string> = {
  rendah: '#94a3b8',
  sedang: '#fbbf24',
  tinggi: '#f87171',
};
