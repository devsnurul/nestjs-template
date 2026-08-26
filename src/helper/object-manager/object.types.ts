import type {
  FileField,
  FileUploadResponse,
} from '../../lib/s3-api/s3-storage/interfaces/file-manager.interface';

export { FileField, FileUploadResponse };

export interface StoredObjectConfig {
  field?: string;
  uploaderId?: string;
  entityType?: string;
  entityId?: string;
  tags?: string[];
  metadata?: Record<string, any>;
}

export type StoredObjectOptions = StoredObjectConfig | StoredObjectConfig[];

export interface CreateFilesResult<T> {
  updatedPayload: T;
  uploadUrls: FileUploadResponse[];
}

export interface UpdateFilesResult<T> {
  updatedPayload: T;
  uploadUrls: FileUploadResponse[];
  deletedFiles: string[];
}

export interface DeleteFilesResult {
  deletedFiles: string[];
}
