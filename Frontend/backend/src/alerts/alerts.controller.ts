import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List alerts' })
  async findAll(
    @Query('severity') severity?: string,
    @Query('acknowledged') acknowledged?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.alert.findMany({
      where: {
        ...(severity ? { severity } : {}),
        ...(acknowledged === 'true' ? { isAcknowledged: true } : {}),
        ...(acknowledged === 'false' ? { isAcknowledged: false } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit || '100'),
      include: {
        acknowledgedBy: { select: { username: true, fullName: true } },
      },
    });
  }

  @Post(':id/acknowledge')
  @Roles('operator', 'supervisor', 'technician')
  @ApiOperation({ summary: 'Acknowledge an alert' })
  async acknowledge(@Param('id') id: string, @Req() req: any) {
    const updated = await this.prisma.alert.update({
      where: { id },
      data: {
        isAcknowledged: true,
        acknowledgedById: req.user.id,
        acknowledgedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'alert:acknowledge',
        resource: 'Alert',
        resourceId: id,
        statusCode: 200,
      },
    });

    return updated;
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve an alert' })
  async resolve(@Param('id') id: string, @Body() body: { note?: string }, @Req() req: any) {
    return this.prisma.alert.update({
      where: { id },
      data: {
        isResolved: true,
        resolvedById: req.user.id,
        resolvedAt: new Date(),
        resolutionNote: body.note,
      },
    });
  }

  @Get('rules')
  @ApiOperation({ summary: 'List alert rules' })
  async getRules() {
    return this.prisma.alertRule.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('rules')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Create an alert rule' })
  async createRule(@Body() body: any, @Req() req: any) {
    return this.prisma.alertRule.create({
      data: { ...body, createdById: req.user.id },
    });
  }
}
