import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PermissionGuard } from './permission.guard';
import { RbacModule } from '../../modules/rbac/rbac.module';

@Module({
  imports: [RbacModule],
  providers: [
    {
      provide: APP_GUARD,
      useClass: PermissionGuard,
    },
  ],
})
export class RbacGuardModule {}
