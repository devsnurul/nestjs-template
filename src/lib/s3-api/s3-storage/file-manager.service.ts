/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Injectable } from '@nestjs/common';
import { ObjectS3ApiService } from './object-s3-api.service';
import {
  getNestedValue,
  setNestedValue,
  isArrayPath,
  parseFieldPath,
  getAllArrayItemPaths,
  getSubPathAfterArray,
} from './utils/nested-value.util';
import {
  AppendUrlsOptions,
  CreateFilesResult,
  DeleteFilesResult,
  FileField,
  FileUploadRequest,
  FileUploadResponse,
  UpdateFilesResult,
} from './interfaces/file-manager.interface';

type FileMap = Map<string, string>;

interface FileDiffResult {
  fieldPath: string;
  action: 'upload' | 'keep' | 'delete';
}

@Injectable()
export class FileManagerService {
  constructor(private readonly objectS3ApiService: ObjectS3ApiService) {}

  async appendUrls<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
  ): Promise<T>;

  async appendUrls<T extends Record<string, any>>(
    payload: T[],
    fileFields: FileField[],
  ): Promise<T[]>;

  async appendUrls<T extends Record<string, any>>(
    payload: T | T[],
    fileFields: FileField[],
    options?: AppendUrlsOptions,
  ): Promise<T | T[]> {
    const isArray = Array.isArray(payload);
    const items = isArray ? payload : [payload];

    const urlFieldFn = options?.urlField || ((field: string) => `${field}_url`);

    const result = await Promise.all(
      items.map(async (item) => {
        let updatedItem = { ...item };

        for (const fileField of fileFields) {
          const fieldValue = getNestedValue(updatedItem, fileField.field);

          if (!fieldValue) {
            continue;
          }

          if (isArrayPath(fileField.field)) {
            updatedItem = await this.handleArrayFieldUrls(
              updatedItem,
              fileField,
              urlFieldFn,
            );
          } else {
            updatedItem = await this.handleSingleFieldUrl(
              updatedItem,
              fileField,
              urlFieldFn,
            );
          }
        }

        return updatedItem;
      }),
    );

    return isArray ? result : result[0];
  }

  private async handleSingleFieldUrl<T extends Record<string, any>>(
    item: T,
    fileField: FileField,
    urlFieldFn: (field: string) => string,
  ): Promise<T> {
    const fieldValue = getNestedValue(item, fileField.field);

    if (!fieldValue) {
      return item;
    }

    const urlField = fileField.urlField || urlFieldFn(fileField.field);

    try {
      const { downloadUrl, publicUrl } =
        await this.objectS3ApiService.getDownloadUrl(fieldValue);
      const finalUrl = publicUrl || downloadUrl;
      return setNestedValue(item, urlField, finalUrl);
    } catch (error) {
      console.error(
        `Failed to generate download URL for ${fieldValue}:`,
        error,
      );
      return setNestedValue(item, urlField, null);
    }
  }

  private async handleArrayFieldUrls<T extends Record<string, any>>(
    item: T,
    fileField: FileField,
    urlFieldFn: (field: string) => string,
  ): Promise<T> {
    const { segments } = parseFieldPath(fileField.field);
    const lastArrayIndex = segments.findIndex((s) => s.isArray);

    if (lastArrayIndex === -1) {
      return item;
    }

    const arrayPath = segments
      .slice(0, lastArrayIndex + 1)
      .map((s) => s.key)
      .join('.');
    const arrayValue = getNestedValue(item, arrayPath);

    if (!arrayValue || !Array.isArray(arrayValue)) {
      return item;
    }

    const urlField = fileField.urlField || urlFieldFn(fileField.field);
    const subPath = getSubPathAfterArray(fileField.field);

    const updatedArray = await Promise.all(
      arrayValue.map(async (arrayItem: Record<string, any>) => {
        const fileValue = subPath
          ? getNestedValue(arrayItem, subPath)
          : arrayItem;

        if (!fileValue) {
          return { ...arrayItem };
        }

        try {
          const { downloadUrl, publicUrl } =
            await this.objectS3ApiService.getDownloadUrl(fileValue);
          const finalUrl = publicUrl || downloadUrl;

          if (subPath) {
            return setNestedValue(arrayItem, `${subPath}_url`, finalUrl);
          }
          return { ...arrayItem, [urlField]: finalUrl };
        } catch (error) {
          console.error(
            `Failed to generate download URL for ${fileValue}:`,
            error,
          );
          if (subPath) {
            return setNestedValue(arrayItem, `${subPath}_url`, null);
          }
          return { ...arrayItem, [urlField]: null };
        }
      }),
    );

    return setNestedValue(item, arrayPath, updatedArray);
  }

  async createWithFiles<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
    filePrefix: string = 'uploads',
  ): Promise<CreateFilesResult<T>> {
    let updatedPayload = { ...payload };
    const uploadUrls: FileUploadResponse[] = [];
    let totalStorageUsed = 0;

    const fileUploadRequests = this.extractFileUploadRequests(
      payload,
      fileFields,
      filePrefix,
    );

    const uploadResults = await Promise.all(
      fileUploadRequests.map(async (request) => {
        const result = await this.objectS3ApiService.getUploadUrl(
          request.filename,
          request.size,
          request.filename,
        );

        const storageUsed = request.size || 0;
        totalStorageUsed += storageUsed;

        return {
          request,
          response: result,
          storageUsed,
        };
      }),
    );

    for (const { request, response } of uploadResults) {
      uploadUrls.push({
        field: request.field,
        fileKey: response.fileKey,
        uploadUrl: response.uploadUrl,
        publicUrl: response.publicUrl,
        filename: request.filename,
      });

      if (isArrayPath(request.field)) {
        updatedPayload = this.updateFieldWithFileKey(
          updatedPayload,
          request.field,
          response.fileKey,
        );
      } else {
        updatedPayload = setNestedValue(
          updatedPayload,
          request.field,
          response.fileKey,
        );
      }
    }

    return {
      updatedPayload,
      uploadUrls,
      totalStorageUsed,
    };
  }

  async updateWithFiles<T extends Record<string, any>>(
    payload: T,
    existingObject: T,
    fileFields: FileField[],
    filePrefix: string = 'uploads',
  ): Promise<UpdateFilesResult<T>> {
    let updatedPayload = { ...payload };
    const uploadUrls: FileUploadResponse[] = [];
    let storageIncrease = 0;
    let storageDecrease = 0;
    const deletedFiles: string[] = [];

    const existingFileMap = this.extractExistingFileMap(
      existingObject,
      fileFields,
    );
    const payloadFileMap = this.extractPayloadFileMap(payload, fileFields);

    const { toUpload, toDelete } = this.calculateFileDiffs(
      existingFileMap,
      payloadFileMap,
    );

    if (toDelete.length > 0) {
      const deleteResults = await this.objectS3ApiService.deleteFiles(toDelete);
      deletedFiles.push(...deleteResults.success);

      for (const fileKey of deleteResults.success) {
        const fileInfo = await this.objectS3ApiService.getFileInfo(fileKey);
        if (fileInfo) {
          storageDecrease += fileInfo.size;
        }
      }
    }

    const uploadRequests: FileUploadRequest[] = [];
    for (const { fieldPath } of toUpload) {
      const filename = getNestedValue(payload, fieldPath) || fieldPath;
      const size = this.getSizeForField(payload, fileFields, fieldPath);
      uploadRequests.push({
        field: fieldPath,
        filename: filename,
        size,
        prefix: filePrefix,
      });
    }

    const uploadResults = await Promise.all(
      uploadRequests.map(async (request) => {
        const response = await this.objectS3ApiService.getUploadUrl(
          request.filename,
          request.size,
          request.filename,
        );

        const storageUsed = request.size || 0;
        storageIncrease += storageUsed;

        return { request, response };
      }),
    );

    for (const { request, response } of uploadResults) {
      uploadUrls.push({
        field: request.field,
        fileKey: response.fileKey,
        uploadUrl: response.uploadUrl,
        publicUrl: response.publicUrl,
        filename: request.filename,
      });

      updatedPayload = this.updateFieldWithFileKey(
        updatedPayload,
        request.field,
        response.fileKey,
      );
    }

    return {
      updatedPayload,
      uploadUrls,
      storageIncrease,
      storageDecrease,
      deletedFiles,
    };
  }

  async deleteFilesFromObject<T extends Record<string, any>>(
    object: T,
    fileFields: FileField[],
  ): Promise<DeleteFilesResult> {
    const fileKeys = this.extractExistingFiles(object, fileFields);
    const deletedFiles: string[] = [];
    let totalStorageFreed = 0;

    if (fileKeys.length === 0) {
      return { deletedFiles: [], totalStorageFreed: 0 };
    }

    const results = await this.objectS3ApiService.deleteFiles(fileKeys);
    deletedFiles.push(...results.success);

    for (const fileKey of results.success) {
      const fileInfo = await this.objectS3ApiService.getFileInfo(fileKey);
      if (fileInfo) {
        totalStorageFreed += fileInfo.size;
      }
    }

    return {
      deletedFiles,
      totalStorageFreed,
    };
  }

  extractExistingFileMap<T extends Record<string, any>>(
    object: T,
    fileFields: FileField[],
  ): FileMap {
    const map: FileMap = new Map();

    for (const fileField of fileFields) {
      const fieldValue = getNestedValue(object, fileField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(fileField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          object,
          fileField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(object, fieldPath);
          if (value && typeof value === 'string' && value.length > 0) {
            map.set(fieldPath, value);
          }
        }
      } else {
        if (typeof fieldValue === 'string' && fieldValue.length > 0) {
          map.set(fileField.field, fieldValue);
        }
      }
    }

    return map;
  }

  private extractPayloadFileMap<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
  ): FileMap {
    const map: FileMap = new Map();

    for (const fileField of fileFields) {
      const fieldValue = getNestedValue(payload, fileField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(fileField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          payload,
          fileField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(payload, fieldPath);
          if (value && typeof value === 'string' && value.length > 0) {
            map.set(fieldPath, value);
          }
        }
      } else {
        if (typeof fieldValue === 'string' && fieldValue.length > 0) {
          map.set(fileField.field, fieldValue);
        }
      }
    }

    return map;
  }

  private getArrayFieldPaths<T extends Record<string, any>>(
    object: T,
    fieldPattern: string,
  ): string[] {
    const { segments } = parseFieldPath(fieldPattern);
    const lastArrayIndex = segments.findIndex((s) => s.isArray);

    if (lastArrayIndex === -1) {
      return [];
    }

    const arrayPath = segments
      .slice(0, lastArrayIndex + 1)
      .map((s) => s.key)
      .join('.');
    const arrayValue = getNestedValue(object, arrayPath);

    if (!arrayValue || !Array.isArray(arrayValue)) {
      return [];
    }

    return getAllArrayItemPaths(fieldPattern, arrayValue.length);
  }

  private calculateFileDiffs(
    existingMap: FileMap,
    payloadMap: FileMap,
  ): { toUpload: FileDiffResult[]; toDelete: string[] } {
    const toUpload: FileDiffResult[] = [];
    const toDelete: string[] = [];

    for (const [fieldPath, filename] of payloadMap) {
      const existingValue = existingMap.get(fieldPath);
      if (existingValue && existingValue === filename) {
        continue;
      }
      toUpload.push({ fieldPath, action: 'upload' });
    }

    for (const [fieldPath, existingFileKey] of existingMap) {
      const payloadFileKey = payloadMap.get(fieldPath);
      if (!payloadFileKey || payloadFileKey !== existingFileKey) {
        toDelete.push(existingFileKey);
      }
    }

    return { toUpload, toDelete };
  }

  private getSizeForField<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
    fieldPath: string,
  ): number {
    for (const fileField of fileFields) {
      if (!fileField.sizeField) {
        continue;
      }

      if (fileField.field === fieldPath) {
        const sizeValue = getNestedValue(payload, fileField.sizeField);
        return typeof sizeValue === 'number' ? sizeValue : 0;
      }

      if (isArrayPath(fileField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          payload,
          fileField.field,
        );
        const index = arrayFieldPaths.indexOf(fieldPath);

        if (index !== -1) {
          const { segments } = parseFieldPath(fileField.field);
          const arrayPath = segments
            .slice(0, segments.findIndex((s) => s.isArray) + 1)
            .map((s) => s.key)
            .join('.');

          const arrayValue = getNestedValue(payload, arrayPath);
          if (arrayValue && arrayValue[index]) {
            const sizeSubPath = getSubPathAfterArray(fileField.sizeField);
            const sizeValue = sizeSubPath
              ? getNestedValue(arrayValue[index], sizeSubPath)
              : arrayValue[index][fileField.sizeField];
            return typeof sizeValue === 'number' ? sizeValue : 0;
          }
        }
      }
    }

    return 0;
  }

  private updateFieldWithFileKey<T extends Record<string, any>>(
    payload: T,
    fieldPath: string,
    fileKey: string,
  ): T {
    return setNestedValue(payload, fieldPath, fileKey);
  }

  private extractFileUploadRequests<T extends Record<string, any>>(
    payload: T,
    fileFields: FileField[],
    filePrefix: string,
  ): FileUploadRequest[] {
    const requests: FileUploadRequest[] = [];

    for (const fileField of fileFields) {
      const fieldValue = getNestedValue(payload, fileField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(fileField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          payload,
          fileField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(payload, fieldPath);
          if (!value || typeof value !== 'string') {
            continue;
          }

          const size = this.getSizeForField(payload, fileFields, fieldPath);

          requests.push({
            field: fieldPath,
            filename: value,
            size,
            prefix: filePrefix,
          });
        }
      } else {
        const sizeValue = fileField.sizeField
          ? getNestedValue(payload, fileField.sizeField)
          : 0;

        if (typeof fieldValue === 'string' && fieldValue.length > 0) {
          requests.push({
            field: fileField.field,
            filename: fieldValue,
            size: (sizeValue as number) || 0,
            prefix: filePrefix,
          });
        }
      }
    }

    return requests;
  }

  private extractExistingFiles<T extends Record<string, any>>(
    object: T,
    fileFields: FileField[],
  ): string[] {
    const fileKeys: string[] = [];

    for (const fileField of fileFields) {
      const fieldValue = getNestedValue(object, fileField.field);

      if (!fieldValue) {
        continue;
      }

      if (isArrayPath(fileField.field)) {
        const arrayFieldPaths = this.getArrayFieldPaths(
          object,
          fileField.field,
        );
        for (const fieldPath of arrayFieldPaths) {
          const value = getNestedValue(object, fieldPath);
          if (value && typeof value === 'string' && value.length > 0) {
            fileKeys.push(value);
          }
        }
      } else if (typeof fieldValue === 'string' && fieldValue.length > 0) {
        fileKeys.push(fieldValue);
      }
    }

    return fileKeys;
  }
}
