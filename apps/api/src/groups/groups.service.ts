import { Injectable } from '@nestjs/common';
import type { GroupRole } from '@prisma/client';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { Conflict, NotFound, ValidationFailed } from '../common/errors';

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async listMine(userId: string) {
    const groups = await this.prisma.researchGroup.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'asc' },
      include: {
        members: {
          include: {
            user: { select: { id: true, email: true, displayName: true } },
          },
          orderBy: { createdAt: 'asc' },
        },
        _count: { select: { papers: true } },
      },
    });

    return groups.map((g) => ({
      id: g.id,
      name: g.name,
      paperCount: g._count.papers,
      myRole: g.members.find((m) => m.userId === userId)?.role,
      members: g.members.map((m) => ({
        userId: m.userId,
        email: m.user.email,
        displayName: m.user.displayName,
        role: m.role,
        joinedAt: m.createdAt,
      })),
    }));
  }

  async create(userId: string, name: string) {
    const group = await this.prisma.$transaction(async (tx) => {
      const created = await tx.researchGroup.create({ data: { name } });
      await tx.groupMembership.create({
        data: { groupId: created.id, userId, role: 'MAIN_AUTHOR' },
      });
      return created;
    });
    return { id: group.id, name: group.name };
  }

  async addMember(
    userId: string,
    groupId: string,
    email: string,
    role: GroupRole,
  ) {
    this.access.assertManage(await this.access.groupRole(userId, groupId));

    const user = await this.prisma.user.findUnique({
      where: { email: email.trim().toLowerCase() },
    });
    if (!user) {
      throw new NotFound(
        'Chưa có tài khoản với email này. Hãy yêu cầu thành viên đăng ký trước.',
      );
    }

    const existing = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId: user.id } },
    });
    if (existing) {
      throw new Conflict('ALREADY_MEMBER', 'Người dùng đã là thành viên của nhóm.');
    }

    await this.prisma.groupMembership.create({
      data: { groupId, userId: user.id, role },
    });

    return { userId: user.id, email: user.email, displayName: user.displayName, role };
  }

  async changeRole(
    userId: string,
    groupId: string,
    memberUserId: string,
    role: GroupRole,
  ) {
    this.access.assertManage(await this.access.groupRole(userId, groupId));
    const membership = await this.mustFindMembership(groupId, memberUserId);

    if (membership.role === 'MAIN_AUTHOR' && role !== 'MAIN_AUTHOR') {
      await this.assertNotLastMainAuthor(groupId);
    }

    await this.prisma.groupMembership.update({
      where: { id: membership.id },
      data: { role },
    });
    return { userId: memberUserId, role };
  }

  async removeMember(userId: string, groupId: string, memberUserId: string) {
    const myRole = await this.access.groupRole(userId, groupId);
    // A member may leave by themselves; otherwise a Main Author is required.
    if (userId !== memberUserId) this.access.assertManage(myRole);

    const membership = await this.mustFindMembership(groupId, memberUserId);
    if (membership.role === 'MAIN_AUTHOR') {
      await this.assertNotLastMainAuthor(groupId);
    }

    await this.prisma.$transaction([
      // Open work of a removed member goes back to "unassigned" on active targets.
      this.prisma.task.updateMany({
        where: {
          assigneeId: memberUserId,
          status: { not: 'DONE' },
          target: { status: 'ACTIVE', paper: { groupId } },
        },
        data: { assigneeId: null },
      }),
      this.prisma.groupMembership.delete({ where: { id: membership.id } }),
    ]);

    return { ok: true };
  }

  private async mustFindMembership(groupId: string, userId: string) {
    const membership = await this.prisma.groupMembership.findUnique({
      where: { groupId_userId: { groupId, userId } },
    });
    if (!membership) throw new NotFound('Không tìm thấy thành viên.');
    return membership;
  }

  private async assertNotLastMainAuthor(groupId: string) {
    const count = await this.prisma.groupMembership.count({
      where: { groupId, role: 'MAIN_AUTHOR' },
    });
    if (count <= 1) {
      throw new ValidationFailed(
        'Nhóm cần có ít nhất một Main Author.',
      );
    }
  }
}
