export interface FileField {
  field: string;
  urlField?: string;
  sizeField?: string;
}

export interface FileUploadRequest {
  field: string;
  filename: string;
  size: number;
  prefix?: string;
}

export interface FileUploadResponse {
  field: string;
  fileKey: string;
  uploadUrl: string;
  publicUrl: string | null;
  filename?: string;
}

export interface CreateFilesResult<T extends Record<string, any>> {
  updatedPayload: T;
  uploadUrls: FileUploadResponse[];
  totalStorageUsed: number;
}

export interface UpdateFilesResult<T extends Record<string, any>> {
  updatedPayload: T;
  uploadUrls: FileUploadResponse[];
  storageIncrease: number;
  storageDecrease: number;
  deletedFiles: string[];
}

export interface DeleteFilesResult {
  deletedFiles: string[];
  totalStorageFreed: number;
}

export interface AppendUrlsOptions {
  urlField?: (field: string) => string;
}
