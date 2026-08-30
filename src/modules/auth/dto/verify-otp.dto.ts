import { IsString, Matches } from 'class-validator';

export class VerifyOtpDto {
  @IsString()
  @Matches(/^\+?[0-9][0-9\s-]{6,16}$/, {
    message: 'Invalid mobile number',
  })
  phone!: string;

  @IsString()
  @Matches(/^\d{4,8}$/, {
    message: 'Invalid verification code',
  })
  code!: string;
}
