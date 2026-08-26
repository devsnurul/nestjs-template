import { Module, DynamicModule } from '@nestjs/common';
import { ObjectS3ApiService } from './object-s3-api.service';
import { FileManagerService } from './file-manager.service';
import {
  StorageOptions,
  StorageModuleOptions,
} from './interfaces/storage-options.interface';
import { STORAGE_OPTIONS } from './constants';

@Module({})
export class S3StorageModule {
  static forRoot(
    options: StorageOptions,
    moduleOptions: StorageModuleOptions = {},
  ): DynamicModule {
    return {
      module: S3StorageModule,
      global: moduleOptions.isGlobal ?? true,
      providers: [
        {
          provide: STORAGE_OPTIONS,
          useValue: options,
        },
        ObjectS3ApiService,
        FileManagerService,
      ],
      exports: [ObjectS3ApiService, FileManagerService],
    };
  }

  static forRootAsync(
    optionsFactory: () => Promise<StorageOptions> | StorageOptions,
    moduleOptions: StorageModuleOptions = {},
  ): DynamicModule {
    return {
      module: S3StorageModule,
      global: moduleOptions.isGlobal ?? true,
      providers: [
        {
          provide: STORAGE_OPTIONS,
          useFactory: async () => {
            const options = await optionsFactory();
            return options;
          },
        },
        ObjectS3ApiService,
        FileManagerService,
      ],
      exports: [ObjectS3ApiService, FileManagerService],
    };
  }
}
