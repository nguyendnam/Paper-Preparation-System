import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { AccessModule } from './access/access.module';
import { HealthModule } from './health/health.module';
import { GroupsModule } from './groups/groups.module';
import { PapersModule } from './papers/papers.module';
import { TargetsModule } from './targets/targets.module';
import { RequirementsModule } from './requirements/requirements.module';
import { TasksModule } from './tasks/tasks.module';
import { EvidenceModule } from './evidence/evidence.module';
import { VerificationsModule } from './verifications/verifications.module';
import { DashboardModule } from './dashboard/dashboard.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    PrismaModule,
    AuthModule,
    AccessModule,
    HealthModule,
    GroupsModule,
    PapersModule,
    TargetsModule,
    RequirementsModule,
    TasksModule,
    EvidenceModule,
    VerificationsModule,
    DashboardModule,
  ],
})
export class AppModule {}
