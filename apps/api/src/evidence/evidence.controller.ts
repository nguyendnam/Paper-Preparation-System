import {
  Body,
  Controller,
  Delete,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { CreateEvidenceDto, EvidenceService } from './evidence.service';

@ApiTags('evidence')
@Controller()
export class EvidenceController {
  constructor(private readonly evidence: EvidenceService) {}

  @Post('requirements/:requirementId/evidence')
  create(
    @CurrentUser() user: AuthUser,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.evidence.create(user.id, requirementId, dto);
  }

  @Delete('evidence/:evidenceId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('evidenceId', ParseUUIDPipe) evidenceId: string,
  ) {
    return this.evidence.remove(user.id, evidenceId);
  }
}
