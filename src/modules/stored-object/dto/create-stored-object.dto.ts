import { Prisma } from '@generated/prisma/client';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateStoredObjectDto {
  @IsString()
  @MinLength(1)
  bucketName!: string;

  @IsString()
  @MinLength(1)
  fileKey!: string;

  @IsString()
  @MinLength(1)
  field!: string;

  @IsString()
  @MinLength(1)
  originalName!: string;

  @IsString()
  @IsOptional()
  extension?: string;

  @IsString()
  @MinLength(1)
  mimeType!: string;

  size!: bigint | number;

  @IsString()
  @IsOptional()
  etag?: string;

  @IsString()
  @IsOptional()
  checksum?: string;

  @IsString()
  @IsOptional()
  entityType?: string;

  @IsString()
  @IsOptional()
  entityId?: string;

  @IsArray()
  @IsOptional()
  tags?: string[];

  @IsOptional()
  metadata?: Prisma.InputJsonValue;

  @IsString()
  @IsOptional()
  uploaderId?: string;
}
