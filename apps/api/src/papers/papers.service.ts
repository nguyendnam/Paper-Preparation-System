import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService, permissionsFor } from '../access/access.service';
import { NotFound } from '../common/errors';
import {
  ReadinessService,
  compactReadiness,
} from '../targets/readiness.service';
import type {
  CreatePaperDto,
  PaperAuthorDto,
  UpdatePaperDto,
} from './papers.dto';

const toAuthorRows = (authors: PaperAuthorDto[]) =>
  authors.map((a, index) => ({
    fullName: a.fullName.trim(),
    email: a.email?.trim() || null,
    affiliation: a.affiliation?.trim() || null,
    position: index + 1,
    isCorresponding: a.isCorresponding ?? false,
  }));

@Injectable()
export class PapersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
    private readonly readiness: ReadinessService,
  ) {}

  async list(userId: string, filter: { groupId?: string; q?: string }) {
    const groupIds = await this.access.groupIdsOf(userId);
    if (filter.groupId && !groupIds.includes(filter.groupId)) {
      throw new NotFound();
    }

    const papers = await this.prisma.paper.findMany({
      where: {
        groupId: filter.groupId ? filter.groupId : { in: groupIds },
        ...(filter.q
          ? {
              OR: [
                { title: { contains: filter.q, mode: 'insensitive' } },
                { researchArea: { contains: filter.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        group: { select: { id: true, name: true } },
        authors: { orderBy: { position: 'asc' } },
        targets: {
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            conferenceName: true,
            acronym: true,
            conferenceYear: true,
            track: true,
            status: true,
            abstractDeadline: true,
            fullPaperDeadline: true,
            notificationDate: true,
            archivedAt: true,
          },
        },
      },
    });

    const active = papers
      .map((p) => p.targets.find((t) => t.status === 'ACTIVE'))
      .filter((t): t is NonNullable<typeof t> => Boolean(t));
    const summaries = await this.readiness.forTargets(active);

    return papers.map((p) => {
      const activeTarget = p.targets.find((t) => t.status === 'ACTIVE') ?? null;
      const summary = activeTarget ? summaries.get(activeTarget.id) : undefined;
      return {
        id: p.id,
        title: p.title,
        researchArea: p.researchArea,
        group: p.group,
        authors: p.authors.map((a) => a.fullName),
        targetCount: p.targets.length,
        activeTarget: activeTarget
          ? {
              ...activeTarget,
              readiness: summary ? compactReadiness(summary) : null,
            }
          : null,
        updatedAt: p.updatedAt,
      };
    });
  }

  async create(userId: string, dto: CreatePaperDto) {
    this.access.assertManage(await this.access.groupRole(userId, dto.groupId));

    const paper = await this.prisma.paper.create({
      data: {
        groupId: dto.groupId,
        title: dto.title.trim(),
        abstract: dto.abstract?.trim() || null,
        researchArea: dto.researchArea?.trim() || null,
        manuscriptUrl: dto.manuscriptUrl?.trim() || null,
        notes: dto.notes?.trim() || null,
        createdById: userId,
        authors: dto.authors?.length
          ? { create: toAuthorRows(dto.authors) }
          : undefined,
      },
    });

    return { id: paper.id };
  }

  async detail(userId: string, paperId: string) {
    const { paper, role } = await this.access.forPaper(userId, paperId);

    const full = await this.prisma.paper.findUniqueOrThrow({
      where: { id: paper.id },
      include: {
        group: { select: { id: true, name: true } },
        createdBy: { select: { id: true, displayName: true } },
        authors: { orderBy: { position: 'asc' } },
        targets: {
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { requirements: true, tasks: true } },
          },
        },
      },
    });

    const active = full.targets.filter((t) => t.status === 'ACTIVE');
    const summaries = await this.readiness.forTargets(active);

    return {
      ...full,
      targets: full.targets.map((t) => ({
        ...t,
        readiness: summaries.has(t.id)
          ? compactReadiness(summaries.get(t.id)!)
          : null,
      })),
      permissions: permissionsFor(role),
    };
  }

  async update(userId: string, paperId: string, dto: UpdatePaperDto) {
    const { role } = await this.access.forPaper(userId, paperId);
    this.access.assertManage(role);

    await this.prisma.$transaction(async (tx) => {
      await tx.paper.update({
        where: { id: paperId },
        data: {
          title: dto.title?.trim(),
          abstract: dto.abstract === undefined ? undefined : dto.abstract?.trim() || null,
          researchArea:
            dto.researchArea === undefined ? undefined : dto.researchArea?.trim() || null,
          manuscriptUrl:
            dto.manuscriptUrl === undefined ? undefined : dto.manuscriptUrl?.trim() || null,
          notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
        },
      });

      if (dto.authors) {
        await tx.paperAuthor.deleteMany({ where: { paperId } });
        if (dto.authors.length) {
          await tx.paperAuthor.createMany({
            data: toAuthorRows(dto.authors).map((a) => ({ ...a, paperId })),
          });
        }
      }
    });

    return { id: paperId };
  }
}
