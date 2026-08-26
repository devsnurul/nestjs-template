import { SmartQueryInterceptorOptions } from 'src/lib/query-pagination/index';

const userQueryConfig: SmartQueryInterceptorOptions = {
  searchableFields: ['firstName', 'lastName', 'email', 'phone'],
  filterableFields: ['role', 'status', 'stateId', 'email'],
  numberFields: [],
  booleanFields: [],
  dateFields: [],
};

const userFileFields = [
  {
    field: 'profilePhoto',
    urlField: 'profilePhotoUrl',
    sizeField: 'profilePhotoSize',
  },
];

export { userQueryConfig, userFileFields };
