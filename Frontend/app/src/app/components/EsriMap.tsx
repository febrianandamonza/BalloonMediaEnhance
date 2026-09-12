'use client';
/* =====================================================================
    BASEMAP — peta taktis GeoInt
   ---------------------------------------------------------------------
   Basemap memakai layanan ubin publik ArcGIS Online milik . Pustaka
   peta (Leaflet) ikut dibundel dari node_modules, bukan dari CDN, jadi
   berkas program tidak bergantung pada penyedia mana pun.

   Bila stasiun dioperasikan tanpa sambungan keluar — kondisi normal di
   lapangan — pemuatan ubin akan gagal. Komponen ini mendeteksi kegagalan
   tersebut lalu berpindah sendiri ke "Grid Referensi Lokal": basemap
   graticule yang digambar di sisi klien, sehingga seluruh lapisan taktis
   (posisi balon, cincin jangkauan, kerucut pandang, Target Bank) tetap
   terbaca dengan koordinat yang benar.
   ===================================================================== */

import { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import {
  BASEMAPS, destination, bearingBetween, distanceBetween,
  THREAT_COLOR, type BasemapId, type MapTarget,
} from '../lib/geo';

export type { BasemapId, MapTarget } from '../lib/geo';
export { BASEMAPS, bearingBetween, distanceBetween } from '../lib/geo';

/* ---------------------------------------------------------------------
   Basemap luring: graticule yang digambar pada canvas per ubin.
   --------------------------------------------------------------------- */
class OfflineGridLayer extends L.GridLayer {
  protected createTile(coords: L.Coords): HTMLCanvasElement {
    const tile = document.createElement('canvas');
    const size = 256;
    tile.width = size;
    tile.height = size;
    const ctx = tile.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0a1220';
      ctx.fillRect(0, 0, size, size);

      /* Kisi halus 32 px */
      ctx.strokeStyle = 'rgba(96,165,250,0.055)';
      ctx.lineWidth = 1;
      for (let i = 32; i < size; i += 32) {
        ctx.beginPath(); ctx.moveTo(i + 0.5, 0); ctx.lineTo(i + 0.5, size); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i + 0.5); ctx.lineTo(size, i + 0.5); ctx.stroke();
      }

      /* Batas ubin — berperan sebagai graticule utama */
      ctx.strokeStyle = 'rgba(96,165,250,0.16)';
      ctx.strokeRect(0.5, 0.5, size - 1, size - 1);

      /* Label lintang/bujur di sudut barat-laut ubin.
         Dihitung langsung dengan rumus proyeksi Web Mercator agar tidak
         bergantung pada API internal Leaflet. */
      const n = 2 ** coords.z;
      const lon = (coords.x / n) * 360 - 180;
      const latRad = Math.atan(Math.sinh(Math.PI * (1 - (2 * coords.y) / n)));
      const lat = (latRad * 180) / Math.PI;

      ctx.fillStyle = 'rgba(148,163,184,0.42)';
      ctx.font = '10px ui-monospace, monospace';
      ctx.fillText(`${lat.toFixed(3)}°, ${lon.toFixed(3)}°`, 6, 14);
    }

    return tile;
  }
}

function createOfflineLayer(): L.GridLayer {
  return new OfflineGridLayer({ maxZoom: 20, minZoom: 2 });
}

/* ---------------------------------------------------------------------
   Kontrak komponen
   --------------------------------------------------------------------- */
export interface EsriMapProps {
  /** Posisi menara tambat / titik gelar balon */
  camLat: number;
  camLon: number;
  /** Ketinggian balon di atas permukaan (meter) — dipakai pada label HUD */
  altitude?: number;
  targets: MapTarget[];
  selected: MapTarget | null;
  onSelect: (t: MapTarget) => void;
  basemap: BasemapId;
  onBasemapFallback?: (reason: string) => void;
  showFov?: boolean;
  showRings?: boolean;
  showGeofence?: boolean;
  showTrack?: boolean;
  /** Bukaan sudut kerucut pandang kamera, derajat */
  fovDeg?: number;
  height?: number | string;
  /** Tampilkan penanda titik gelar (stasiun) di tengah peta. Default true. */
  showStation?: boolean;
  /** Tingkat zoom awal saat peta pertama kali dibuat. Default 14. */
  initialZoom?: number;

  /* ---- Alat kerja peta ---- */
  /** Klik pada peta menempatkan titik target baru */
  markMode?: boolean;
  onMapClick?: (lat: number, lon: number) => void;
  /** Mengukur jarak & baringan antara dua titik yang diklik */
  measureMode?: boolean;
  onMeasure?: (r: { from: [number, number]; to: [number, number]; dist: number; bearing: number }) => void;
  /** Perintah pindah pandang; ubah nilainya untuk memicu perpindahan */
  focus?: { lat: number; lon: number; zoom?: number; nonce: number } | null;
}

export default function EsriMap({
  camLat, camLon, altitude = 450, targets, selected, onSelect,
  basemap, onBasemapFallback,
  showFov = true, showRings = true, showGeofence = true, showTrack = false,
  showStation = true, initialZoom = 14,
  fovDeg = 34, height = 420,
  markMode = false, onMapClick, measureMode = false, onMeasure, focus = null,
}: EsriMapProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const baseRef = useRef<L.Layer | null>(null);
  const refRef = useRef<L.Layer | null>(null);
  const overlayRef = useRef<L.LayerGroup | null>(null);
  const markerRef = useRef<L.LayerGroup | null>(null);
  const measureRef = useRef<L.LayerGroup | null>(null);
  const failCount = useRef(0);

  const [cursor, setCursor] = useState<{ lat: number; lon: number } | null>(null);
  const [degraded, setDegraded] = useState(false);
  const [measurePts, setMeasurePts] = useState<[number, number][]>([]);

  /* Callback dan mode disimpan dalam ref agar effect pembuat peta tidak
     perlu dijalankan ulang setiap kali induk membuat fungsi baru. */
  const onFallbackRef = useRef(onBasemapFallback);
  const onMapClickRef = useRef(onMapClick);
  const onMeasureRef = useRef(onMeasure);
  const modeRef = useRef({ mark: markMode, measure: measureMode });

  useEffect(() => { onFallbackRef.current = onBasemapFallback; }, [onBasemapFallback]);
  useEffect(() => { onMapClickRef.current = onMapClick; }, [onMapClick]);
  useEffect(() => { onMeasureRef.current = onMeasure; }, [onMeasure]);
  useEffect(() => { modeRef.current = { mark: markMode, measure: measureMode }; }, [markMode, measureMode]);

  /* Keluar dari mode ukur membersihkan garis ukur yang tersisa.
     Disetel saat render — bukan lewat effect — agar garis lama tidak
     sempat terlihat sekejap setelah alat dimatikan. */
  const [prevMeasure, setPrevMeasure] = useState(measureMode);
  if (prevMeasure !== measureMode) {
    setPrevMeasure(measureMode);
    if (!measureMode && measurePts.length > 0) setMeasurePts([]);
  }

  /* ---- Pembuatan peta (sekali) ---- */
  useEffect(() => {
    if (!hostRef.current || mapRef.current) return;

    const map = L.map(hostRef.current, {
      center: [camLat, camLon],
      zoom: initialZoom,
      zoomControl: true,
      attributionControl: true,
      /* Lapisan vektor digambar sebagai SVG, bukan kanvas.

         Perender kanvas Leaflet mengumpulkan permintaan gambar ulang lalu
         mengeksekusinya pada bingkai animasi berikutnya. Saat peta
         dibongkar, remove() melepas layer group lebih dulu daripada
         perendernya; tiap garis dan lingkaran yang ikut terlepas masih
         sempat menjadwalkan gambar ulang, dan bingkai itu berjalan ketika
         konteks kanvasnya sudah dibuang — memunculkan "Cannot read
         properties of undefined (reading 'clearRect')".

         Perender SVG membongkar dirinya secara sinkron sehingga tidak ada
         pekerjaan tertunda yang bisa menjadi yatim. Jumlah lapisan
         taktis di sini hanya belasan, jauh di bawah titik ketika kanvas
         mulai lebih unggul, jadi tidak ada yang dikorbankan. */
      preferCanvas: false,
      /* Gulir halaman tidak boleh terganggu; zoom memakai Ctrl + gulir. */
      scrollWheelZoom: false,
      worldCopyJump: true,
    });
    map.attributionControl.setPrefix('');
    L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);

    map.on('mousemove', (e: L.LeafletMouseEvent) =>
      setCursor({ lat: e.latlng.lat, lon: e.latlng.lng }));
    map.on('mouseout', () => setCursor(null));

    /* Klik pada peta melayani dua alat sekaligus, dibedakan oleh mode
       yang sedang aktif. Mode dibaca dari ref supaya handler ini cukup
       dipasang satu kali seumur hidup peta. */
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { mark, measure } = modeRef.current;
      const lat = e.latlng.lat;
      const lon = e.latlng.lng;

      if (measure) {
        /* Fungsi pembaru state harus murni: React boleh menjalankannya
           lebih dari sekali, dan ia dijalankan pada fase render. Karena
           itu ia hanya menghitung nilai berikutnya. Pelaporan hasil ukur
           ke panel induk dilakukan oleh effect di bawah, setelah state
           benar-benar tersimpan. */
        setMeasurePts(prev => (
          /* Titik ketiga memulai pengukuran baru. */
          prev.length >= 2 ? [[lat, lon]] : [...prev, [lat, lon]]
        ));
        return;
      }

      if (mark) onMapClickRef.current?.(lat, lon);
    });

    overlayRef.current = L.layerGroup().addTo(map);
    markerRef.current = L.layerGroup().addTo(map);
    measureRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    /* Leaflet hanya memantau perubahan ukuran jendela. Wadah peta di sini
       juga berubah saat sidebar diciutkan atau tata letak menyesuaikan
       lebar layar, sehingga ukurannya diamati langsung — tanpa ini, ubin
       di area yang baru terbuka tidak ikut dimuat. */
    const ro = new ResizeObserver(() => map.invalidateSize({ animate: false }));
    ro.observe(hostRef.current);

    return () => {
      ro.disconnect();

      /* Pembongkaran harus tertib, bukan sekadar map.remove().

         Leaflet membuang konteks kanvas perendernya di dalam remove(),
         namun tautan renderer ke peta baru diputus sesudahnya. Pada
         jendela sempit itu, setiap lapisan vektor yang dilepas masih
         sempat menjadwalkan gambar ulang lewat requestAnimationFrame —
         dan bingkai itu berjalan ketika kanvasnya sudah tidak ada lagi,
         memunculkan "Cannot read properties of undefined (reading
         'clearRect')".

         Karena itu seluruh lapisan dikosongkan dan dilepas selagi peta
         masih utuh, sehingga tidak ada satu pun permintaan gambar ulang
         yang tersisa saat remove() dijalankan. */
      /* Handler dilepas agar peristiwa yang masih dalam antrean tidak
         menyentuh state komponen yang sudah tidak terpasang. */
      map.off();
      map.remove();

      /* Seluruh rujukan dinihilkan, bukan hanya peta. Sebuah layer group
         yang petanya sudah dibongkar tetap objek yang sah, dan effect
         lain yang menyentuhnya akan menjadwalkan gambar ulang ke kanvas
         yang sudah tidak ada. */
      mapRef.current = null;
      overlayRef.current = null;
      markerRef.current = null;
      measureRef.current = null;
      baseRef.current = null;
      refRef.current = null;
    };
    /* Sengaja tanpa dependensi: peta dibuat sekali, pembaruan lewat effect lain. */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- Pergantian basemap ---- */
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const def = BASEMAPS.find(b => b.id === basemap) ?? BASEMAPS[0];
    if (baseRef.current) { map.removeLayer(baseRef.current); baseRef.current = null; }
    if (refRef.current) { map.removeLayer(refRef.current); refRef.current = null; }
    failCount.current = 0;
    setDegraded(false);

    if (!def.url) {
      baseRef.current = createOfflineLayer().addTo(map);
      map.attributionControl.setPrefix('');
      return;
    }

    const tiles = L.tileLayer(def.url, {
      maxZoom: def.maxZoom,
      maxNativeZoom: def.maxZoom,
      attribution: def.attribution,
      crossOrigin: true,
    });

    /* Jika beberapa ubin berturut-turut gagal, stasiun dianggap terputus
       dan peta berpindah sendiri ke graticule lokal. */
    tiles.on('tileerror', () => {
      failCount.current += 1;
      if (failCount.current === 4) {
        setDegraded(true);
        onFallbackRef.current?.(
          'Layanan ubin tidak terjangkau — peta beralih ke Grid Referensi Lokal.',
        );
        if (baseRef.current) map.removeLayer(baseRef.current);
        if (refRef.current) { map.removeLayer(refRef.current); refRef.current = null; }
        baseRef.current = createOfflineLayer().addTo(map);
      }
    });

    tiles.addTo(map);
    baseRef.current = tiles;

    if (def.reference) {
      refRef.current = L.tileLayer(def.reference, {
        maxZoom: def.maxZoom,
        maxNativeZoom: def.maxZoom,
        pane: 'overlayPane',
      }).addTo(map);
    }
  }, [basemap]);

  /* ---- Lapisan taktis ---- */
  const drawOverlays = useCallback(() => {
    const map = mapRef.current;
    const layer = overlayRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    /* Cincin jangkauan 1 / 2 / 3 km dari titik gelar */
    if (showRings) {
      [1000, 2000, 3000].forEach((r, i) => {
        L.circle([camLat, camLon], {
          radius: r,
          color: 'rgba(96,165,250,0.34)',
          weight: 1,
          dashArray: '4 5',
          fill: false,
          interactive: false,
        }).addTo(layer);
        const [lt, ln] = destination(camLat, camLon, 45, r);
        L.marker([lt, ln], {
          interactive: false,
          icon: L.divIcon({
            className: 'mk-target',
            html: `<span style="font:600 9px var(--font-code,monospace);color:rgba(148,163,184,.66);
                   background:rgba(6,10,19,.62);padding:1px 4px;border-radius:3px;white-space:nowrap">
                   ${(r / 1000).toFixed(0)} km</span>`,
            iconSize: [0, 0],
          }),
          zIndexOffset: -100 + i,
        }).addTo(layer);
      });
    }

    /* Kerucut pandang kamera menuju target terkunci */
    if (showFov && selected) {
      const br = bearingBetween(camLat, camLon, selected.lat, selected.lon);
      const dist = Math.max(600, distanceBetween(camLat, camLon, selected.lat, selected.lon) * 1.22);
      const half = fovDeg / 2;
      const arc: [number, number][] = [[camLat, camLon]];
      for (let a = -half; a <= half; a += 2) arc.push(destination(camLat, camLon, br + a, dist));
      arc.push([camLat, camLon]);

      L.polygon(arc, {
        color: 'rgba(96,165,250,0.55)',
        weight: 1,
        fillColor: '#60a5fa',
        fillOpacity: 0.12,
        interactive: false,
      }).addTo(layer);

      /* Garis bidik ke target */
      L.polyline([[camLat, camLon], [selected.lat, selected.lon]], {
        color: '#22d3ee',
        weight: 1.4,
        dashArray: '6 4',
        interactive: false,
      }).addTo(layer);
    }

    /* Poligon geofence — batas area tanggung jawab stasiun */
    if (showGeofence) {
      const fence = [0, 60, 120, 180, 240, 300].map(a => destination(camLat, camLon, a, 3400));
      L.polygon(fence, {
        color: 'rgba(52,211,153,0.42)',
        weight: 1.2,
        dashArray: '2 6',
        fillColor: '#34d399',
        fillOpacity: 0.03,
        interactive: false,
      }).addTo(layer);
    }

    /* Jejak lintasan balon — simpangan akibat angin selama penggelaran */
    if (showTrack) {
      const track: [number, number][] = Array.from({ length: 26 }, (_, i) => {
        const t = i / 25;
        return destination(camLat, camLon, 70 + Math.sin(t * 6.1) * 46, 40 + t * 120);
      });
      L.polyline(track, {
        color: 'rgba(251,191,36,0.6)',
        weight: 1.2,
        interactive: false,
      }).addTo(layer);
    }
  }, [camLat, camLon, selected, showFov, showRings, showGeofence, showTrack, fovDeg]);

  useEffect(() => { drawOverlays(); }, [drawOverlays]);

  /* ---- Penanda: titik gelar + Target Bank ---- */
  useEffect(() => {
    const map = mapRef.current;
    const layer = markerRef.current;
    if (!map || !layer) return;
    layer.clearLayers();

    /* Titik gelar balon */
    if (showStation) {
      L.marker([camLat, camLon], {
        icon: L.divIcon({
          className: 'mk-balloon',
          html:
            `<span class="mk-pin" style="color:#60a5fa;width:26px;height:26px">
               <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                    stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                 <path d="M12 2a7 7 0 0 1 7 7c0 4-3.5 7.5-7 11-3.5-3.5-7-7-7-11a7 7 0 0 1 7-7Z"/>
                 <circle cx="12" cy="9" r="2.2"/>
               </svg>
             </span>
             <span class="mk-label" style="display:none">Lokasi Saya · ${altitude} m AGL</span>`,
          iconSize: [26, 26],
          iconAnchor: [13, 13],
        }),
        zIndexOffset: 1000,
      }).addTo(layer);
    }

    /* Target Bank */
    targets.forEach(t => {
      const isSel = selected?.id === t.id;
      const color = THREAT_COLOR[t.threat];
      const m = L.marker([t.lat, t.lon], {
        icon: L.divIcon({
          className: 'mk-target',
          html: `<span class="mk-pin ${isSel ? 'sel' : ''}" style="color:${color}"><b></b></span>`,
          iconSize: [22, 22],
          iconAnchor: [11, 11],
        }),
        zIndexOffset: isSel ? 900 : 500,
        riseOnHover: true,
      });

      m.bindPopup(
        `<b style="font-size:12.5px">${t.name}</b><br>` +
        `<span style="font-family:var(--font-code,monospace);font-size:11px;color:#94a3b8">` +
        `${t.lat.toFixed(5)}, ${t.lon.toFixed(5)}</span><br>` +
        `<span style="font-size:11px">Jarak miring ${t.range.toLocaleString('id-ID')} m · ` +
        `ancaman <b style="color:${color}">${t.threat}</b></span>`,
        { closeButton: true, offset: [0, -6] },
      );
      /* Selama mode ukur aktif, klik marker harus berperilaku seperti
         klik peta kosong (menambah titik ukur) — bukan memilih target,
         sebab klik pada elemen marker tidak diteruskan ke map.on('click',
         ...) di atas (perilaku bawaan Leaflet). */
      m.on('click', () => {
        if (modeRef.current.measure) {
          setMeasurePts(prev => (
            prev.length >= 2 ? [[t.lat, t.lon]] : [...prev, [t.lat, t.lon]]
          ));
          return;
        }
        onSelect(t);
      });
      m.addTo(layer);
    });
  }, [camLat, camLon, altitude, targets, selected, onSelect, showStation]);

  /* ---- Pelaporan hasil ukur ke panel induk ----
     Dipisahkan dari penangan klik dengan sengaja. Memanggil setState
     milik komponen lain dari dalam fungsi pembaru berarti memperbarui
     komponen itu saat komponen ini sedang dirender — persis yang
     dikeluhkan React sebagai "Cannot update a component while rendering
     a different component". Di dalam effect, pembaruan terjadi setelah
     commit sehingga aman. */
  useEffect(() => {
    if (measurePts.length !== 2) return;
    const [a, b] = measurePts;
    onMeasureRef.current?.({
      from: a,
      to: b,
      dist: distanceBetween(a[0], a[1], b[0], b[1]),
      bearing: bearingBetween(a[0], a[1], b[0], b[1]),
    });
  }, [measurePts]);

  /* ---- Garis ukur ---- */
  useEffect(() => {
    /* Peta ikut diperiksa, bukan hanya lapisannya. Sebuah layer group
       yang petanya sudah dibongkar tetap merupakan objek yang sah, dan
       memanggil clearLayers() padanya akan menjadwalkan gambar ulang ke
       kanvas yang sudah tidak ada. */
    const map = mapRef.current;
    const layer = measureRef.current;
    if (!map || !layer) return;
    layer.clearLayers();
    if (measurePts.length === 0) return;

    measurePts.forEach(([lat, lon], i) => {
      L.marker([lat, lon], {
        interactive: false,
        icon: L.divIcon({
          className: 'mk-target',
          html: `<span class="mk-measure">${i + 1}</span>`,
          iconSize: [16, 16],
          iconAnchor: [8, 8],
        }),
      }).addTo(layer);
    });

    if (measurePts.length === 2) {
      const [a, b] = measurePts;
      L.polyline([a, b], {
        color: '#fbbf24',
        weight: 1.8,
        dashArray: '7 4',
        interactive: false,
      }).addTo(layer);

      const dist = distanceBetween(a[0], a[1], b[0], b[1]);
      const brg = bearingBetween(a[0], a[1], b[0], b[1]);
      const mid: [number, number] = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

      L.marker(mid, {
        interactive: false,
        icon: L.divIcon({
          className: 'mk-target',
          html:
            `<span class="mk-measure-label">${dist >= 1000
              ? `${(dist / 1000).toFixed(2)} km`
              : `${Math.round(dist)} m`} · ${brg.toFixed(0)}°</span>`,
          iconSize: [0, 0],
        }),
      }).addTo(layer);
    }
  }, [measurePts]);

  /* ---- Ikuti perpindahan stasiun ---- */
  useEffect(() => {
    mapRef.current?.setView([camLat, camLon], mapRef.current.getZoom(), { animate: true });
  }, [camLat, camLon]);

  /* ---- Perintah pindah pandang dari panel ---- */
  useEffect(() => {
    if (!focus || !mapRef.current) return;
    mapRef.current.flyTo([focus.lat, focus.lon], focus.zoom ?? mapRef.current.getZoom(), {
      duration: 0.8,
    });
  }, [focus]);

  const activeDef = BASEMAPS.find(b => b.id === basemap) ?? BASEMAPS[0];
  const tool = measureMode ? 'measure' : markMode ? 'mark' : null;

  return (
    <div
      className={`esri-wrap ${basemap === 'darkgray' || basemap === 'offline' ? 'lyr-dark' : ''} ${tool ? 'tool-on' : ''}`}
      style={{ height }}
    >
      <div ref={hostRef} style={{ width: '100%', height: '100%' }} />

      {/* Petunjuk alat yang sedang aktif */}
      {tool && (
        <div className="map-tool-hint">
          {tool === 'mark'
            ? 'Klik pada peta untuk menempatkan titik target'
            : measurePts.length === 0
              ? 'Klik titik awal pengukuran'
              : measurePts.length === 1
                ? 'Klik titik akhir pengukuran'
                : 'Klik lagi untuk memulai pengukuran baru'}
        </div>
      )}

      {/* Bacaan koordinat kursor */}
      <div className="map-hud bl" style={{ left: 'auto', right: 10, bottom: 10 }}>
        <span className="hud-k">Kursor · WGS-84</span>
        <span className="hud-v">
          {cursor ? `${cursor.lat.toFixed(5)}°, ${cursor.lon.toFixed(5)}°` : '— · arahkan ke peta'}
        </span>
      </div>

      {/* Penanda basemap aktif / peringatan luring */}
      <div className="map-hud tl" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span
          className="sw-chip"
          style={{ background: activeDef.chip, width: 20, height: 20, borderRadius: 5, flexShrink: 0 }}
        />
        <span style={{ display: 'none' }}>
          <span className="hud-k">Basemap</span>
          <span className="hud-v" style={{ fontFamily: 'var(--font-sans)', fontSize: 11.5 }}>
            {degraded ? 'Grid Referensi Lokal · luring' : activeDef.label}
          </span>
        </span>
      </div>
    </div>
  );
}
