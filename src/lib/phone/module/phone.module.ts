import { Global, Module } from '@nestjs/common';
import { PhoneService } from '../services/index';

@Global()
@Module({
  providers: [PhoneService],
  exports: [PhoneService],
})
export class PhoneModule {}
