import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { CreateStoredObjectDto } from './dto/create-stored-object.dto';
import { UpdateStoredObjectDto } from './dto/update-stored-object.dto';

type StoredObjectWithBigInt = {
  size: bigint | number;
  [key: string]: any;
};

@Injectable()
export class StoredObjectService {
  constructor(private readonly prisma: PrismaService) {}

  private whereNotDeleted(
    where?: Prisma.StoredObjectWhereInput,
  ): Prisma.StoredObjectWhereInput {
    return { ...where, deletedAt: null };
  }

  private mapOutput<T extends StoredObjectWithBigInt>(obj: T) {
    return { ...obj, size: Number(obj.size) };
  }

  async create(dto: CreateStoredObjectDto) {
    const obj = await this.prisma.storedObject.create({
      data: dto,
    });
    return this.mapOutput(obj);
  }

  async findAll(query: Prisma.StoredObjectFindManyArgs, withDeleted = false) {
    const where = withDeleted ? query.where : this.whereNotDeleted(query.where);

    const data = await this.prisma.storedObject.findMany({
      ...query,
      where,
    });

    const total = await this.prisma.storedObject.count({ where });

    return { data: data.map((item) => this.mapOutput(item)), total };
  }

  async findOne(id: string) {
    const obj = await this.prisma.storedObject.findFirst({
      where: this.whereNotDeleted({ id }),
    });
    if (!obj) throw new NotFoundException('StoredObject not found');
    return this.mapOutput(obj);
  }

  async findByEntity(entityType: string, entityId: string) {
    const items = await this.prisma.storedObject.findMany({
      where: this.whereNotDeleted({ entityType, entityId }),
    });
    return items.map((item) => this.mapOutput(item));
  }

  async update(id: string, dto: UpdateStoredObjectDto) {
    await this.findOne(id);
    const obj = await this.prisma.storedObject.update({
      where: { id },
      data: dto,
    });
    return this.mapOutput(obj);
  }

  async remove(id: string): Promise<void> {
    await this.findOne(id);
    await this.prisma.storedObject.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async forceRemove(id: string): Promise<void> {
    const obj = await this.prisma.storedObject.findUnique({ where: { id } });
    if (!obj) throw new NotFoundException('StoredObject not found');
    await this.prisma.storedObject.delete({ where: { id } });
  }

  async restore(id: string) {
    const obj = await this.prisma.storedObject.findUnique({
      where: { id, deletedAt: { not: null } },
    });
    if (!obj)
      throw new NotFoundException('StoredObject not found or not deleted');
    const restored = await this.prisma.storedObject.update({
      where: { id },
      data: { deletedAt: null },
    });
    return this.mapOutput(restored);
  }
}
