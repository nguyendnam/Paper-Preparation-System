import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHash, randomBytes } from 'node:crypto';
import * as bcrypt from 'bcryptjs';

import { PrismaService } from '../prisma/prisma.service';
import { AuthRequired, Conflict, ValidationFailed } from '../common/errors';
import type { AuthUser } from './auth.decorators';

const hashToken = (token: string) =>
  createHash('sha256').update(token).digest('hex');

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  get cookieName(): string {
    return this.config.get<string>('SESSION_COOKIE_NAME') ?? 'paper_session';
  }

  get ttlMs(): number {
    const hours = Number(this.config.get('SESSION_TTL_HOURS') ?? 8);
    return (Number.isFinite(hours) && hours > 0 ? hours : 8) * 3_600_000;
  }

  async register(input: {
    email: string;
    displayName: string;
    password: string;
    groupName?: string;
  }) {
    const email = input.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) {
      throw new Conflict('EMAIL_TAKEN', 'Email này đã được đăng ký.');
    }

    const passwordHash = await bcrypt.hash(input.password, 10);

    const user = await this.prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          email,
          displayName: input.displayName.trim(),
          passwordHash,
        },
      });

      const groupName = input.groupName?.trim();
      if (groupName) {
        const group = await tx.researchGroup.create({
          data: { name: groupName },
        });
        await tx.groupMembership.create({
          data: {
            groupId: group.id,
            userId: created.id,
            role: 'MAIN_AUTHOR',
          },
        });
      }

      return created;
    });

    const token = await this.createSession(user.id);
    return { token, user: this.toAuthUser(user) };
  }

  async login(emailInput: string, password: string) {
    const email = emailInput.trim().toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Same message for unknown e-mail and wrong password.
    const ok =
      user !== null &&
      user.isActive &&
      (await bcrypt.compare(password, user.passwordHash));

    if (!ok || !user) {
      throw new AuthRequired('Email hoặc mật khẩu không đúng.');
    }

    const token = await this.createSession(user.id);
    return { token, user: this.toAuthUser(user) };
  }

  async logout(token: string | undefined) {
    if (!token) return;
    await this.prisma.userSession.deleteMany({
      where: { tokenHash: hashToken(token) },
    });
  }

  async validate(token: string | undefined): Promise<AuthUser> {
    if (!token) throw new AuthRequired();

    const session = await this.prisma.userSession.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!session || session.expiresAt.getTime() < Date.now()) {
      if (session) {
        await this.prisma.userSession.delete({ where: { id: session.id } });
      }
      throw new AuthRequired('Phiên đăng nhập đã hết hạn.');
    }

    if (!session.user.isActive) throw new AuthRequired();

    return this.toAuthUser(session.user);
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      include: {
        memberships: {
          include: { group: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      memberships: user.memberships.map((m) => ({
        groupId: m.groupId,
        groupName: m.group.name,
        role: m.role,
      })),
    };
  }

  async changePassword(userId: string, current: string, next: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
    });

    if (!(await bcrypt.compare(current, user.passwordHash))) {
      throw new ValidationFailed('Mật khẩu hiện tại không đúng.');
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash: await bcrypt.hash(next, 10) },
    });
  }

  private async createSession(userId: string): Promise<string> {
    const token = randomBytes(32).toString('base64url');

    await this.prisma.userSession.create({
      data: {
        tokenHash: hashToken(token),
        userId,
        expiresAt: new Date(Date.now() + this.ttlMs),
      },
    });

    // Opportunistic cleanup of expired sessions.
    await this.prisma.userSession.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });

    return token;
  }

  private toAuthUser(user: {
    id: string;
    email: string;
    displayName: string;
  }): AuthUser {
    return { id: user.id, email: user.email, displayName: user.displayName };
  }
}
