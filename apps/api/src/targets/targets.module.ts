import { Module } from '@nestjs/common';

import { ReadinessModule } from './readiness.service';
import { TargetsController } from './targets.controller';
import { TargetsService } from './targets.service';

@Module({
  imports: [ReadinessModule],
  controllers: [TargetsController],
  providers: [TargetsService],
})
export class TargetsModule {}
