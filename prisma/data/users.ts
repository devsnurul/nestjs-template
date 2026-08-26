import { UserRole, UserStatus } from '../../src/generated/prisma/client';

export interface UserData {
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  stateCode?: string;
}

export const users: UserData[] = [
  {
    firstName: 'Super',
    lastName: 'Admin',
    email: 'superadmin@visaconsultancy.com',
    role: UserRole.SUPER_ADMIN,
    status: UserStatus.ACTIVE,
  },
  {
    firstName: 'Admin',
    lastName: 'User',
    email: 'admin@visaconsultancy.com',
    role: UserRole.ADMIN,
    status: UserStatus.ACTIVE,
  },
];
