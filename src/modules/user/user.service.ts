import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { PasswordService } from '../../lib/password/password.service';
import { UserRole } from '../../generated/prisma/client';
import type { Prisma, User } from '../../generated/prisma/client';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { userFileFields } from './user.constants';
import { ObjectManagerService } from 'src/helper/object-manager';

@Injectable()
export class UserService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwordService: PasswordService,
    private readonly objectManagerService: ObjectManagerService,
  ) {}

  private whereNotDeleted(
    where?: Prisma.UserWhereInput,
  ): Prisma.UserWhereInput {
    return { ...where, deletedAt: null };
  }

  private mapUserRoleToSlug(role: UserRole): string {
    const map: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: 'super-admin',
      [UserRole.ADMIN]: 'admin',
      [UserRole.B2B_AGENT]: 'b2b_agent',
      [UserRole.STUDENT]: 'student',
      [UserRole.APPLICANT]: 'applicant',
    };
    return map[role];
  }

  async create(dto: CreateUserDto, uploaderId?: string) {
    dto.email = dto.email.toLowerCase();
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      if (existing.deletedAt) {
        throw new ConflictException(
          'Email belongs to a deleted user. Restore the user instead.',
        );
      }
      throw new ConflictException('Email already exists');
    }

    const { updatedPayload, uploadUrls } =
      await this.objectManagerService.createWithFiles(
        dto,
        userFileFields,
        'users',
        uploaderId ? { uploaderId, entityType: 'USER' } : undefined,
      );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, profilePhotoSize, ...rest } = updatedPayload;

    const hashed = await this.passwordService.hash(password);

    const result = await this.prisma.user.create({
      data: {
        ...rest,
        password: hashed,
      },
      omit: { password: true },
    });

    const roleSlug = this.mapUserRoleToSlug(dto.role);
    const role = await this.prisma.role.findUnique({
      where: { slug: roleSlug },
    });
    if (role) {
      await this.prisma.roleAssignment.upsert({
        where: {
          userId_roleId: { userId: result.id, roleId: role.id },
        },
        update: {},
        create: { userId: result.id, roleId: role.id },
      });
    }

    return { user: result, uploadUrls };
  }

  async findAll(query: Prisma.UserFindManyArgs, withDeleted = false) {
    const where = withDeleted ? query.where : this.whereNotDeleted(query.where);

    const data = await this.prisma.user.findMany({
      ...query,
      where,
      omit: { password: true },
    });

    const dataWithPhotos = await this.objectManagerService.appendUrls(
      data,
      userFileFields,
    );

    const total = await this.prisma.user.count({ where });

    return { data: dataWithPhotos, total };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: this.whereNotDeleted({ id }),
      omit: { password: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOneWithPhoto(id: string) {
    const user = await this.findOne(id);
    const userWithPhoto = await this.objectManagerService.appendUrls(
      user,
      userFileFields,
    );
    return userWithPhoto;
  }

  async update(id: string, dto: UpdateUserDto, uploaderId?: string) {
    const exist = await this.findOne(id);

    const data: Partial<User> = { ...dto };
    if (dto.password) {
      data.password = await this.passwordService.hash(dto.password);
    }

    const { updatedPayload, uploadUrls } =
      await this.objectManagerService.updateWithFiles(
        data,
        exist,
        userFileFields,
        'users',
        uploaderId
          ? { uploaderId, entityType: 'USER', entityId: id }
          : undefined,
      );

    const result = await this.prisma.user.update({
      where: { id },
      data: updatedPayload,
      omit: { password: true },
    });

    return { user: result, uploadUrls };
  }

  async remove(id: string) {
    await this.findOne(id);
    await this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async forceRemove(id: string, uploaderId?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) throw new NotFoundException('User not found');

    const result = await this.prisma.user.delete({ where: { id } });

    await this.objectManagerService.deleteFilesFromObject(
      user,
      userFileFields,
      uploaderId ? { uploaderId, entityType: 'USER', entityId: id } : undefined,
    );

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...rest } = result;
    return rest;
  }

  async restore(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id, deletedAt: { not: null } },
    });
    if (!user) throw new NotFoundException('User not found or not deleted');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: null },
      omit: { password: true },
    });
  }
}
