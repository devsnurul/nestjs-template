import { Module, Global, DynamicModule, Provider } from '@nestjs/common';
import { SmartQueryConfig, SmartQueryModuleOptions } from '../interfaces/index';
import { SMART_QUERY_CONFIG } from '../interceptors/smart-query.interceptor';

@Global()
@Module({})
export class SmartQueryModule {
  static forRoot(
    config: SmartQueryModuleOptions & Partial<SmartQueryConfig> = {},
  ): DynamicModule {
    const moduleConfig: SmartQueryConfig = {
      defaultLimit: config.defaultLimit,
      maxLimit: config.maxLimit,
      searchableFields: config.searchableFields ?? [],
      filterableFields: config.filterableFields ?? [],
      numberFields: config.numberFields ?? [],
      booleanFields: config.booleanFields ?? [],
      dateFields: config.dateFields ?? [],
    };

    const configProvider: Provider = {
      provide: SMART_QUERY_CONFIG,
      useValue: moduleConfig,
    };

    return {
      module: SmartQueryModule,
      providers: [configProvider],
      exports: [configProvider],
    };
  }
}
