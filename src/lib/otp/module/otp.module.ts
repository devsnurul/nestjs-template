import { Global, Module } from '@nestjs/common';
import { OtpService } from '../services/index';

@Global()
@Module({
  providers: [OtpService],
  exports: [OtpService],
})
export class OtpModule {}
