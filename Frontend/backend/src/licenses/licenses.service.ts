import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/** Bentuk License Number resmi: TAB-<PRODUK>-<TAHUN>-<URUT>-<CHECK>. */
const SERIAL_PATTERN = /^TAB-[A-Z]{2,8}-\d{4}-\d{3}-[A-Z0-9]{6}$/;

/** Menyeragamkan masukan operator sebelum dicocokkan dengan basis data. */
function normalizeSerial(raw: string): string {
  return (raw ?? '')
    .trim()
    .toUpperCase()
    .replace(/[‐-―−]/g, '-')
    .replace(/\s+/g, '');
}

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

  /**
   * Seluruh sertifikat yang diterbitkan untuk instalasi ini: satu
   * Commercial Software License (Crowd Counting) dan tiga Module License.
   */
  async getLicenses() {
    return this.prisma.license.findMany({
      orderBy: { contractNumber: 'asc' },
      include: { modules: { orderBy: { subLicenseCode: 'asc' } } },
    });
  }

  async getLicense() {
    const license = await this.prisma.license.findFirst({
      include: {
        modules: { orderBy: { subLicenseCode: 'asc' } },
        seats: { include: { user: { select: { id: true, username: true, fullName: true } } } },
      },
    });
    if (!license) throw new NotFoundException('No license found');
    return license;
  }

  /**
   * Mengaktifkan sebuah sertifikat berdasarkan License Number yang tercetak
   * padanya. Setiap sertifikat diterbitkan dalam dua unit serial (satu per
   * stasiun GCS); keduanya diterima. Aktivasi membuka seluruh sub-modul yang
   * dinaungi sertifikat tersebut.
   */
  async activateLicense(rawSerial: string, userId: string) {
    const serial = normalizeSerial(rawSerial);

    if (!SERIAL_PATTERN.test(serial)) {
      throw new BadRequestException(
        'Format License Number tidak valid. Format resmi: TAB-XXXX-YYYY-NNN-XXXXXX.',
      );
    }

    /* Serial utama tersimpan pada licenseKey; serial alternatif dicatat
       pada kolom notes saat penyemaian data. */
    const candidates = await this.prisma.license.findMany({
      include: { modules: true },
    });
    const license = candidates.find(
      (l) => normalizeSerial(l.licenseKey) === serial || (l.notes ?? '').includes(serial),
    );

    if (!license) {
      throw new NotFoundException(
        'License Number tidak dikenali. Periksa kembali nomor seri pada sertifikat.',
      );
    }

    if (license.expiresAt && license.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException('Masa berlaku lisensi telah berakhir.');
    }

    if (license.status === 'active') {
      throw new BadRequestException('Lisensi ini sudah dalam status ACTIVE.');
    }

    const updated = await this.prisma.license.update({
      where: { id: license.id },
      data: { status: 'active', activatedAt: new Date(), activatedById: userId },
      include: { modules: true },
    });

    await this.prisma.licenseModule.updateMany({
      where: { licenseId: license.id },
      data: { isActive: true, activatedAt: new Date(), activatedById: userId },
    });

    await this.prisma.licenseHistory.create({
      data: {
        licenseId: license.id,
        moduleCode: license.contractNumber ?? license.name,
        subLicenseCode: 'ALL',
        action: 'activated',
        performedById: userId,
        details: { serialNumber: serial, modules: license.modules.length },
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'license:activate',
        resource: serial,
        resourceId: license.id,
        statusCode: 200,
      },
    });

    return updated;
  }

  /** Mengunci kembali sebuah sertifikat beserta seluruh sub-modulnya. */
  async deactivateLicense(licenseId: string, userId: string) {
    const license = await this.prisma.license.findUnique({ where: { id: licenseId } });
    if (!license) throw new NotFoundException('License not found');

    const updated = await this.prisma.license.update({
      where: { id: licenseId },
      data: { status: 'inactive' },
    });

    await this.prisma.licenseModule.updateMany({
      where: { licenseId },
      data: { isActive: false },
    });

    await this.prisma.licenseHistory.create({
      data: {
        licenseId,
        moduleCode: license.contractNumber ?? license.name,
        subLicenseCode: 'ALL',
        action: 'deactivated',
        performedById: userId,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'license:deactivate',
        resource: license.licenseKey,
        resourceId: licenseId,
        statusCode: 200,
      },
    });

    return updated;
  }

  async activateModule(subLicenseCode: string, subLicenseKey: string, userId: string) {
    const module = await this.prisma.licenseModule.findFirst({
      where: { subLicenseCode },
    });
    if (!module) throw new NotFoundException(`Module ${subLicenseCode} not found`);
    if (module.isActive) throw new BadRequestException('Module already active');

    // Validate activation key
    if (module.subLicenseKey && module.subLicenseKey !== subLicenseKey) {
      throw new BadRequestException('Invalid activation key');
    }

    const updated = await this.prisma.licenseModule.update({
      where: { id: module.id },
      data: {
        isActive: true,
        activatedAt: new Date(),
        activatedById: userId,
      },
    });

    // Record history
    await this.prisma.licenseHistory.create({
      data: {
        licenseId: module.licenseId,
        moduleCode: module.moduleCode,
        subLicenseCode: module.subLicenseCode,
        action: 'activated',
        performedById: userId,
        details: { subLicenseKey },
      },
    });

    // Audit log
    await this.prisma.auditLog.create({
      data: {
        userId,
        action: 'license:activate',
        resource: `Module ${subLicenseCode}`,
        resourceId: module.id,
        statusCode: 200,
      },
    });

    return updated;
  }

  async deactivateModule(subLicenseCode: string, userId: string) {
    const module = await this.prisma.licenseModule.findFirst({
      where: { subLicenseCode },
    });
    if (!module) throw new NotFoundException(`Module ${subLicenseCode} not found`);
    if (!module.isActive) throw new BadRequestException('Module already inactive');

    const updated = await this.prisma.licenseModule.update({
      where: { id: module.id },
      data: { isActive: false },
    });

    await this.prisma.licenseHistory.create({
      data: {
        licenseId: module.licenseId,
        moduleCode: module.moduleCode,
        subLicenseCode: module.subLicenseCode,
        action: 'deactivated',
        performedById: userId,
      },
    });

    return updated;
  }

  async getHistory(limit = 50) {
    return this.prisma.licenseHistory.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: { performedBy: { select: { username: true, fullName: true } } },
    });
  }

  async acquireSeat(licenseId: string, userId: string, ipAddress?: string) {
    const license = await this.prisma.license.findUnique({
      where: { id: licenseId },
      include: { seats: { where: { isActive: true } } },
    });
    if (!license) throw new NotFoundException('License not found');
    if (license.seats.length >= license.maxSeats) {
      throw new BadRequestException(`Maximum seats (${license.maxSeats}) reached`);
    }

    return this.prisma.licenseSeat.upsert({
      where: { uq_seat_user: { licenseId, userId } },
      create: { licenseId, userId, ipAddress, isActive: true },
      update: { isActive: true, ipAddress, lastActivity: new Date() },
    });
  }
}
