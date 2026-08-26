import { createParamDecorator } from '@nestjs/common';

export interface FileFieldsContext {
  fileFields: Array<{
    field: string;
    urlField?: string;
    sizeField?: string;
  }>;
}

export const FileFields = createParamDecorator((data: FileFieldsContext) => {
  return data.fileFields;
});

export interface UploadUrlsContext {
  uploadUrls: Array<{
    field: string;
    fileKey: string;
    uploadUrl: string;
    publicUrl?: string;
  }>;
}

export const UploadUrls = createParamDecorator((data: UploadUrlsContext) => {
  return data.uploadUrls;
});

export interface StorageContext {
  totalStorageUsed?: number;
  storageIncrease?: number;
  storageDecrease?: number;
  totalStorageFreed?: number;
}

export const StorageInfo = createParamDecorator((data: StorageContext) => {
  return data;
});
