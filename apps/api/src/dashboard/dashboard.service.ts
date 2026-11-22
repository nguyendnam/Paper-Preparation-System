import { Controller, Get, Injectable, Module } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { canConfirmRequirement } from '@paper/domain';

import { PrismaService } from '../prisma/prisma.service';
import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import {
  ReadinessModule,
  ReadinessService,
  compactReadiness,
} from '../targets/readiness.service';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly readiness: ReadinessService,
  ) {}

  async get(userId: string) {
    const memberships = await this.prisma.groupMembership.findMany({
      where: { userId },
    });
    const groupIds = memberships.map((m) => m.groupId);
    const confirmingGroupIds = memberships
      .filter((m) => canConfirmRequirement(m.role))
      .map((m) => m.groupId);

    const [targets, myTasks, pendingVerification, groupCount, paperCount] =
      await Promise.all([
        this.prisma.submissionTarget.findMany({
          where: { status: 'ACTIVE', paper: { groupId: { in: groupIds } } },
          include: { paper: { select: { id: true, title: true } } },
          orderBy: { fullPaperDeadline: { sort: 'asc', nulls: 'last' } },
        }),
        this.prisma.task.findMany({
          where: {
            assigneeId: userId,
            status: { not: 'DONE' },
            target: { status: 'ACTIVE', paper: { groupId: { in: groupIds } } },
          },
          orderBy: [{ dueAt: { sort: 'asc', nulls: 'last' } }, { createdAt: 'asc' }],
          take: 8,
          include: {
            target: {
              select: {
                id: true,
                conferenceName: true,
                acronym: true,
                paper: { select: { id: true, title: true } },
              },
            },
          },
        }),
        this.prisma.requirement.findMany({
          where: {
            status: 'PENDING_VERIFICATION',
            target: {
              status: 'ACTIVE',
              paper: { groupId: { in: confirmingGroupIds } },
            },
          },
          orderBy: { updatedAt: 'asc' },
          take: 8,
          select: {
            id: true,
            description: true,
            type: true,
            target: {
              select: {
                id: true,
                conferenceName: true,
                acronym: true,
                paper: { select: { id: true, title: true } },
              },
            },
          },
        }),
        this.prisma.groupMembership.count({ where: { userId } }),
        this.prisma.paper.count({ where: { groupId: { in: groupIds } } }),
      ]);

    const summaries = await this.readiness.forTargets(targets);
    const now = Date.now();

    const activeTargets = targets.map((t) => ({
      id: t.id,
      conferenceName: t.conferenceName,
      acronym: t.acronym,
      conferenceYear: t.conferenceYear,
      track: t.track,
      timezone: t.timezone,
      abstractDeadline: t.abstractDeadline,
      fullPaperDeadline: t.fullPaperDeadline,
      notificationDate: t.notificationDate,
      paper: t.paper,
      readiness: compactReadiness(summaries.get(t.id)!),
    }));

    const openMyTasks = await this.prisma.task.count({
      where: {
        assigneeId: userId,
        status: { not: 'DONE' },
        target: { status: 'ACTIVE', paper: { groupId: { in: groupIds } } },
      },
    });

    return {
      totals: {
        groups: groupCount,
        papers: paperCount,
        activeTargets: activeTargets.length,
        openMyTasks,
        mandatoryOutstanding: activeTargets.reduce(
          (n, t) => n + t.readiness.mandatoryOutstanding,
          0,
        ),
        pendingVerification: activeTargets.reduce(
          (n, t) => n + t.readiness.pendingVerification,
          0,
        ),
        overdueTasks: activeTargets.reduce((n, t) => n + t.readiness.overdueTasks, 0),
      },
      activeTargets,
      myTasks: myTasks.map((t) => ({
        ...t,
        overdue: t.dueAt !== null && t.dueAt.getTime() < now,
      })),
      pendingVerification,
    };
  }
}

@ApiTags('dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    return this.dashboard.get(user.id);
  }
}

@Module({
  imports: [ReadinessModule],
  controllers: [DashboardController],
  providers: [DashboardService],
})
export class DashboardModule {}
