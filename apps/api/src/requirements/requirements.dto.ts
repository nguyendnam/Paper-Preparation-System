import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export enum RequirementTypeDto {
  MANDATORY = 'MANDATORY',
  OPTIONAL = 'OPTIONAL',
  RECOMMENDED = 'RECOMMENDED',
}

export enum RequirementStatusDto {
  NOT_REVIEWED = 'NOT_REVIEWED',
  NEEDS_ACTION = 'NEEDS_ACTION',
  PENDING_VERIFICATION = 'PENDING_VERIFICATION',
  VERIFIED = 'VERIFIED',
  NOT_APPLICABLE = 'NOT_APPLICABLE',
}

export enum RequirementSourceTypeDto {
  CFP = 'CFP',
  AUTHOR_GUIDELINES = 'AUTHOR_GUIDELINES',
  OTHER = 'OTHER',
}

export class CreateRequirementDto {
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description!: string;

  @IsEnum(RequirementTypeDto)
  type!: RequirementTypeDto;

  @IsEnum(RequirementSourceTypeDto)
  sourceType!: RequirementSourceTypeDto;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  sourceUrl?: string | null;

  /** Section / page of the source document (FR-11). */
  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceSection?: string | null;

  /** Applicability condition, e.g. "only for the full-paper track". */
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  condition?: string | null;

  @IsOptional()
  @IsBoolean()
  needsEvidence?: boolean;

  @IsOptional()
  @IsEnum(RequirementStatusDto)
  status?: RequirementStatusDto;
}

export class UpdateRequirementDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  description?: string;

  @IsOptional()
  @IsEnum(RequirementTypeDto)
  type?: RequirementTypeDto;

  @IsOptional()
  @IsEnum(RequirementSourceTypeDto)
  sourceType?: RequirementSourceTypeDto;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  sourceUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  sourceSection?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  condition?: string | null;

  @IsOptional()
  @IsBoolean()
  needsEvidence?: boolean;

  @IsOptional()
  @IsEnum(RequirementStatusDto)
  status?: RequirementStatusDto;
}

export class LinkTasksDto {
  @IsArray()
  @ArrayMaxSize(200)
  @IsUUID('all', { each: true })
  taskIds!: string[];
}

export class ListRequirementsQuery {
  @IsOptional()
  @IsEnum(RequirementStatusDto)
  status?: RequirementStatusDto;

  @IsOptional()
  @IsEnum(RequirementTypeDto)
  type?: RequirementTypeDto;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}
