import { Module } from '@nestjs/common';

import { ReadinessModule } from '../targets/readiness.service';
import { PapersController } from './papers.controller';
import { PapersService } from './papers.service';

@Module({
  imports: [ReadinessModule],
  controllers: [PapersController],
  providers: [PapersService],
})
export class PapersModule {}
