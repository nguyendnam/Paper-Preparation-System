import { Injectable } from '@nestjs/common';
import {
  canConfirmRequirement,
  requirementStatusAfterVerification,
} from '@paper/domain';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { AccessDenied, ValidationFailed } from '../common/errors';

export enum VerificationResultDto {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
  NEEDS_REVISION = 'NEEDS_REVISION',
}

export class CreateVerificationDto {
  @IsEnum(VerificationResultDto)
  result!: VerificationResultDto;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  note?: string | null;

  /** The evidence that was checked, if any (BR-08: verification is optional). */
  @IsOptional()
  @IsUUID()
  evidenceId?: string | null;
}

@Injectable()
export class VerificationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  /**
   * FR-28..FR-31: records who verified what and when, and moves the Requirement
   * status accordingly (PASSED -> VERIFIED, otherwise -> NEEDS_ACTION).
   */
  async create(userId: string, requirementId: string, dto: CreateVerificationDto) {
    const { requirement, target, role } = await this.access.forRequirement(
      userId,
      requirementId,
    );
    this.access.assertWritable(target);

    if (!canConfirmRequirement(role)) {
      throw new AccessDenied(
        'Chỉ Verifier, Supervisor hoặc Main Author mới được ghi nhận Verification.',
      );
    }

    if (dto.evidenceId) {
      const evidence = await this.prisma.evidence.findFirst({
        where: { id: dto.evidenceId, requirementId: requirement.id },
        select: { id: true },
      });
      if (!evidence) {
        throw new ValidationFailed('Evidence phải thuộc Requirement đang xác minh.');
      }
    }

    const nextStatus = requirementStatusAfterVerification(dto.result);

    const verification = await this.prisma.$transaction(async (tx) => {
      const created = await tx.verification.create({
        data: {
          requirementId: requirement.id,
          evidenceId: dto.evidenceId ?? null,
          verifierId: userId,
          result: dto.result,
          note: dto.note?.trim() || null,
        },
      });

      await tx.requirement.update({
        where: { id: requirement.id },
        data: { status: nextStatus },
      });

      return created;
    });

    return { id: verification.id, requirementStatus: nextStatus };
  }
}
