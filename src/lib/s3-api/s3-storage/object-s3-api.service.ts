/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Inject,
  BadRequestException,
} from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as path from 'path';
import * as mime from 'mime-types';
import {
  StorageOptions,
  AccessMode,
} from './interfaces/storage-options.interface';
import { STORAGE_OPTIONS } from './constants';
import { validateOptions } from './utils/validate-options.utils';
import {
  DownloadUrlResult,
  FileInfo,
  UploadUrlResult,
} from './interfaces/object-s3-api-service.interface';

export class AccessModeError extends BadRequestException {
  constructor(message: string) {
    super(message);
    this.name = 'AccessModeError';
  }
}

@Injectable()
export class ObjectS3ApiService implements OnModuleInit, OnModuleDestroy {
  private s3Client!: S3Client;
  private options: StorageOptions;
  private readonly defaultExpiry = 3600;
  private readonly defaultAccessMode: AccessMode = 'hybrid';

  constructor(
    @Inject(STORAGE_OPTIONS) private readonly storageOptions: StorageOptions,
  ) {
    this.options = this.storageOptions;
  }

  private get accessMode(): AccessMode {
    return this.options.accessMode || this.defaultAccessMode;
  }

  private isPublicAccessAllowed(): boolean {
    return this.accessMode === 'public-read' || this.accessMode === 'hybrid';
  }

  onModuleInit() {
    validateOptions(this.options);
    this.initializeClient();
  }

  onModuleDestroy() {
    if (this.s3Client) {
      this.s3Client.destroy();
    }
  }

  private initializeClient(): void {
    this.s3Client = new S3Client({
      endpoint: this.options.endpoint,
      region: this.options.region || 'auto',
      credentials: {
        accessKeyId: this.options.accessKeyId,
        secretAccessKey: this.options.secretAccessKey,
      },
      forcePathStyle: true,
      requestChecksumCalculation: 'WHEN_REQUIRED',
    });
  }

  getOptions(): StorageOptions {
    return this.options;
  }

  private sanitizeFilename(filename: string, unique = true): string {
    const sanitized = filename.replace(/[^a-zA-Z0-9._-]/g, '_');

    if (!unique) return sanitized;

    const uniqueSuffix = `${Date.now()}`;
    const ext = path.extname(sanitized);
    const basename = path.basename(sanitized, ext);

    return `${basename}_${uniqueSuffix}${ext}`;
  }

  private detectMimeType(
    filename: string,
    fallbackContentType: string = 'application/octet-stream',
  ): string {
    const mimeType = mime.lookup(filename);
    return mimeType || fallbackContentType;
  }

  async getUploadUrl(
    fileKey: string,
    fileSize: number,
    customFilename?: string,
    contentType?: string,
  ): Promise<UploadUrlResult> {
    const filename = customFilename || path.basename(fileKey);
    const sanitizedFilename = this.sanitizeFilename(filename);
    const finalFileKey = fileKey.includes('/')
      ? `${path.dirname(fileKey)}/${sanitizedFilename}`
      : sanitizedFilename;

    const mimeType = contentType || this.detectMimeType(sanitizedFilename);

    if (this.options.maxFileSize && fileSize > this.options.maxFileSize) {
      throw new BadRequestException(
        `File size ${fileSize} exceeds maximum allowed size of ${this.options.maxFileSize} bytes`,
      );
    }

    const command = new PutObjectCommand({
      Bucket: this.options.bucketName,
      Key: finalFileKey,
      ContentType: mimeType,
      ContentLength: fileSize,
    });

    const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
    const uploadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiry,
      signableHeaders: new Set(['host', 'content-type', 'content-length']),
    });

    let publicUrl: string | null = null;
    if (this.options.publicUrlBase && this.isPublicAccessAllowed()) {
      publicUrl = `${this.options.publicUrlBase}/${finalFileKey}`;
    }

    return {
      uploadUrl,
      fileKey: finalFileKey,
      publicUrl,
      mimeType,
      sizeField: fileSize,
    };
  }

  async getDownloadUrl(fileKey: string): Promise<DownloadUrlResult> {
    const command = new GetObjectCommand({
      Bucket: this.options.bucketName,
      Key: fileKey,
    });

    const expiry = this.options.signedUrlExpiry || this.defaultExpiry;
    const downloadUrl = await getSignedUrl(this.s3Client, command, {
      expiresIn: expiry,
    });

    let publicUrl: string | null = null;
    if (this.options.publicUrlBase && this.isPublicAccessAllowed()) {
      publicUrl = `${this.options.publicUrlBase}/${fileKey}`;
    }

    return {
      downloadUrl,
      publicUrl,
    };
  }

  async deleteFile(fileKey: string): Promise<boolean> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.options.bucketName,
        Key: fileKey,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      console.error(`Failed to delete file ${fileKey}:`, error);
      return false;
    }
  }

  async deleteFiles(
    fileKeys: string[],
  ): Promise<{ success: string[]; failed: string[] }> {
    const results = await Promise.all(
      fileKeys.map(async (fileKey) => {
        const success = await this.deleteFile(fileKey);
        return { fileKey, success };
      }),
    );

    return {
      success: results.filter((r) => r.success).map((r) => r.fileKey),
      failed: results.filter((r) => !r.success).map((r) => r.fileKey),
    };
  }

  async getFileInfo(fileKey: string): Promise<FileInfo | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.options.bucketName,
        Key: fileKey,
      });

      const response = await this.s3Client.send(command);
      return {
        size: response.ContentLength || 0,
        lastModified: response.LastModified,
        contentType: response.ContentType,
      };
    } catch (error: any) {
      if (error?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw error;
    }
  }

  async fileExists(fileKey: string): Promise<boolean> {
    const fileInfo = await this.getFileInfo(fileKey);
    return fileInfo !== null;
  }

  generateFileKey(prefix: string, filename: string): string {
    return `${prefix}/${this.sanitizeFilename(filename)}`;
  }
}
