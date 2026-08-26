export interface DocumentCategoryData {
  name: string;
  slug: string;
  description: string;
  sortOrder: number;
}

export const documentCategories: DocumentCategoryData[] = [
  {
    name: 'Field Intelligence',
    slug: 'field-intelligence',
    description: 'Political intelligence collected from the field.',
    sortOrder: 1,
  },
  {
    name: 'Field Assessment',
    slug: 'field-assessment',
    description: 'Official field assessment reports.',
    sortOrder: 2,
  },
  {
    name: 'Research Paper',
    slug: 'research-paper',
    description: 'Research papers and analytical documents.',
    sortOrder: 3,
  },
  {
    name: 'Survey Report',
    slug: 'survey-report',
    description: 'Survey findings and voter sentiment reports.',
    sortOrder: 4,
  },
  {
    name: 'GIS Report',
    slug: 'gis-report',
    description: 'GIS maps and geographic analysis documents.',
    sortOrder: 5,
  },
  {
    name: 'Supporting Document',
    slug: 'supporting-document',
    description: 'Additional files supporting the main document.',
    sortOrder: 6,
  },
];
