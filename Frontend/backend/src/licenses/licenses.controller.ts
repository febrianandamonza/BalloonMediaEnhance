import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { LicensesService } from './licenses.service';
import { Roles, RolesGuard } from '../auth/guards/roles.guard';

@ApiTags('Licenses')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('licenses')
export class LicensesController {
  constructor(private licensesService: LicensesService) {}

  @Get()
  @ApiOperation({ summary: 'List all issued certificates with their sub-modules' })
  getLicenses() { return this.licensesService.getLicenses(); }

  @Post('activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activate a certificate by its printed License Number' })
  activateLicense(@Body() body: { serialNumber: string }, @Req() req: any) {
    return this.licensesService.activateLicense(body.serialNumber, req.user.id);
  }

  @Post(':id/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Lock a certificate and all of its sub-modules' })
  deactivateLicense(@Param('id') id: string, @Req() req: any) {
    return this.licensesService.deactivateLicense(id, req.user.id);
  }

  @Post('modules/:code/activate')
  @Roles('admin')
  @ApiOperation({ summary: 'Activate a license module' })
  activateModule(@Param('code') code: string, @Body() body: { key: string }, @Req() req: any) {
    return this.licensesService.activateModule(code, body.key, req.user.id);
  }

  @Post('modules/:code/deactivate')
  @Roles('admin')
  @ApiOperation({ summary: 'Deactivate a license module' })
  deactivateModule(@Param('code') code: string, @Req() req: any) {
    return this.licensesService.deactivateModule(code, req.user.id);
  }

  @Get('history')
  @Roles('admin')
  @ApiOperation({ summary: 'Get license activation history' })
  getHistory(@Query('limit') limit?: string) {
    return this.licensesService.getHistory(limit ? parseInt(limit) : 50);
  }
}
