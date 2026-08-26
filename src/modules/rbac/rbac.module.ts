import { Module } from '@nestjs/common';
import { RoleController } from './controllers/role.controller';
import { UserRoleController } from './controllers/user-role.controller';
import { RoleService } from './services/role.service';
import { PermissionService } from './services/permission.service';
import { PermissionCacheService } from './services/permission-cache.service';

@Module({
  imports: [],
  controllers: [RoleController, UserRoleController],
  providers: [RoleService, PermissionService, PermissionCacheService],
  exports: [PermissionService, RoleService, PermissionCacheService],
})
export class RbacModule {}
