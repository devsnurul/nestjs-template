import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { SMS_QUEUE } from '../constants/index';
import { SmsService } from '../services/index';
import { SmsProcessor } from '../processors/index';

@Global()
@Module({
  imports: [BullModule.registerQueue({ name: SMS_QUEUE })],
  providers: [SmsService, SmsProcessor],
  exports: [SmsService],
})
export class SmsModule {}
