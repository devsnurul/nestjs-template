import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { RoleService } from '../services/role.service';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import { RequirePermission } from '../../../decorators/permission.decorator';

@Controller({ version: '1', path: 'user-roles' })
export class UserRoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @RequirePermission('user_role.assign')
  assign(@Body() dto: AssignUserRoleDto) {
    return this.roleService.assignUserRole(dto);
  }

  @Delete(':userId/:roleId')
  @RequirePermission('user_role.assign')
  remove(@Param('userId') userId: string, @Param('roleId') roleId: string) {
    return this.roleService.removeUserRole(userId, roleId);
  }

  @Get(':userId')
  @RequirePermission('user_role.read')
  getUserRoles(@Param('userId') userId: string) {
    return this.roleService.getUserRoles(userId);
  }
}
