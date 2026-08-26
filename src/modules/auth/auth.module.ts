import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PasswordService } from '../../lib/password/password.service';
import { MailModule } from '../../lib/mail/mail.module';
import { RbacModule } from '../rbac/rbac.module';

@Module({
  imports: [RbacModule, MailModule],
  controllers: [AuthController],
  providers: [AuthService, PasswordService],
})
export class AuthModule {}
