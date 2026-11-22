import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { RequirementsService } from './requirements.service';
import {
  CreateRequirementDto,
  LinkTasksDto,
  ListRequirementsQuery,
  UpdateRequirementDto,
} from './requirements.dto';

@ApiTags('requirements')
@Controller()
export class RequirementsController {
  constructor(private readonly requirements: RequirementsService) {}

  @Get('targets/:targetId/requirements')
  list(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Query() query: ListRequirementsQuery,
  ) {
    return this.requirements.list(user.id, targetId, query);
  }

  @Post('targets/:targetId/requirements')
  create(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: CreateRequirementDto,
  ) {
    return this.requirements.create(user.id, targetId, dto);
  }

  @Get('requirements/:requirementId')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
  ) {
    return this.requirements.detail(user.id, requirementId);
  }

  @Patch('requirements/:requirementId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: UpdateRequirementDto,
  ) {
    return this.requirements.update(user.id, requirementId, dto);
  }

  @Delete('requirements/:requirementId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
  ) {
    return this.requirements.remove(user.id, requirementId);
  }

  @Put('requirements/:requirementId/tasks')
  linkTasks(
    @CurrentUser() user: AuthUser,
    @Param('requirementId', ParseUUIDPipe) requirementId: string,
    @Body() dto: LinkTasksDto,
  ) {
    return this.requirements.linkTasks(user.id, requirementId, dto.taskIds);
  }
}
