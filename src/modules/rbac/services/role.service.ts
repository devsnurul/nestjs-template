import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../lib/prisma/prisma.service';
import { PermissionCacheService } from './permission-cache.service';
import { CreateRoleDto } from '../dto/create-role.dto';
import { UpdateRoleDto } from '../dto/update-role.dto';
import { AssignUserRoleDto } from '../dto/assign-user-role.dto';
import type { Prisma } from '../../../generated/prisma/client';

@Injectable()
export class RoleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: PermissionCacheService,
  ) {}

  async create(dto: CreateRoleDto) {
    const existing = await this.prisma.role.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Role with slug "${dto.slug}" already exists`,
      );
    }

    return this.prisma.role.create({ data: dto });
  }

  async findAll(query: Prisma.RoleFindManyArgs) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.role.findMany({
        ...query,
        include: {
          _count: { select: { userAssignments: true } },
        },
      }),
      this.prisma.role.count({ where: query.where }),
    ]);

    return { data, total };
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        _count: { select: { userAssignments: true } },
      },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, dto: UpdateRoleDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.role.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Role with slug "${dto.slug}" already exists`,
        );
      }
    }

    const result = await this.prisma.role.update({
      where: { id },
      data: dto,
    });

    if (dto.rules) {
      const userIds = (
        await this.prisma.roleAssignment.findMany({
          where: { roleId: id },
          select: { userId: true },
        })
      ).map((ra) => ra.userId);

      for (const userId of userIds) {
        await this.cache.invalidate(userId);
      }
    }

    return result;
  }

  private readonly protectedSlugs = [
    'super-admin',
    'admin',
    'researcher',
    'officer',
  ];

  async remove(id: string) {
    const role = await this.findOne(id);
    if (role.isSystem || this.protectedSlugs.includes(role.slug)) {
      throw new ConflictException('Cannot delete a protected role');
    }

    return await this.prisma.$transaction(async (tx) => {
      const userIds = (
        await tx.roleAssignment.findMany({
          where: { roleId: id },
          select: { userId: true },
        })
      ).map((ra) => ra.userId);

      await tx.roleAssignment.deleteMany({ where: { roleId: id } });
      const result = await tx.role.delete({ where: { id } });

      for (const userId of userIds) {
        await this.cache.invalidate(userId);
      }
      return { message: 'Role deleted successfully', role: result };
    });
  }

  async assignUserRole(dto: AssignUserRoleDto) {
    await this.prisma.roleAssignment.upsert({
      where: {
        userId_roleId: { userId: dto.userId, roleId: dto.roleId },
      },
      update: {},
      create: dto,
    });

    await this.cache.invalidate(dto.userId);
  }

  async removeUserRole(userId: string, roleId: string) {
    await this.prisma.roleAssignment.delete({
      where: { userId_roleId: { userId, roleId } },
    });

    await this.cache.invalidate(userId);
  }

  async getUserRoles(userId: string) {
    return this.prisma.roleAssignment.findMany({
      where: { userId },
      include: {
        role: true,
      },
    });
  }
}
