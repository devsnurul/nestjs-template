/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { PasswordService } from '../../lib/password/password.service';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { TokenService } from '../../lib/token/token.service';
import { FileManagerService } from 'src/lib/s3-api';
import { MailService } from '../../lib/mail/mail.service';
import { SessionsService } from '../sessions/sessions.service';
import { PermissionService } from '../rbac/services/permission.service';
import { userFileFields } from '../user/user.constants';
import { OtpService } from '../../lib/otp';
import { PhoneService } from '../../lib/phone';
import { OTP_PURPOSES } from '../../lib/otp';
import { UserRole, UserStatus } from '@generated/prisma/client';
import { createHash } from 'node:crypto';

export interface AuthMetadata {
  ipAddress?: string;
  userAgent?: string;
  deviceInfo?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly tokenService: TokenService,
    private readonly fileManagerService: FileManagerService,
    private readonly sessionsService: SessionsService,
    private readonly permissionService: PermissionService,
    private readonly mailService: MailService,
    private readonly otpService: OtpService,
    private readonly phoneService: PhoneService,
  ) {}

  async login(email: string, password: string, metadata?: AuthMetadata) {
    email = email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const { password: existPassword, ...rest } = user;
    if (!existPassword) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const valid = await this.passwordService.compare(password, existPassword);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueSession(rest, metadata);
  }

  async refresh(refreshToken: string) {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);

    const rules = await this.permissionService.getUserRules(payload.sub);

    const { payload: newPayload, ...tokenPair } =
      this.tokenService.refreshTokens(refreshToken, rules);

    await this.sessionsService.revokeByJti(payload.jti);

    const verifiedPayload = this.tokenService.verifyRefreshToken(
      tokenPair.refreshToken,
    );

    await this.sessionsService.create({
      userId: payload.sub,
      refreshToken: tokenPair.refreshToken,
      jti: verifiedPayload.jti,
    });

    await this.sessionsService.updateActivity(verifiedPayload.jti);

    const userWithPhoto = await this.fileManagerService.appendUrls(
      payload,
      userFileFields,
    );

    return {
      ...tokenPair,
      user: userWithPhoto,
      rules,
    };
  }

  async logout(refreshToken: string) {
    const payload = this.tokenService.verifyRefreshToken(refreshToken);
    await this.sessionsService.revokeByJti(payload.jti);
  }

  async requestApplicantOtp(phoneInput: string) {
    return this.otpService.request(phoneInput, OTP_PURPOSES.APPLICANT_AUTH);
  }

  async resendApplicantOtp(phoneInput: string) {
    return this.otpService.request(phoneInput, OTP_PURPOSES.APPLICANT_AUTH);
  }

  async verifyApplicantOtp(
    phoneInput: string,
    code: string,
    metadata?: AuthMetadata,
  ) {
    const verified = await this.otpService.verify(
      phoneInput,
      code,
      OTP_PURPOSES.APPLICANT_AUTH,
    );
    const phone = verified.phone;

    const existing = await this.prisma.user.findUnique({ where: { phone } });

    if (existing && existing.role !== UserRole.APPLICANT) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const applicant = await this.prisma.user.upsert({
      where: { phone },
      create: {
        firstName: '',
        phone,
        role: UserRole.APPLICANT,
        status: UserStatus.ACTIVE,
        phoneVerifiedAt: new Date(),
      },
      update: {
        phoneVerifiedAt: new Date(),
      },
    });

    const { password: _, ...rest } = applicant;
    return this.issueSession(rest, metadata);
  }

  async forgetPassword(email: string): Promise<{ message: string }> {
    email = email.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: 'If that email exists, a reset link has been sent.' };
    }

    const token = crypto.randomUUID();
    const hashedToken = createHash('sha256').update(token).digest('hex');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: hashedToken,
        resetTokenExpiry: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    await this.mailService.sendPasswordResetEmail(email, token);

    return { message: 'If that email exists, a reset link has been sent.' };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    const hashedToken = createHash('sha256').update(token).digest('hex');

    const user = await this.prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetToken: null,
        resetTokenExpiry: null,
      },
    });

    return { message: 'Password has been reset successfully.' };
  }

  private async issueSession(
    user: { id: string; email?: string | null; role: UserRole },
    metadata?: AuthMetadata,
  ) {
    const rules = await this.permissionService.getUserRules(user.id);

    const tokens = this.tokenService.generateTokens({
      sub: user.id,
      email: user.email ?? '',
      role: user.role,
      rules,
    });

    const payload = this.tokenService.verifyRefreshToken(tokens.refreshToken);

    await this.sessionsService.create({
      userId: user.id,
      refreshToken: tokens.refreshToken,
      jti: payload.jti,
      ipAddress: metadata?.ipAddress,
      userAgent: metadata?.userAgent,
      deviceInfo: metadata?.deviceInfo,
    });

    const userWithPhoto = await this.fileManagerService.appendUrls(
      user,
      userFileFields,
    );

    return {
      ...tokens,
      user: userWithPhoto,
      rules,
    };
  }
}
