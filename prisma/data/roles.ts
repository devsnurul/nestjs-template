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
      'analytics:*',
      'dashboard:read',
      'officer:read',
      'researcher:read',
      'role:read',
      'roleAssignment:read',
      'state:read',
      'state:create',
      'state:update',
      'state:delete',
      'district:read',
      'district:create',
      'district:update',
      'district:delete',
      'sub_district:read',
      'sub_district:create',
      'sub_district:update',
      'sub_district:delete',
      'user:read',
    ],
  },
  {
    name: 'B2B Agent',
    slug: 'b2b-agent',
    description: 'Standard operational access',
    isSystem: true,
    rules: [
      'campaign:read',
      'dashboard:read',
      'document:read',
      'storedObject:read',
      'research:*',
      'state:read',
      'district:read',
      'sub_district:read',
    ],
  },
  {
    name: 'Student',
    slug: 'student',
    description: 'Standard operational access',
    isSystem: true,
    rules: [
      'campaign:*',
      'dashboard:read',
      'document:*',
      'state:read',
      'district:read',
      'sub_district:read',
    ],
  },
];
