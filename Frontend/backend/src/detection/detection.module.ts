import { Module } from '@nestjs/common';
import { DetectionController } from './detection.controller';

@Module({
  controllers: [DetectionController],
})
export class DetectionModule {}
