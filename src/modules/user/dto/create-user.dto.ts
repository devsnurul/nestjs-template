import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MinLength,
} from 'class-validator';
import { UserRole } from '../../../generated/prisma/client';

export class CreateUserDto {
  @IsString()
  @MinLength(1)
  firstName!: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEmail()
  @Transform(({ value }: { value: string }) => value?.toLowerCase())
  email!: string;

  @IsString()
  @IsOptional()
  phone?: string;

  @IsString()
  @MinLength(6)
  password!: string;

  @IsEnum(UserRole)
  role!: UserRole;

  @IsString()
  @IsOptional()
  stateId?: string;

  @IsString()
  @IsOptional()
  profilePhoto?: string;

  @IsNumber()
  @IsPositive()
  @IsOptional()
  profilePhotoSize?: number;
}
