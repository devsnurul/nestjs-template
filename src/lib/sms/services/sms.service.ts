import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  SmsMessage,
  SmsSendOptions,
  SmsSendJobPayload,
} from '../interfaces/index';
import { SMS_QUEUE } from '../constants/index';
import { env } from '../../../config/env/index';

@Injectable()
export class SmsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SmsService.name);
  private buffer: SmsMessage[] = [];
  private flushTimer?: NodeJS.Timeout;

  constructor(@InjectQueue(SMS_QUEUE) private readonly smsQueue: Queue) {}

  onModuleInit(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, env.sms.flushIntervalMs);
    this.flushTimer.unref?.();
  }

  onModuleDestroy(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    this.flush();
  }

  send(to: string, body: string, options: SmsSendOptions = {}): void {
    this.buffer.push({
      to,
      body,
      from: options.from,
      mediaUrl: options.mediaUrl,
    });

    if (this.buffer.length >= env.sms.batchSize) {
      this.flush();
    }
  }

  sendNow(
    to: string,
    body: string,
    options: SmsSendOptions = {},
  ): Promise<unknown> {
    const payload: SmsSendJobPayload = {
      messages: [{ to, body, from: options.from, mediaUrl: options.mediaUrl }],
    };
    return this.enqueue(payload);
  }

  private flush(): void {
    if (this.buffer.length === 0) {
      return;
    }

    const messages = this.buffer;
    this.buffer = [];

    void this.enqueue({ messages }).catch((error) => {
      this.logger.error(
        `Failed to enqueue ${messages.length} SMS messages: ${error}`,
      );
    });
  }

  private enqueue(payload: SmsSendJobPayload): Promise<unknown> {
    return this.smsQueue.add('send', payload, {
      removeOnComplete: { age: env.sms.queueTtl },
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 },
    });
  }
}
