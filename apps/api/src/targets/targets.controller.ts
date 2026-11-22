import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { TargetsService } from './targets.service';
import {
  ArchiveTargetDto,
  ListTargetsQuery,
  TargetFieldsDto,
  TransferTargetDto,
  UpdateTargetDto,
} from './targets.dto';

@ApiTags('targets')
@Controller()
export class TargetsController {
  constructor(private readonly targets: TargetsService) {}

  @Get('targets')
  list(@CurrentUser() user: AuthUser, @Query() query: ListTargetsQuery) {
    return this.targets.list(user.id, query);
  }

  @Post('papers/:paperId/targets')
  create(
    @CurrentUser() user: AuthUser,
    @Param('paperId', ParseUUIDPipe) paperId: string,
    @Body() dto: TargetFieldsDto,
  ) {
    return this.targets.create(user.id, paperId, dto);
  }

  @Get('targets/:targetId')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.targets.detail(user.id, targetId);
  }

  @Patch('targets/:targetId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: UpdateTargetDto,
  ) {
    return this.targets.update(user.id, targetId, dto);
  }

  @Get('targets/:targetId/readiness')
  readiness(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
  ) {
    return this.targets.readinessView(user.id, targetId);
  }

  @Post('targets/:targetId/archive')
  archive(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: ArchiveTargetDto,
  ) {
    return this.targets.archive(user.id, targetId, dto.reason);
  }

  @Post('targets/:targetId/transfer')
  transfer(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: TransferTargetDto,
  ) {
    return this.targets.transfer(user.id, targetId, dto);
  }
}
