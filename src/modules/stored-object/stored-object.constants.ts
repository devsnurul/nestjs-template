import { SmartQueryInterceptorOptions } from 'src/lib/query-pagination/index';

const storedObjectQueryConfig: SmartQueryInterceptorOptions = {
  searchableFields: ['originalName', 'objectType', 'mimeType', 'bucketName'],
  filterableFields: [
    'objectType',
    'entityType',
    'entityId',
    'bucketName',
    'uploaderId',
    'mimeType',
  ],
  numberFields: ['size'],
  booleanFields: [],
  dateFields: ['createdAt', 'updatedAt', 'deletedAt'],
};

export { storedObjectQueryConfig };
