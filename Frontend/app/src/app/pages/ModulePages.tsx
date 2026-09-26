/* =====================================================================
   Titik masuk tunggal untuk seluruh halaman modul berlisensi.
   Implementasi dipecah per kelompok lisensi agar setiap berkas tetap
   ringkas dan mudah ditelusuri saat perawatan.
   ===================================================================== */

export { CrowdCountingPage, ImageDetectionPage, VideoDetectionPage } from './modules/AnalyticsPages';

export {
  ImageEnhancementPage, VideoEnhancementPage, TetherAPIPage, TetherMonitorPage,
} from './modules/EnhancementPages';

export {
  ReportingPage, GeoVisualizationPage, AlertsPage,
  FlightInfoPage, MooringMonitorPage, SimulationPage,
} from './modules/InfoPages';
