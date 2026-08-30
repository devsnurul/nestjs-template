export interface RoleData {
  name: string;
  slug: string;
  description: string;
  isSystem: boolean;
  rules: string[];
}

export const roles: RoleData[] = [
  {
    name: 'Super Admin',
    slug: 'super-admin',
    description: 'Full system access',
    isSystem: true,
    rules: ['*:*'],
  },
  {
    name: 'Admin',
    slug: 'admin',
    description: 'Administrative access',
    isSystem: true,
    rules: [
      'dashboard:read',
      'role:read',
      'roleAssignment:read',
      'user:read',
      'document:read',
    ],
  },
  {
    name: 'B2B Agent',
    slug: 'b2b-agent',
    description: 'Standard operational access',
    isSystem: true,
    rules: ['dashboard:read', 'document:read'],
  },
  {
    name: 'Student',
    slug: 'student',
    description: 'Standard operational access',
    isSystem: true,
    rules: ['dashboard:read', 'document:*'],
  },
  {
    name: 'Applicant',
    slug: 'applicant',
    description: 'Self-service applicant access',
    isSystem: true,
    rules: ['dashboard:read', 'document:read'],
  },
];
