import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as mime from 'mime-types';
import type { Prisma } from '../../generated/prisma/client';
import { ObjectS3ApiService } from '../../lib/s3-api/s3-storage/object-s3-api.service';
import { FileManagerService } from '../../lib/s3-api/s3-storage/file-manager.service';
import { getNestedValue } from '../../lib/s3-api/s3-storage/utils/nested-value.util';
import type {
  FileField,
  FileUploadResponse,
  StoredObjectConfig,
  StoredObjectOptions,
  CreateFilesResult,
  UpdateFilesResult,
  DeleteFilesResult,
} from './object.types';
import { StoredObjectService } from 'src/modules/stored-object/stored-object.service';

@Injectable()
export class ObjectManagerService {
  constructor(
    private readonly objectS3ApiService: ObjectS3ApiService,
    private readonly storedObjectService: StoredObjectService,
    private readonly fileManagerService: FileManagerService,
  ) {}

  async createWithFiles<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
    filePrefix: string = 'uploads',
    storedObjectConfig?: StoredObjectOptions,
  ): Promise<CreateFilesResult<T>> {
    const result = await this.fileManagerService.createWithFiles(
      payload,
      fileFields,
      filePrefix,
    );

    if (storedObjectConfig) {
      await this.createStoredObjectsFromUrls(
        result.uploadUrls,
        fileFields,
        result.updatedPayload,
        storedObjectConfig,
      );
    }

    return {
      updatedPayload: result.updatedPayload,
      uploadUrls: result.uploadUrls,
    };
  }

  async updateWithFiles<T extends Record<string, any>>(
    payload: T,
    existingObject: T,
    fileFields: FileField[],
    filePrefix: string = 'uploads',
    storedObjectConfig?: StoredObjectOptions,
  ): Promise<UpdateFilesResult<T>> {
    const result = await this.fileManagerService.updateWithFiles(
      payload,
      existingObject,
      fileFields,
      filePrefix,
    );

    if (storedObjectConfig) {
      if (result.deletedFiles.length > 0) {
        await this.deleteStoredObjectsByKeys(result.deletedFiles);
      }
      if (result.uploadUrls.length > 0) {
        await this.createStoredObjectsFromUrls(
          result.uploadUrls,
          fileFields,
          result.updatedPayload,
          storedObjectConfig,
        );
      }
    }

    return {
      updatedPayload: result.updatedPayload,
      uploadUrls: result.uploadUrls,
      deletedFiles: result.deletedFiles,
    };
  }

  appendUrls<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
  ): Promise<T>;

  appendUrls<T extends Record<string, any>>(
    payload: T[],
    fileFields: FileField[],
  ): Promise<T[]>;

  appendUrls<T extends Record<string, any>>(
    payload: T | T[],
    fileFields: FileField[],
  ): Promise<T | T[]> {
    return this.fileManagerService.appendUrls(payload, fileFields);
  }

  async deleteFilesFromObject<T extends Record<string, any>>(
    object: T,
    fileFields: FileField[],
    storedObjectConfig?: StoredObjectOptions,
  ): Promise<DeleteFilesResult> {
    const result = await this.fileManagerService.deleteFilesFromObject(
      object,
      fileFields,
    );

    if (storedObjectConfig && result.deletedFiles.length > 0) {
      await this.deleteStoredObjectsByKeys(result.deletedFiles);
    }

    return {
      deletedFiles: result.deletedFiles,
    };
  }

  private async createStoredObjectsFromUrls(
    uploadUrls: FileUploadResponse[],
    fileFields: FileField[],
    payload: Record<string, any>,
    config: StoredObjectOptions,
  ): Promise<void> {
    const bucketName = this.objectS3ApiService.getOptions().bucketName;
    const configs = Array.isArray(config) ? config : undefined;

    await Promise.all(
      uploadUrls.map(async (url) => {
        const matched = configs
          ? this.matchConfig(url.field, configs)
          : (config as StoredObjectConfig);

        if (!matched) return;

        const originalName = url.filename || path.basename(url.fileKey);
        const extension = path.extname(originalName);
        const detectedMime =
          mime.lookup(originalName) || 'application/octet-stream';
        const size = this.resolveSize(url.field, fileFields, payload);
        await this.storedObjectService.create({
          bucketName,
          fileKey: url.fileKey,
          field: url.field,
          originalName,
          extension: extension || undefined,
          mimeType: detectedMime,
          size,
          uploaderId: matched.uploaderId,
          entityType: matched.entityType,
          entityId: matched.entityId,
          tags: matched.tags,
          metadata: matched.metadata as Prisma.InputJsonValue | undefined,
        });
      }),
    );
  }

  private async deleteStoredObjectsByKeys(fileKeys: string[]): Promise<void> {
    const { data } = await this.storedObjectService.findAll({
      where: { fileKey: { in: fileKeys } },
    });

    await Promise.all(
      data.map((obj) => this.storedObjectService.remove(obj.id)),
    );
  }

  private matchConfig(
    fieldPath: string,
    configs: StoredObjectConfig[],
  ): StoredObjectConfig | undefined {
    const normalized = fieldPath.replace(/\[\d+\]/g, '[]');

    for (const cfg of configs) {
      if (!cfg.field) continue;
      if (cfg.field === fieldPath) return cfg;
      if (cfg.field === normalized) return cfg;
    }

    return undefined;
  }

  private resolveSize(
    fieldPath: string,
    fileFields: FileField[],
    payload: Record<string, any>,
  ): number {
    const normalized = fieldPath.replace(/\[\d+\]/g, '[]');

    for (const ff of fileFields) {
      if (!ff.sizeField) continue;
      if (ff.field === fieldPath || ff.field === normalized) {
        const val: unknown = getNestedValue(payload, ff.sizeField);
        return typeof val === 'number' ? val : 0;
      }
    }

    return 0;
  }
}
