import { IsString, Matches } from 'class-validator';

export class RequestOtpDto {
  @IsString()
  @Matches(/^\+?[0-9][0-9\s-]{6,16}$/, {
    message: 'Invalid mobile number',
  })
  phone!: string;
}
