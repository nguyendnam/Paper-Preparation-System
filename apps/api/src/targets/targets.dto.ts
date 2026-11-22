import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class TargetFieldsDto {
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  conferenceName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  acronym?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  edition?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  conferenceYear?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  track?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  cfpUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  authorGuidelinesUrl?: string | null;

  /** IANA time zone announced by the conference, e.g. "Anywhere on Earth" => "Etc/GMT+12". */
  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsDateString()
  abstractDeadline?: string | null;

  @IsOptional()
  @IsDateString()
  fullPaperDeadline?: string | null;

  @IsOptional()
  @IsDateString()
  notificationDate?: string | null;

  /** BR-15: where the deadline information comes from. */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deadlineSource?: string | null;
}

export class UpdateTargetDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(240)
  conferenceName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  acronym?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  edition?: string | null;

  @IsOptional()
  @IsInt()
  @Min(1990)
  @Max(2100)
  conferenceYear?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  track?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  cfpUrl?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  authorGuidelinesUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  timezone?: string;

  @IsOptional()
  @IsDateString()
  abstractDeadline?: string | null;

  @IsOptional()
  @IsDateString()
  fullPaperDeadline?: string | null;

  @IsOptional()
  @IsDateString()
  notificationDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  deadlineSource?: string | null;
}

export class ArchiveTargetDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;
}

export class TransferTargetDto {
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  reason?: string;

  @ValidateNested()
  @Type(() => TargetFieldsDto)
  newTarget!: TargetFieldsDto;

  /** FR-43: requirements chosen for a controlled copy. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  copyRequirementIds?: string[];

  /** FR-44: tasks chosen for a controlled copy. */
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsUUID('all', { each: true })
  copyTaskIds?: string[];
}

export enum TargetStatusFilter {
  ACTIVE = 'ACTIVE',
  ARCHIVED = 'ARCHIVED',
}

export class ListTargetsQuery {
  @IsOptional()
  @IsEnum(TargetStatusFilter)
  status?: TargetStatusFilter;

  @IsOptional()
  @IsUUID()
  paperId?: string;
}
