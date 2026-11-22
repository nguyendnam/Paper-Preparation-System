import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class PaperAuthorDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  fullName!: string;

  @IsOptional()
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  affiliation?: string | null;

  @IsOptional()
  @IsBoolean()
  isCorresponding?: boolean;
}

export class CreatePaperDto {
  @IsUUID()
  groupId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  abstract?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  researchArea?: string | null;

  /** Link to the manuscript kept in an external tool (BR-19). */
  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  manuscriptUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PaperAuthorDto)
  authors?: PaperAuthorDto[];
}

export class UpdatePaperDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  abstract?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  researchArea?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  @MaxLength(1000)
  manuscriptUrl?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  notes?: string | null;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => PaperAuthorDto)
  authors?: PaperAuthorDto[];
}

export class ListPapersQuery {
  @IsOptional()
  @IsUUID()
  groupId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  q?: string;
}

