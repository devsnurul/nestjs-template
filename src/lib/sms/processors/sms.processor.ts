import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import twilio from 'twilio';
import { SMS_QUEUE } from '../constants/index';
import { SmsMessage, SmsSendJobPayload } from '../interfaces/index';
import { env } from '../../../config/env/index';

const isConfigured = Boolean(env.sms.accountSid && env.sms.authToken);

const client = isConfigured
  ? twilio(env.sms.accountSid, env.sms.authToken)
  : null;

@Processor(SMS_QUEUE)
export class SmsProcessor extends WorkerHost {
  private readonly logger = new Logger(SmsProcessor.name);

  async process(job: Job<SmsSendJobPayload>): Promise<void> {
    if (!isConfigured || !client) {
      this.logger.warn(
        'Twilio SMS not configured; skipping SMS queue job. Set TWILIO_ACCOUNT_SID/TWILIO_AUTH_TOKEN.',
      );
      return;
    }

    const messages = this.resolveMessages(job.data);

    if (messages.length === 0) {
      return;
    }

    for (const message of messages) {
      try {
        await client.messages.create({
          to: message.to,
          from: message.from ?? env.sms.from,
          body: message.body,
          mediaUrl: message.mediaUrl,
        });
        this.logger.debug(`SMS sent to ${message.to}`);
      } catch (error) {
        this.logger.error(`Failed to send SMS to ${message.to}: ${error}`);
        throw error;
      }
    }
  }

  private resolveMessages(data: SmsSendJobPayload): SmsMessage[] {
    if (data && Array.isArray(data.messages)) {
      return data.messages.filter(
        (message) => message && message.to && message.body,
      );
    }
    return [];
  }
}
