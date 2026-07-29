import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { LicensesModule } from './licenses/licenses.module';
import { TelemetryModule } from './telemetry/telemetry.module';
import { HealthModule } from './health/health.module';
import { AuditModule } from './audit/audit.module';
import { CrowdModule } from './crowd/crowd.module';
import { DetectionModule } from './detection/detection.module';
import { SitesModule } from './sites/sites.module';
import { AlertsModule } from './alerts/alerts.module';

@Module({
  imports: [
    // Layer 2: Config
    ConfigModule.forRoot({ isGlobal: true, envFilePath: '.env' }),

    // Layer 9: Rate Limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },   // 10 req/sec
      { name: 'medium', ttl: 60000, limit: 100 }, // 100 req/min
      { name: 'long', ttl: 3600000, limit: 1000 }, // 1000 req/hr
    ]),

    // Layer 3: Database
    PrismaModule,

    // Layer 4: Auth
    AuthModule,

    // Core Modules
    UsersModule,
    LicensesModule,
    TelemetryModule,
    HealthModule,
    AuditModule,
    CrowdModule,
    DetectionModule,
    SitesModule,
    AlertsModule,
  ],
  providers: [
    // Apply rate limiting globally
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
