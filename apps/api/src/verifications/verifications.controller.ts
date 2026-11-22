import {
  Body,
  Controller,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import {
  CreateVerificationDto,
  VerificationsService,
} from './verifications.service';

@ApiTags('verifications')
@Controller()
export class VerificationsController {
  constructor(private readonly verifications: VerificationsService) {}

  @Post('requirements/:requirementId/verifications')
  create(
    @CurrentUser() user: AuthUser,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: CreateVerificationDto,
  ) {
    return this.verifications.create(user.id, requirementId, dto);
  }
}
