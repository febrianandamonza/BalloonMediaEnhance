/* Menangkap tangkapan layar seluruh halaman GCS untuk dokumentasi manual. */
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');

const BASE = process.env.BASE_URL || 'http://localhost:3210';
/* Tujuan bawaan sama dengan tempat build.js membaca gambar, sehingga
   `npm run all` bekerja tanpa perlu menyetel variabel lingkungan. */
const OUT = process.env.OUT_DIR
  || path.join(__dirname, '..', '..', 'docs', 'screenshots');

/* Urutan mengikuti alur navigasi pada sidebar. */
const PAGES = [
  ['dashboard', 'Mission Dashboard'],
  ['media-source', 'Surveillance Media Source'],
  ['crowd', 'Crowd Counting'],
  ['detection-image', 'Digital Imaging Analytic'],
  ['detection-video', 'Digital Video Analytic'],
  ['enhance-image', 'Digital Imaging Enhancement'],
  ['enhance-video', 'Digital Video Enhancement'],
  ['tether-api', 'Tether Cable API'],
  ['tether-monitor', 'Tether Cable Monitoring'],
  ['reporting', 'Digital Reporting'],
  ['geo-viz', 'GeoInt Visualisation'],
  ['alerts', 'Smart Notification Alert'],
  ['flight-info', 'Flight Information'],
  ['mooring', 'Mooring Availability'],
  ['simulation', 'Flight Simulation'],
  ['licenses', 'License Manager'],
  ['users', 'User Management'],
  ['audit-log', 'Audit Trail'],
  ['settings', 'System Settings'],
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  fs.mkdirSync(OUT, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 1680, height: 1020 },
    deviceScaleFactor: 1.25,
    colorScheme: 'dark',
  });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('  ! page error:', e.message));

  // ---------- Layar login ----------
  await page.goto(BASE, { waitUntil: 'load', timeout: 60000 });
  await sleep(3500); // beri waktu adegan 3D mencapai kondisi stabil
  await page.screenshot({ path: path.join(OUT, '00-login.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 00-login');

  // Isi kredensial lalu tangkap form terisi
  await page.fill('#username', 'gcs1');
  await page.fill('#password', 'admin123');
  await sleep(400);
  await page.screenshot({ path: path.join(OUT, '01-login-filled.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 01-login-filled');

  // ---------- Fase autentikasi ----------
  await page.click('button[type="submit"]');
  await sleep(1100);
  await page.screenshot({ path: path.join(OUT, '02-authenticating.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 02-authenticating');

  await sleep(1400);
  await page.screenshot({ path: path.join(OUT, '03-access-granted.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 03-access-granted');

  // ---------- Masuk aplikasi ----------
  await page.waitForSelector('.app-layout', { timeout: 25000 });
  await sleep(2600);

  for (const [id, label] of PAGES) {
    await page.evaluate((pageId) => {
      const btns = Array.from(document.querySelectorAll('.sidebar .nav-item'));
      const target = btns.find((b) => b.textContent && b.getAttribute('data-page') === pageId);
      if (target) target.click();
    }, id);

    // Navigasi dilakukan lewat label agar tidak bergantung pada atribut data
    await page.evaluate((wanted) => {
      const btns = Array.from(document.querySelectorAll('.sidebar .nav-item'));
      const hit = btns.find((b) => (b.querySelector('.nav-label') || {}).textContent === wanted);
      if (hit) hit.click();
    }, navLabel(id));

    await sleep(id === 'dashboard' ? 2200 : 1300);

    const file = `${String(PAGES.findIndex((p) => p[0] === id) + 10).padStart(2, '0')}-${id}.jpg`;
    await page.screenshot({ path: path.join(OUT, file), fullPage: true, type: 'jpeg', quality: 92 });
    console.log(`captured ${file}  (${label})`);
  }

  // ---------- Alur aktivasi lisensi ----------
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.sidebar .nav-item'));
    const hit = btns.find((b) => (b.querySelector('.nav-label') || {}).textContent === 'License Manager');
    if (hit) hit.click();
  });
  await sleep(1000);

  // Nonaktifkan satu lisensi agar alur aktivasi dapat diperagakan
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.lic-card'));
    const target = cards.find((c) => (c.textContent || '').includes('Digital Analytic Enhancement'));
    if (!target) return;
    const btn = Array.from(target.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('Nonaktifkan'));
    if (btn) btn.click();
  });
  await sleep(900);
  await page.screenshot({ path: path.join(OUT, '30-license-locked.jpg'), fullPage: true, type: 'jpeg', quality: 92 });
  console.log('captured 30-license-locked');

  // Buka modal aktivasi
  await page.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.lic-card'));
    const target = cards.find((c) => (c.textContent || '').includes('Digital Analytic Enhancement'));
    if (!target) return;
    const btn = Array.from(target.querySelectorAll('button'))
      .find((b) => (b.textContent || '').includes('Aktivasi'));
    if (btn) btn.click();
  });
  await sleep(700);
  await page.screenshot({ path: path.join(OUT, '31-activation-modal.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 31-activation-modal');

  // Kunci keliru → pesan galat
  await page.fill('#lic-key', 'TAB-CC-2026-001-A8F4K2');
  await page.click('.modal-footer .btn-primary');
  await sleep(1400);
  await page.screenshot({ path: path.join(OUT, '32-activation-error.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 32-activation-error');

  // Kunci benar → aktivasi berhasil
  await page.fill('#lic-key', 'TAB-DAEP-2026-005-E9R4T8');
  await sleep(300);
  await page.screenshot({ path: path.join(OUT, '33-activation-key.jpg'), type: 'jpeg', quality: 92 });
  await page.click('.modal-footer .btn-primary');
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, '34-activation-success.jpg'), fullPage: true, type: 'jpeg', quality: 92 });
  console.log('captured 34-activation-success');

  // ---------- Sidebar mode ciut ----------
  await page.evaluate(() => {
    const t = document.querySelector('.sidebar-toggle');
    if (t) t.click();
  });
  await sleep(800);
  await page.screenshot({ path: path.join(OUT, '35-sidebar-collapsed.jpg'), type: 'jpeg', quality: 92 });
  console.log('captured 35-sidebar-collapsed');

  // ---------- Tema terang ----------
  await page.evaluate(() => {
    const t = document.querySelector('.sidebar-toggle');
    if (t) t.click();
  });
  await sleep(500);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.header-btn'));
    const themeBtn = btns.find((b) => (b.getAttribute('aria-label') || '').includes('mode'));
    if (themeBtn) themeBtn.click();
  });
  await sleep(900);
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.sidebar .nav-item'));
    const hit = btns.find((b) => (b.querySelector('.nav-label') || {}).textContent === 'Mission Dashboard');
    if (hit) hit.click();
  });
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, '36-light-theme.jpg'), fullPage: true, type: 'jpeg', quality: 92 });
  console.log('captured 36-light-theme');

  await browser.close();
  console.log('\nSelesai. Berkas tersimpan di:', OUT);
})().catch((e) => {
  console.error('GAGAL:', e);
  process.exit(1);
});

/* Peta id halaman ke label navigasi pada sidebar. */
function navLabel(id) {
  return {
    'dashboard': 'Mission Dashboard',
    'media-source': 'Surveillance Media',
    'crowd': 'Crowd Counting',
    'detection-image': 'Imaging Analytic',
    'detection-video': 'Video Analytic',
    'enhance-image': 'Imaging Enhancement',
    'enhance-video': 'Video Enhancement',
    'tether-api': 'Tether Cable API',
    'tether-monitor': 'Tether Cable Monitor',
    'reporting': 'Digital Reporting',
    'geo-viz': 'GeoInt Visualisation',
    'alerts': 'Smart Notification',
    'flight-info': 'Flight Information',
    'mooring': 'Mooring Availability',
    'simulation': 'Flight Simulation',
    'licenses': 'License Manager',
    'users': 'User Management',
    'audit-log': 'Audit Trail',
    'settings': 'System Settings',
  }[id];
}
