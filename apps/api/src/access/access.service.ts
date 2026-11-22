import { Injectable } from '@nestjs/common';
import type { GroupRole } from '@prisma/client';
import {
  canAddEvidence,
  canConfirmRequirement,
  canManageTarget,
} from '@paper/domain';

import { PrismaService } from '../prisma/prisma.service';
import { AccessDenied, NotFound, TargetArchived } from '../common/errors';

export interface Permissions {
  role: GroupRole;
  canManage: boolean;
  canConfirm: boolean;
  canAddEvidence: boolean;
}

export function permissionsFor(role: GroupRole): Permissions {
  return {
    role,
    canManage: canManageTarget(role),
    canConfirm: canConfirmRequirement(role),
    canAddEvidence: canAddEvidence(role),
  };
}

/**
 * Central place for resource-level authorization (NFR-02, NFR-10).
 * Users that are not members of the owning group receive NOT_FOUND so the
 * existence of unpublished manuscripts is not revealed.
 */
@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  async groupRole(userId: string, groupId: string): Promise<GroupRole> {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new NotFound();
    return membership.role;
  }

  async groupIdsOf(userId: string): Promise<string[]> {
    const rows = await this.prisma.groupMembership.findMany({
      where: { userId },
      select: { groupId: true },
    });
    return rows.map((r) => r.groupId);
  }

  async forPaper(userId: string, paperId: string) {
    const paper = await this.prisma.paper.findUnique({
      where: { id: paperId },
    });
    if (!paper) throw new NotFound('Không tìm thấy bài báo.');
    const role = await this.groupRole(userId, paper.groupId);
    return { paper, role };
  }

  async forTarget(userId: string, targetId: string) {
    const target = await this.prisma.submissionTarget.findUnique({
      where: { id: targetId },
      include: { paper: true },
    });
    if (!target) throw new NotFound('Không tìm thấy Submission Target.');
    const role = await this.groupRole(userId, target.paper.groupId);
    return { target, paper: target.paper, role };
  }

  async forRequirement(userId: string, requirementId: string) {
    const requirement = await this.prisma.requirement.findUnique({
      where: { id: requirementId },
      include: { target: { include: { paper: true } } },
    });
    if (!requirement) throw new NotFound('Không tìm thấy Requirement.');
    const role = await this.groupRole(userId, requirement.target.paper.groupId);
    return {
      requirement,
      target: requirement.target,
      paper: requirement.target.paper,
      role,
    };
  }

  async forTask(userId: string, taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
      include: { target: { include: { paper: true } } },
    });
    if (!task) throw new NotFound('Không tìm thấy Task.');
    const role = await this.groupRole(userId, task.target.paper.groupId);
    return { task, target: task.target, paper: task.target.paper, role };
  }

  /** BR-10 / FR-40: an ARCHIVED target is read-only. */
  assertWritable(target: { status: string }) {
    if (target.status !== 'ACTIVE') throw new TargetArchived();
  }

  assertManage(role: GroupRole) {
    if (!canManageTarget(role)) {
      throw new AccessDenied('Chỉ Main Author mới được thực hiện thao tác này.');
    }
  }
}
