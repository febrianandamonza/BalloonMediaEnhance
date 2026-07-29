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

  const passwordHash = await bcrypt.hash('admin', 12);

  const users = await Promise.all([
    prisma.user.upsert({
      where: { username: 'admin' },
      update: {},
      create: {
        username: 'admin',
        email: 'admin@skystar.mil.id',
        passwordHash,
        fullName: 'System Administrator',
        roleId: adminRole.id,
        phone: '+62-811-0000-001',
      },
    }),
    prisma.user.upsert({
      where: { username: 'operator1' },
      update: {},
      create: {
        username: 'operator1',
        email: 'operator1@skystar.mil.id',
        passwordHash: await bcrypt.hash('operator123', 12),
        fullName: 'GCS Operator Alpha',
        roleId: operatorRole.id,
        phone: '+62-811-0000-002',
      },
    }),
    prisma.user.upsert({
      where: { username: 'supervisor1' },
      update: {},
      create: {
        username: 'supervisor1',
        email: 'supervisor1@skystar.mil.id',
        passwordHash: await bcrypt.hash('supervisor123', 12),
        fullName: 'Operations Supervisor',
        roleId: supervisorRole.id,
        phone: '+62-811-0000-003',
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
  console.log('  → Creating license and modules...');
  const license = await prisma.license.upsert({
    where: { licenseKey: 'SKST-2026-DEMO-0001' },
    update: {},
    create: {
      name: 'Video Analytics Software License',
      licenseKey: 'SKST-2026-DEMO-0001',
      status: 'active',
      maxSeats: 2,
      activatedAt: new Date(),
      organization: 'PT SkyStar GeoInt Indonesia',
      contractNumber: 'CONT-2026-001',
      contactEmail: 'admin@skystar.mil.id',
    },
  });

  const moduleDefinitions = [
    { moduleCode: 'MOD-1', moduleName: 'Object Detection & Analytics', subLicenseCode: '1.1a', subLicenseName: 'Image Detection (Object Detection from Captured Images)', priceIdr: 150000000n },
    { moduleCode: 'MOD-1', moduleName: 'Object Detection & Analytics', subLicenseCode: '1.1b', subLicenseName: 'Video Detection (Real-Time Object Detection from Video Stream)', priceIdr: 250000000n },
    { moduleCode: 'MOD-2', moduleName: 'Image Enhancement & Tether', subLicenseCode: '1.2a', subLicenseName: 'Image Enhancement (Post-Processing Image Quality Enhancement)', priceIdr: 100000000n },
    { moduleCode: 'MOD-2', moduleName: 'Image Enhancement & Tether', subLicenseCode: '1.2b', subLicenseName: 'Video Enhancement (Real-Time Video Quality Enhancement)', priceIdr: 200000000n },
    { moduleCode: 'MOD-2', moduleName: 'Image Enhancement & Tether', subLicenseCode: '1.2c', subLicenseName: 'Tether Cable API (Tether Cable Monitoring API Integration)', priceIdr: 75000000n },
    { moduleCode: 'MOD-2', moduleName: 'Image Enhancement & Tether', subLicenseCode: '1.2d', subLicenseName: 'Tether Cable Monitor (Visual Tether Cable Health Dashboard)', priceIdr: 75000000n },
    { moduleCode: 'MOD-3', moduleName: 'Information & Reporting', subLicenseCode: '1.3a', subLicenseName: 'Reporting (Automated Report Generation)', priceIdr: 100000000n },
    { moduleCode: 'MOD-3', moduleName: 'Information & Reporting', subLicenseCode: '1.3b', subLicenseName: 'GEO Visualization (Geographic Target Visualization)', priceIdr: 150000000n },
    { moduleCode: 'MOD-3', moduleName: 'Information & Reporting', subLicenseCode: '1.3c', subLicenseName: 'Smart Notification & Alerts (Intelligent Alert System)', priceIdr: 125000000n },
    { moduleCode: 'MOD-3', moduleName: 'Information & Reporting', subLicenseCode: '1.3d', subLicenseName: 'Flight Information (Flight Data Management)', priceIdr: 80000000n },
    { moduleCode: 'MOD-3', moduleName: 'Information & Reporting', subLicenseCode: '1.3e', subLicenseName: 'Mooring Monitoring (Mooring System Health)', priceIdr: 80000000n },
    { moduleCode: 'MOD-3', moduleName: 'Information & Reporting', subLicenseCode: '1.3f', subLicenseName: 'Flight Simulation (Flight Training Simulator)', priceIdr: 200000000n },
  ];

  for (const mod of moduleDefinitions) {
    await prisma.licenseModule.upsert({
      where: { uq_license_subcode: { licenseId: license.id, subLicenseCode: mod.subLicenseCode } },
      update: {},
      create: {
        licenseId: license.id,
        moduleCode: mod.moduleCode,
        moduleName: mod.moduleName,
        subLicenseCode: mod.subLicenseCode,
        subLicenseName: mod.subLicenseName,
        subLicenseKey: `SKST-${mod.subLicenseCode.replace('.', '')}-2026`,
        isActive: false,
        priceIdr: mod.priceIdr,
      },
    });
  }
  console.log(`  ✓ License + ${moduleDefinitions.length} modules created`);

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
        modules: moduleDefinitions.length,
      },
      statusCode: 200,
    },
  });

  console.log('\n✅ Database seeded successfully!');
  console.log('  Default login: admin / admin');
  console.log('  API docs: http://localhost:4000/docs');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
