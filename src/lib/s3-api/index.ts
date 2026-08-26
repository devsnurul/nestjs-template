export type {
  StorageOptions,
  FileFieldConfig,
  StorageModuleOptions,
  AccessMode,
} from './s3-storage/interfaces/storage-options.interface';

export {
  ObjectS3ApiService,
  AccessModeError,
} from './s3-storage/object-s3-api.service';

export type {
  UploadUrlResult,
  DownloadUrlResult,
  FileInfo,
} from './s3-storage/interfaces/object-s3-api-service.interface';

export { FileManagerService } from './s3-storage/file-manager.service';

export type {
  FileField,
  AppendUrlsOptions,
  FileUploadRequest,
  FileUploadResponse,
  CreateFilesResult,
  UpdateFilesResult,
  DeleteFilesResult,
} from './s3-storage/interfaces/file-manager.interface';

export { S3StorageModule } from './s3-storage/s3-storage.module';

export {
  FileFields,
  UploadUrls,
  StorageInfo,
} from './s3-storage/decorators/file-fields.decorator';

export {
  parseFieldPath,
  getNestedValue,
  setNestedValue,
  collectNestedValues,
  isArrayPath,
  getSubPathAfterArray,
  getAllArrayItemPaths,
} from './s3-storage/utils/nested-value.util';

export type {
  ParsedPath,
  PathSegment,
} from './s3-storage/utils/nested-value.util';
