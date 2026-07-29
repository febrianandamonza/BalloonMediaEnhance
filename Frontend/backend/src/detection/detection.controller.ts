import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Detection')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('detection')
export class DetectionController {
  constructor(private prisma: PrismaService) {}

  @Get('sessions')
  @ApiOperation({ summary: 'List detection sessions (image + video)' })
  async getSessions(
    @Query('type') type?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.detectionSession.findMany({
      where: type ? { type } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit || '50'),
      include: {
        device: { select: { name: true } },
        startedBy: { select: { username: true, fullName: true } },
        results: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  @Post('sessions')
  @Roles('operator', 'supervisor')
  @ApiOperation({ summary: 'Start detection session' })
  async startSession(
    @Body() body: { deviceId?: string; siteId: string; type: string; subLicense: string; modelName?: string },
    @Req() req: any,
  ) {
    const session = await this.prisma.detectionSession.create({
      data: {
        deviceId: body.deviceId,
        siteId: body.siteId,
        startedById: req.user.id,
        type: body.type,
        subLicense: body.subLicense,
        modelName: body.modelName || 'yolov8',
        status: 'running',
        startedAt: new Date(),
      },
    });

    await this.prisma.auditLog.create({
      data: {
        userId: req.user.id,
        action: `detection:start:${body.type}`,
        resource: 'DetectionSession',
        resourceId: session.id,
        statusCode: 201,
      },
    });

    return session;
  }

  @Post('sessions/:id/result')
  @ApiOperation({ summary: 'Add detection result' })
  async addResult(
    @Param('id') sessionId: string,
    @Body() body: {
      frameNumber?: number;
      objects: any;
      totalObjects: number;
      processingMs?: number;
      imagePath?: string;
    },
  ) {
    return this.prisma.detectionResult.create({
      data: {
        sessionId,
        frameNumber: body.frameNumber,
        objects: body.objects,
        totalObjects: body.totalObjects,
        processingMs: body.processingMs,
        imagePath: body.imagePath,
      },
    });
  }

  @Get('results')
  @ApiOperation({ summary: 'List detection results' })
  async getResults(
    @Query('sessionId') sessionId?: string,
    @Query('limit') limit?: string,
  ) {
    return this.prisma.detectionResult.findMany({
      where: sessionId ? { sessionId } : {},
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit || '100'),
    });
  }
}
