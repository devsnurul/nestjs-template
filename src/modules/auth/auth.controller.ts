/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Body, Controller, Post, Req, Res } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { LogoutDto } from './dto/logout.dto';
import { ForgetPasswordDto } from './dto/forget-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { RequestOtpDto } from './dto/request-otp.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import type { Request, Response } from 'express';
import { Public } from 'src/decorators/public.decorator';

const REFRESH_TOKEN_COOKIE = 'refreshToken';

const cookieOptions = (maxAgeSecs: number) => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/api/v1/auth',
  maxAge: maxAgeSecs * 1000,
});

@Controller({ version: '1', path: 'auth' })
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      cookieOptions(604800),
    );
    return result;
  }

  @Public()
  @Post('refresh')
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
    const result = await this.authService.refresh(token);
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      cookieOptions(604800),
    );
    return result;
  }

  @Public()
  @Post('logout')
  async logout(
    @Body() dto: LogoutDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken ?? req.cookies?.[REFRESH_TOKEN_COOKIE];
    await this.authService.logout(token);
    res.clearCookie(REFRESH_TOKEN_COOKIE, { path: '/api/v1/auth' });
  }

  @Public()
  @Post('applicant/request-otp')
  async requestApplicantOtp(@Body() dto: RequestOtpDto) {
    return this.authService.requestApplicantOtp(dto.phone);
  }

  @Public()
  @Post('applicant/resend-otp')
  async resendApplicantOtp(@Body() dto: RequestOtpDto) {
    return this.authService.resendApplicantOtp(dto.phone);
  }

  @Public()
  @Post('applicant/verify-otp')
  async verifyApplicantOtp(
    @Body() dto: VerifyOtpDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyApplicantOtp(
      dto.phone,
      dto.code,
      {
        ipAddress: req.ip,
        userAgent: req.get('user-agent'),
      },
    );
    res.cookie(
      REFRESH_TOKEN_COOKIE,
      result.refreshToken,
      cookieOptions(604800),
    );
    return result;
  }

  @Public()
  @Post('forget-password')
  forgetPassword(@Body() dto: ForgetPasswordDto) {
    return this.authService.forgetPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.newPassword);
  }
}
