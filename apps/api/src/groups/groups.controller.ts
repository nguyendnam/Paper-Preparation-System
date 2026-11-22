import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

import { AuthUser, CurrentUser } from '../auth/auth.decorators';
import { GroupsService } from './groups.service';

enum GroupRoleDto {
  MAIN_AUTHOR = 'MAIN_AUTHOR',
  CO_AUTHOR = 'CO_AUTHOR',
  VERIFIER = 'VERIFIER',
  SUPERVISOR = 'SUPERVISOR',
}

class CreateGroupDto {
  @IsString()
  @MinLength(1)
  @MaxLength(160)
  name!: string;
}

class AddMemberDto {
  @IsEmail()
  email!: string;

  @IsEnum(GroupRoleDto)
  role!: GroupRoleDto;
}

class ChangeRoleDto {
  @IsEnum(GroupRoleDto)
  role!: GroupRoleDto;
}

@ApiTags('groups')
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthUser) {
    return this.groups.listMine(user.id);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateGroupDto) {
    return this.groups.create(user.id, dto.name.trim());
  }

  @Post(':groupId/members')
  addMember(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AddMemberDto,
  ) {
    return this.groups.addMember(user.id, groupId, dto.email, dto.role);
  }

  @Patch(':groupId/members/:userId')
  changeRole(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) memberUserId: string,
    @Body() dto: ChangeRoleDto,
  ) {
    return this.groups.changeRole(user.id, groupId, memberUserId, dto.role);
  }

  @Delete(':groupId/members/:userId')
  remove(
    @CurrentUser() user: AuthUser,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) memberUserId: string,
  ) {
    return this.groups.removeMember(user.id, groupId, memberUserId);
  }
}
