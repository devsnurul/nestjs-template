import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TokenService } from './token.service';
import { env } from '../../config/env/index';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: env.jwt.secret,
      signOptions: { expiresIn: env.jwt.accessExpiry },
    }),
  ],
  providers: [TokenService],
  exports: [TokenService],
})
export class TokenModule {}
