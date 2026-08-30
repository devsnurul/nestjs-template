import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
} from '@nestjs/common';
import {
  createHash,
  randomInt,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { SmsService } from '../../sms';
import { PhoneService } from '../../phone';
import { env } from '../../../config/env/index';
import { OtpPurpose } from '../constants/index';
import { OtpRequestResult, OtpVerifyResult } from '../interfaces/index';

const HASH_PART_SEPARATOR = '.';

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly smsService: SmsService,
    private readonly phoneService: PhoneService,
  ) {}

  async request(
    phoneInput: string,
    purpose: OtpPurpose,
  ): Promise<OtpRequestResult> {
    const phone = this.phoneService.normalize(phoneInput);
    const now = new Date();

    const existing = await this.prisma.otp.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (existing) {
      const elapsedMs = now.getTime() - existing.createdAt.getTime();
      const cooldownMs = env.otp.requestCooldownSeconds * 1000 - elapsedMs;
      if (cooldownMs > 0) {
        const cooldownSeconds = Math.ceil(cooldownMs / 1000);
        throw new HttpException(
          {
            message: 'Please wait before requesting another OTP.',
            cooldownSeconds,
          },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    await this.prisma.otp.updateMany({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      data: { expiresAt: now },
    });

    const code = this.generateCode();
    const salt = randomBytes(16).toString('hex');
    const codeHash = this.hashCode(code, salt);
    const expiresAt = new Date(now.getTime() + env.otp.expirySeconds * 1000);

    await this.prisma.otp.create({
      data: {
        phone,
        purpose,
        codeHash,
        expiresAt,
      },
    });

    const mockMode = this.isSmsConfigured()
      ? undefined
      : this.isDev()
        ? code
        : undefined;

    if (!this.isSmsConfigured()) {
      this.logger.warn(
        `Twilio SMS not configured; cannot deliver OTP for ${phone}`,
      );
    } else {
      this.smsService.send(phone, this.renderTemplate(code));
    }

    return {
      expiresAt,
      cooldownSeconds: env.otp.requestCooldownSeconds,
      code: mockMode,
    };
  }

  async verify(
    phoneInput: string,
    code: string,
    purpose: OtpPurpose,
  ): Promise<OtpVerifyResult> {
    const phone = this.phoneService.normalize(phoneInput);
    const now = new Date();

    const otp = await this.prisma.otp.findFirst({
      where: {
        phone,
        purpose,
        consumedAt: null,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otp) {
      throw new BadRequestException(
        'Invalid verification code or OTP has expired.',
      );
    }

    if (otp.attempts >= env.otp.maxAttempts) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { consumedAt: now },
      });
      throw new BadRequestException(
        'Too many verification attempts. Please request a new OTP.',
      );
    }

    if (!this.verifyCode(otp.codeHash, code)) {
      await this.prisma.otp.update({
        where: { id: otp.id },
        data: { attempts: { increment: 1 } },
      });
      throw new BadRequestException('Invalid verification code.');
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { consumedAt: now },
    });

    return {
      phone,
      purpose,
      userId: otp.userId ?? undefined,
    };
  }

  generateCode(): string {
    return randomInt(0, 10 ** env.otp.length)
      .toString()
      .padStart(env.otp.length, '0');
  }

  private hashCode(code: string, salt: string): string {
    const hash = createHash('sha256')
      .update(`${salt}${HASH_PART_SEPARATOR}${code}`)
      .digest('hex');
    return `${salt}${HASH_PART_SEPARATOR}${hash}`;
  }

  private verifyCode(stored: string, code: string): boolean {
    const [salt, hash] = stored.split(HASH_PART_SEPARATOR);
    if (!salt || !hash) return false;

    const expected = Buffer.from(hash, 'hex');
    const actual = createHash('sha256')
      .update(`${salt}${HASH_PART_SEPARATOR}${code}`)
      .digest();

    return (
      expected.length === actual.length && timingSafeEqual(expected, actual)
    );
  }

  private renderTemplate(code: string): string {
    const template = env.otp.smsTemplate;
    const expiryMinutes = Math.max(1, Math.round(env.otp.expirySeconds / 60));
    return template
      .replaceAll('{{otp}}', code)
      .replaceAll('{{expiry_minutes}}', String(expiryMinutes));
  }

  private isSmsConfigured(): boolean {
    return Boolean(env.sms.accountSid && env.sms.authToken);
  }

  private isDev(): boolean {
    return env.nodeEnv !== 'production';
  }
}
