import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { StoredObjectModule } from './stored-object/stored-object.module';
import { SessionsModule } from './sessions/sessions.module';
import { RbacModule } from './rbac/rbac.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    StoredObjectModule,
    SessionsModule,
    RbacModule,
  ],
})
export class Modules {}
