import { Module } from '@nestjs/common';
import { CrowdCountingController } from './crowd.controller';

@Module({
  controllers: [CrowdCountingController],
})
export class CrowdModule {}
