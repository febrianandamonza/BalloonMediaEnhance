import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class LicensesService {
  constructor(private prisma: PrismaService) {}

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
