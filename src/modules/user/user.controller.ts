import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  SmartQuery,
  SmartQueryInterceptor,
  SmartQueryResult,
} from 'src/lib/query-pagination';
import { userQueryConfig } from './user.constants';
import { Prisma } from '@generated/prisma/client';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller({ version: '1', path: 'users' })
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  create(@Body() dto: CreateUserDto, @CurrentUser('sub') uploaderId: string) {
    return this.userService.create(dto, uploaderId);
  }

  @Get()
  @UseInterceptors(new SmartQueryInterceptor(userQueryConfig))
  async findAll(
    @SmartQuery() query: SmartQueryResult<Prisma.UserWhereInput>,
    @Query('withDeleted') withDeleted?: string,
  ) {
    const { where, orderBy, skip, take, page, limit } = query;

    const result = await this.userService.findAll(
      { where, orderBy, skip, take },
      withDeleted === 'true',
    );

    return {
      data: result.data,
      meta: {
        page,
        limit,
        total: result.total,
      },
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.userService.findOneWithPhoto(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser('sub') uploaderId: string,
  ) {
    return this.userService.update(id, dto, uploaderId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }

  @Delete(':id/force')
  forceRemove(@Param('id') id: string, @CurrentUser('sub') uploaderId: string) {
    return this.userService.forceRemove(id, uploaderId);
  }

  @Post(':id/restore')
  restore(@Param('id') id: string) {
    return this.userService.restore(id);
  }
}
