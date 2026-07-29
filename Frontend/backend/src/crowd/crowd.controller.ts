import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Crowd Counting')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('crowd-counting')
export class CrowdCountingController {
  constructor(private prisma: PrismaService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List crowd counting sessions' })
  async getSessions(@Query('limit') limit?: string) {
    return this.prisma.crowdCountingSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit || '50'),
      include: {
        device: { select: { name: true, serialNumber: true } },
        startedBy: { select: { username: true, fullName: true } },
      },
    });
  }

  @Post('sessions')
  @Roles('operator', 'supervisor')
  @ApiOperation({ summary: 'Start a new crowd counting session' })
  async startSession(
    @Body() body: { deviceId: string; siteId: string; sourceName: string; sourceType: string; sourceAddress: string },
    @Req() req: any,
  ) {
    const session = await this.prisma.crowdCountingSession.create({
      data: {
        deviceId: body.deviceId,
        siteId: body.siteId,
        startedById: req.user.id,
        sourceName: body.sourceName,
        sourceType: body.sourceType,
        sourceAddress: body.sourceAddress,
        status: 'running',
        startedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: 'crowd:start',
        resource: 'CrowdCountingSession',
        resourceId: session.id,
        statusCode: 201,
      },
    });

    return session;
  }

  @Post('sessions/:id/stop')
  @ApiOperation({ summary: 'Stop a crowd counting session' })
  async stopSession(@Param('id') id: string) {
    return this.prisma.crowdCountingSession.update({
      where: { id },
      data: { status: 'completed', stoppedAt: new Date() },
    });
  }

  @Post('sessions/:id/count')
  @ApiOperation({ summary: 'Update crowd count for a session' })
  async updateCount(
    @Param('id') id: string,
    @Body() body: { avgCount: number; maxCount?: number; minCount?: number; totalFrames?: number },
  ) {
    return this.prisma.crowdCountingSession.update({
      where: { id },
      data: {
        avgCount: body.avgCount,
        maxCount: body.maxCount,
        minCount: body.minCount,
        totalFrames: body.totalFrames,
      },
    });
  }
}
