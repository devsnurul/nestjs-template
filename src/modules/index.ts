import { Module } from '@nestjs/common';
import { UserModule } from './user/user.module';
import { AuthModule } from './auth/auth.module';
import { StoredObjectModule } from './stored-object/stored-object.module';
import { SessionsModule } from './sessions/sessions.module';
import { RbacModule } from './rbac/rbac.module';
import { DocumentCategoryModule } from './document-category/document-category.module';

@Module({
  imports: [
    UserModule,
    AuthModule,
    StoredObjectModule,
    SessionsModule,
    RbacModule,
    DocumentCategoryModule,
  ],
})
export class Modules {}
