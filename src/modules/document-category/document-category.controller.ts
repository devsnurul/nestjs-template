import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { DocumentCategoryService } from './document-category.service';
import { CreateDocumentCategoryDto } from './dto/create-document-category.dto';
import { UpdateDocumentCategoryDto } from './dto/update-document-category.dto';
import { RequirePermission } from '../../decorators/permission.decorator';
import {
  SmartQuery,
  SmartQueryInterceptor,
  SmartQueryResult,
} from 'src/lib/query-pagination';
import { Prisma } from '@generated/prisma/client';
import { documentCategoryQueryConfig } from './document-category.constants';

@Controller({ version: '1', path: 'document-categories' })
export class DocumentCategoryController {
  constructor(
    private readonly documentCategoryService: DocumentCategoryService,
  ) {}

  @Post()
  @RequirePermission('document_category:create')
  create(@Body() dto: CreateDocumentCategoryDto) {
    return this.documentCategoryService.create(dto);
  }

  @Get()
  @RequirePermission('document_category:view')
  @UseInterceptors(new SmartQueryInterceptor(documentCategoryQueryConfig))
  async findAll(
    @SmartQuery() query: SmartQueryResult<Prisma.DocumentCategoryWhereInput>,
  ) {
    const { where, orderBy, skip, take, page, limit } = query;
    const result = await this.documentCategoryService.findAll({
      where,
      orderBy,
      skip,
      take,
    });
    return { data: result.data, meta: { page, limit, total: result.total } };
  }

  @Get('options')
  @RequirePermission('document_category:view')
  findOptions() {
    return this.documentCategoryService.findOptions();
  }

  @Get(':id')
  @RequirePermission('document_category:view')
  findOne(@Param('id') id: string) {
    return this.documentCategoryService.findOne(id);
  }

  @Patch(':id')
  @RequirePermission('document_category:update')
  update(@Param('id') id: string, @Body() dto: UpdateDocumentCategoryDto) {
    return this.documentCategoryService.update(id, dto);
  }

  @Delete(':id')
  @RequirePermission('document_category:delete')
  remove(@Param('id') id: string) {
    return this.documentCategoryService.remove(id);
  }
}
