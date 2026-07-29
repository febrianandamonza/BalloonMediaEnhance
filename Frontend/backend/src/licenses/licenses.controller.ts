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
  @ApiOperation({ summary: 'Get current license with all modules' })
  getLicense() { return this.licensesService.getLicense(); }

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
