import { Injectable } from '@nestjs/common';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

import { PrismaService } from '../prisma/prisma.service';
import { AccessService } from '../access/access.service';
import { AccessDenied, NotFound, ValidationFailed } from '../common/errors';

export enum EvidenceTypeDto {
  NOTE = 'NOTE',
  URL = 'URL',
  FILE = 'FILE',
  VERSION_REFERENCE = 'VERSION_REFERENCE',
}

export class CreateEvidenceDto {
  @IsEnum(EvidenceTypeDto)
  type!: EvidenceTypeDto;

  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  sourceUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  fileName?: string | null;

  /** Where the file is kept in the group's own storage (we only keep the reference, BR-19). */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  filePath?: string | null;

  /** File name, version number or update date the evidence refers to (FR-26). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  versionReference?: string | null;
}

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly access: AccessService,
  ) {}

  async create(userId: string, requirementId: string, dto: CreateEvidenceDto) {
    const { requirement, target, role } = await this.access.forRequirement(
      userId,
      requirementId,
    );
    this.access.assertWritable(target);

    if (role !== 'MAIN_AUTHOR' && role !== 'CO_AUTHOR') {
      throw new AccessDenied('Chỉ Main Author hoặc Co-author mới được thêm Evidence.');
    }

    // FR-25: the evidence kind decides which reference is mandatory — never a file upload for everything (BR-17).
    if (dto.type === 'URL' && !dto.sourceUrl) {
      throw new ValidationFailed('Evidence dạng URL cần có đường dẫn.');
    }
    if (dto.type === 'FILE' && !dto.fileName) {
      throw new ValidationFailed('Evidence dạng tệp cần có tên tệp.');
    }
    if (dto.type === 'VERSION_REFERENCE' && !dto.versionReference) {
      throw new ValidationFailed('Evidence dạng tham chiếu phiên bản cần có phiên bản/tên tệp/ngày cập nhật.');
    }

    // Note: adding Evidence never changes the Requirement status (BR-06, BR-07).
    const evidence = await this.prisma.evidence.create({
      data: {
        requirementId: requirement.id,
        type: dto.type,
        description: dto.description.trim(),
        sourceUrl: dto.sourceUrl?.trim() || null,
        fileName: dto.fileName?.trim() || null,
        filePath: dto.filePath?.trim() || null,
        versionReference: dto.versionReference?.trim() || null,
        createdById: userId,
      },
    });

    return { id: evidence.id };
  }

  async remove(userId: string, evidenceId: string) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id: evidenceId },
    });
    if (!evidence) throw new NotFound('Không tìm thấy Evidence.');

    const { target, role } = await this.access.forRequirement(
      userId,
      evidence.requirementId,
    );
    this.access.assertWritable(target);

    if (evidence.createdById !== userId && role !== 'MAIN_AUTHOR') {
      throw new AccessDenied('Chỉ người tạo hoặc Main Author mới được xóa Evidence.');
    }

    await this.prisma.evidence.delete({ where: { id: evidenceId } });
    return { ok: true };
  }
}
