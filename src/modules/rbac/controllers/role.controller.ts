import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { RequirePermission } from '../../../decorators/permission.decorator';
import {
  SmartQuery,
  SmartQueryInterceptor,
  SmartQueryResult,
} from 'src/lib/query-pagination';
import { Prisma } from '@generated/prisma/client';
import { PermissionService } from '../services/permission.service';

@Controller({ version: '1', path: 'roles' })
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermission('role.create')
  create(@Body() dto: CreateRoleDto) {
    if (dto.rules) {
      dto.rules = PermissionService.normalizeRules(dto.rules);
    }
    return this.roleService.create(dto);
  }

  @Get()
  @RequirePermission('role.read')
  @UseInterceptors(new SmartQueryInterceptor())
  async findAll(@SmartQuery() query: SmartQueryResult<Prisma.RoleWhereInput>) {
    const { where, orderBy, skip, take, page, limit } = query;

    const result = await this.roleService.findAll({
      where,
      orderBy,
      skip,
      take,
    });

    return {
      data: result.data,
      meta: { page, limit, total: result.total },
    };
  }

  @Get(':id')
  @RequirePermission('role.read')
  findOne(@Param('id') id: string) {
    return this.roleService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('role.update')
  update(@Param('id') id: string, @Body() dto: UpdateRoleDto) {
    if (dto.rules) {
      dto.rules = PermissionService.normalizeRules(dto.rules);
    }
    return this.roleService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('role.delete')
  remove(@Param('id') id: string) {
    return this.roleService.remove(id);
  }
}
