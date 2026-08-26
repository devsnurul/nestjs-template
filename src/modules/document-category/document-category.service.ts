import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import type { Prisma } from '../../generated/prisma/client';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';

@Injectable()
export class DocumentCategoryService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateDocumentCategoryDto) {
    const existing = await this.prisma.documentCategory.findUnique({
      where: { slug: dto.slug },
    });
    if (existing) {
      throw new ConflictException(
        `Document category with slug "${dto.slug}" already exists`,
      );
    }

    const duplicateName = await this.prisma.documentCategory.findFirst({
      where: { name: dto.name },
    });
    if (duplicateName) {
      throw new ConflictException(
        `Document category with name "${dto.name}" already exists`,
      );
    }

    return this.prisma.documentCategory.create({ data: dto });
  }

  async findAll(query: Prisma.DocumentCategoryFindManyArgs) {
    const [data, total] = await this.prisma.$transaction([
      this.prisma.documentCategory.findMany({
        ...query,
        orderBy: query.orderBy ?? { sortOrder: 'asc' },
      }),
      this.prisma.documentCategory.count({ where: query.where }),
    ]);
    return { data, total };
  }

  async findOne(id: string) {
    const category = await this.prisma.documentCategory.findUnique({
      where: { id },
    });
    if (!category) throw new NotFoundException('Document category not found');
    return category;
  }

  async findBySlug(slug: string) {
    const category = await this.prisma.documentCategory.findUnique({
      where: { slug },
    });
    if (!category) throw new NotFoundException('Document category not found');
    return category;
  }

  async findOptions() {
    return this.prisma.documentCategory.findMany({
      select: { id: true, name: true, slug: true },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(id: string, dto: UpdateDocumentCategoryDto) {
    await this.findOne(id);

    if (dto.slug) {
      const existing = await this.prisma.documentCategory.findUnique({
        where: { slug: dto.slug },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Document category with slug "${dto.slug}" already exists`,
        );
      }
    }

    if (dto.name) {
      const duplicateName = await this.prisma.documentCategory.findFirst({
        where: { name: dto.name, id: { not: id } },
      });
      if (duplicateName) {
        throw new ConflictException(
          `Document category with name "${dto.name}" already exists`,
        );
      }
    }

    return this.prisma.documentCategory.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.documentCategory.delete({ where: { id } });
  }
}
