import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { TasksService } from './tasks.service';
import {
  CreateTaskDto,
  ListMyTasksQuery,
  ListTasksQuery,
  UpdateTaskDto,
} from './tasks.dto';

@ApiTags('tasks')
@Controller()
export class TasksController {
  constructor(private readonly tasks: TasksService) {}

  @Get('me/tasks')
  mine(@CurrentUser() user: AuthUser, @Query() query: ListMyTasksQuery) {
    return this.tasks.mine(user.id, query);
  }

  @Get('targets/:targetId/tasks')
  list(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Query() query: ListTasksQuery,
  ) {
    return this.tasks.list(user.id, targetId, query);
  }

  @Post('targets/:targetId/tasks')
  create(
    @CurrentUser() user: AuthUser,
    @Param('targetId', ParseUUIDPipe) targetId: string,
    @Body() dto: CreateTaskDto,
  ) {
    return this.tasks.create(user.id, targetId, dto);
  }

  @Patch('tasks/:taskId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
    @Body() dto: UpdateTaskDto,
  ) {
    return this.tasks.update(user.id, taskId, dto);
  }

  @Delete('tasks/:taskId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('taskId', ParseUUIDPipe) taskId: string,
  ) {
    return this.tasks.remove(user.id, taskId);
  }
}
