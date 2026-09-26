import { Controller, Get, Post, Put, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Sites')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('sites')
export class SitesController {
  constructor(private prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'List all sites' })
  async findAll() {
    return this.prisma.site.findMany({
      include: {
        devices: { select: { id: true, name: true, type: true, status: true } },
        _count: { select: { devices: true, alerts: true, flights: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get site details with devices' })
  async findById(@Param('id') id: string) {
    return this.prisma.site.findUniqueOrThrow({
      where: { id },
      include: {
        devices: true,
        alerts: { take: 5, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  @Post()
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Create a new site' })
  async create(@Body() body: any) {
    return this.prisma.site.create({ data: body });
  }

  @Put(':id')
  @Roles('admin', 'supervisor')
  @ApiOperation({ summary: 'Update a site' })
  async update(@Param('id') id: string, @Body() body: any) {
    return this.prisma.site.update({ where: { id }, data: body });
  }
}
