import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

const connectionString = process.env.DATABASE_URL
  ?? 'postgresql://skystar:skystar_secret_2026@localhost:5432/skystar_geoint?schema=public';
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Seeding SkyStar GeoInt database...');

  // ============================================
  // 1. Roles (5 roles as per RBAC matrix)
  // ============================================
  console.log('  → Creating roles...');
  const roles = await Promise.all([
    prisma.role.upsert({
      where: { code: 'admin' },
      update: {},
      create: {
        name: 'Administrator',
        code: 'admin',
        permissions: ['*'],
        description: 'Full system access — all modules, settings, and user management',
      },
    }),
    prisma.role.upsert({
      where: { code: 'operator' },
      update: {},
      create: {
        name: 'Operator',
        code: 'operator',
        permissions: [
          'gimbal:control', 'crowd:run', 'video:view', 'mooring:view',
          'alert:ack', 'flight:manage', 'sim:run', 'emergency:shutdown',
        ],
        description: 'Ground Control Station operator — gimbal, video, crowd counting',
      },
    }),
    prisma.role.upsert({
      where: { code: 'supervisor' },
      update: {},
      create: {
        name: 'Supervisor',
        code: 'supervisor',
        permissions: [
          'crowd:run', 'report:generate', 'alert:config', 'site:manage',
          'flight:manage', 'sim:run', 'mooring:view', 'emergency:shutdown',
        ],
        description: 'Operations supervisor — reports, alerts, site management',
      },
    }),
    prisma.role.upsert({
      where: { code: 'technician' },
      update: {},
      create: {
        name: 'Technician',
        code: 'technician',
        permissions: ['mooring:view', 'alert:ack', 'maintenance:manage', 'emergency:shutdown'],
        description: 'Maintenance technician — mooring, tether, device maintenance',
      },
    }),
    prisma.role.upsert({
      where: { code: 'commander' },
      update: {},
      create: {
        name: 'Commander',
        code: 'commander',
        permissions: [
          'crowd:run', 'report:generate', 'alert:config', 'site:manage',
          'flight:manage', 'sim:run', 'mooring:view', 'emergency:shutdown',
        ],
        description: 'Mission commander — full operational oversight',
      },
    }),
  ]);
  console.log(`  ✓ ${roles.length} roles created`);

  // ============================================
  // 2. Default Users
  // ============================================
  console.log('  → Creating default users...');
  const adminRole = roles.find(r => r.code === 'admin')!;
  const operatorRole = roles.find(r => r.code === 'operator')!;
  const supervisorRole = roles.find(r => r.code === 'supervisor')!;

  /* Dua akun stasiun GCS — kredensial ini sama dengan daftar operator
     lokal pada frontend (app/src/app/lib/auth.ts) agar login tetap
     konsisten baik saat backend aktif maupun saat GCS berjalan mandiri. */
  const stationPasswordHash = await bcrypt.hash('admin123', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'gcs1' },
      update: { passwordHash: stationPasswordHash },
      create: {
        username: 'gcs1',
        email: 'gcs1@skystar.mil.id',
        passwordHash: stationPasswordHash,
        fullName: 'Operator GCS Satu',
        roleId: adminRole.id,
        phone: '+62-811-0000-001',
      },
    }),
    prisma.user.upsert({
      where: { username: 'gcs2' },
      update: { passwordHash: stationPasswordHash },
      create: {
        username: 'gcs2',
        email: 'gcs2@skystar.mil.id',
        passwordHash: stationPasswordHash,
        fullName: 'Operator GCS Dua',
        roleId: adminRole.id,
        phone: '+62-811-0000-002',
      },
    }),
    prisma.user.upsert({
      where: { username: 'budi.op' },
      update: {},
      create: {
        username: 'budi.op',
        email: 'budi@skystar.mil.id',
        passwordHash: await bcrypt.hash('operator123', 12),
        fullName: 'Budi Santoso',
        roleId: operatorRole.id,
        phone: '+62-811-0000-003',
      },
    }),
    prisma.user.upsert({
      where: { username: 'ani.spv' },
      update: {},
      create: {
        username: 'ani.spv',
        email: 'ani@skystar.mil.id',
        passwordHash: await bcrypt.hash('supervisor123', 12),
        fullName: 'Ani Rahmawati',
        roleId: supervisorRole.id,
        phone: '+62-811-0000-004',
      },
    }),
  ]);
  console.log(`  ✓ ${users.length} users created`);

  // ============================================
  // 3. Default Site
  // ============================================
  console.log('  → Creating default site...');
  const site = await prisma.site.upsert({
    where: { code: 'SITE-JKT-001' },
    update: {},
    create: {
      name: 'Jakarta Surveillance Post Alpha',
      code: 'SITE-JKT-001',
      latitude: -6.2088,
      longitude: 106.8456,
      altitude: 15.0,
      address: 'Monas Area, Central Jakarta, DKI Jakarta',
      timezone: 'Asia/Jakarta',
      status: 'online',
    },
  });
  console.log(`  ✓ Site created: ${site.code}`);

  // ============================================
  // 4. Default Device (Epsilon Gimbal)
  // ============================================
  console.log('  → Creating default device...');
  const device = await prisma.device.upsert({
    where: { serialNumber: 'EPS-140Z-2026-001' },
    update: {},
    create: {
      siteId: site.id,
      name: 'Epsilon 140Z Primary',
      type: 'epsilon_gimbal',
      model: 'Epsilon_140Z',
      serialNumber: 'EPS-140Z-2026-001',
      firmwareVersion: '4.2.1',
      connectionType: 'ethernet',
      ipAddress: '192.168.10.100',
      port: 15004,
      baudRate: 57600,
      status: 'online',
      metadata: {
        capabilities: ['EO', 'IR', 'LRF', 'GPS', 'TRACKING', 'GEO'],
        panRange: { min: 0, max: 360 },
        tiltRange: { min: -90, max: 30 },
        opticalZoom: '30x',
      },
    },
  });
  console.log(`  ✓ Device created: ${device.name}`);

  // ============================================
  // 5. Gimbal Settings
  // ============================================
  console.log('  → Creating gimbal settings...');
  await prisma.gimbalSettings.upsert({
    where: { deviceId: device.id },
    update: {},
    create: {
      deviceId: device.id,
      opticalZoomSpeed: 4,
      focusAdjustment: 128,
      deadZoneOffset: 1500,
      speedLimit: 20,
      videoCodec: 'H264_HD',
      videoPort: 15004,
      videoMode: 'PAL',
      videoBitrate: 1500000,
      gimbalIp: '192.168.10.100',
      gimbalSubnet: '255.255.255.0',
      gimbalGateway: '192.168.10.1',
      enhanceFilter: 'NONE',
      autoConnectEnabled: true,
      logTelemetry: true,
    },
  });
  console.log('  ✓ Gimbal settings created');

  // ============================================
  // 6. License + Modules (12 sub-licenses)
  // ============================================
  /* Empat sertifikat yang diterbitkan TAB Integrated Systems Pte Ltd:
     satu Commercial Software License (Crowd Counting) dan tiga Module
     License. Setiap sertifikat terbit dalam dua unit serial — satu per
     stasiun GCS — dan keduanya sah dipakai pada kedua stasiun. */
  console.log('  → Creating licenses and modules...');

  const EFFECTIVE = new Date('2026-07-20T00:00:00+07:00');
  const EXPIRES = new Date('2027-12-31T23:59:59+07:00');

  const licenseDefinitions = [
    {
      name: 'Crowd Counting',
      kind: 'Commercial Software License',
      serials: ['TAB-CC-2026-001-A8F4K2', 'TAB-CC-2026-002-B7M9X5'],
      contractNumber: 'TAB-CC-2026',
      modules: [
        { subLicenseCode: 'CC-01', subLicenseName: 'Crowd Density Estimation (CSRNet Density Map, CUDA Accelerated)' },
      ],
    },
    {
      name: 'Analytic and Object Detection Tethered Balloon Geospatial Intelligence System',
      kind: 'Module License',
      serials: ['TAB-AODGIS-2026-003-C3L8P6', 'TAB-AODGIS-2026-004-D5Q7W1'],
      contractNumber: 'TAB-AODGIS-2026',
      modules: [
        { subLicenseCode: '1.1a', subLicenseName: 'Digital Imaging Analytic & Object Detection (YOLOv8x, Static Imagery)' },
        { subLicenseCode: '1.1b', subLicenseName: 'Digital Video Analytic & Object Detection (YOLOv8 + ByteTrack, MTI, ROI Geofence)' },
      ],
    },
    {
      name: 'Digital Analytic Enhancement Processing System Module',
      kind: 'Module License',
      serials: ['TAB-DAEP-2026-005-E9R4T8', 'TAB-DAEP-2026-006-F2N6Y7'],
      contractNumber: 'TAB-DAEP-2026',
      modules: [
        { subLicenseCode: '1.2a', subLicenseName: 'Digital Imaging Enhancement (CLAHE, Laplacian, Unsharp, Bilateral Denoising)' },
        { subLicenseCode: '1.2b', subLicenseName: 'Digital Video Enhancement (Real-Time False Colour, 22 Palettes)' },
        { subLicenseCode: '1.2c', subLicenseName: 'Interface Integrasi (API) Main Tether Cable (REST & WebSocket, Modbus TCP/RTU)' },
        { subLicenseCode: '1.2d', subLicenseName: 'Monitoring Checking Capability Tether Cable (Power, Insulation, Continuity, EOP)' },
      ],
    },
    {
      name: 'Information and Reporting Tethered Balloon Geospatial Intelligence System Module',
      kind: 'Module License',
      serials: ['TAB-IRGIS-2026-007-G5V8K3', 'TAB-IRGIS-2026-008-H7M2Z9'],
      contractNumber: 'TAB-IRGIS-2026',
      modules: [
        { subLicenseCode: '1.3a', subLicenseName: 'Digital Reporting Tethered Balloon (PDF/XLSX, Classification Watermark)' },
        { subLicenseCode: '1.3b', subLicenseName: 'Digital Visualisation Information GeoInt (Offline Map, FOV Cone, Target Bank)' },
        { subLicenseCode: '1.3c', subLicenseName: 'Digital Smart Notification Alert (Geofence, Threshold, Intrusion)' },
        { subLicenseCode: '1.3d', subLicenseName: 'Information Flight Balloon Intelligent App (Logbook, Pre-Flight Checklist)' },
        { subLicenseCode: '1.3e', subLicenseName: 'Monitoring Availability Mooring App System (Anemometer, Load Cell, Helium)' },
        { subLicenseCode: '1.3f', subLicenseName: 'Simulation Plan Skenario Flight Balloon (GO / MARGINAL / NO-GO Assessment)' },
      ],
    },
  ];

  let moduleTotal = 0;

  for (const def of licenseDefinitions) {
    const license = await prisma.license.upsert({
      where: { licenseKey: def.serials[0] },
      update: { status: 'active', expiresAt: EXPIRES },
      create: {
        name: def.name,
        licenseKey: def.serials[0],
        status: 'active',
        maxSeats: 2,
        activatedAt: EFFECTIVE,
        expiresAt: EXPIRES,
        organization: 'Badan Intelijen Negara',
        contractNumber: def.contractNumber,
        contactEmail: 'gcs1@skystar.mil.id',
        notes: [
          `Certificate type: ${def.kind}`,
          `Licensor: TAB Integrated Systems Pte Ltd`,
          `Accepted serial numbers: ${def.serials.join(', ')}`,
          `Effective 20 July 2026 — expires 31 December 2027. Non-transferable.`,
        ].join('\n'),
      },
    });

    for (const mod of def.modules) {
      await prisma.licenseModule.upsert({
        where: { uq_license_subcode: { licenseId: license.id, subLicenseCode: mod.subLicenseCode } },
        update: { subLicenseName: mod.subLicenseName, expiresAt: EXPIRES },
        create: {
          licenseId: license.id,
          moduleCode: def.contractNumber,
          moduleName: def.name,
          subLicenseCode: mod.subLicenseCode,
          subLicenseName: mod.subLicenseName,
          isActive: true,
          activatedAt: EFFECTIVE,
          expiresAt: EXPIRES,
        },
      });
      moduleTotal += 1;
    }
  }
  console.log(`  ✓ ${licenseDefinitions.length} licenses + ${moduleTotal} sub-modules created`);

  // ============================================
  // 7. Audit log for seed
  // ============================================
  await prisma.auditLog.create({
    data: {
      userId: users[0].id,
      action: 'system:seed',
      resource: 'database',
      details: {
        roles: roles.length,
        users: users.length,
        sites: 1,
        devices: 1,
        licenses: licenseDefinitions.length,
        modules: moduleTotal,
      },
      statusCode: 200,
    },
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('  Station logins: gcs1 / admin123  ·  gcs2 / admin123');
  console.log('  API docs: http://localhost:8000/docs');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
