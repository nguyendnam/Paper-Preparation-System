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
import { PapersService } from './papers.service';
import { CreatePaperDto, ListPapersQuery, UpdatePaperDto } from './papers.dto';

@ApiTags('papers')
@Controller('papers')
export class PapersController {
  constructor(private readonly papers: PapersService) {}

  @Get()
  list(@CurrentUser() user: AuthUser, @Query() query: ListPapersQuery) {
    return this.papers.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePaperDto) {
    return this.papers.create(user.id, dto);
  }

  @Get(':paperId')
  detail(
    @CurrentUser() user: AuthUser,
    @Param('paperId', ParseUUIDPipe) paperId: string,
  ) {
    return this.papers.detail(user.id, paperId);
  }

  @Patch(':paperId')
  update(
    @CurrentUser() user: AuthUser,
    @Param('paperId', ParseUUIDPipe) paperId: string,
    @Body() dto: UpdatePaperDto,
  ) {
    return this.papers.update(user.id, paperId, dto);
  }
}
