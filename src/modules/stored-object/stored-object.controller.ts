import { Controller, Get, Param, Query, UseInterceptors } from '@nestjs/common';
import { StoredObjectService } from './stored-object.service';
import {
  SmartQuery,
  SmartQueryInterceptor,
  SmartQueryResult,
} from 'src/lib/query-pagination';
import { storedObjectQueryConfig } from './stored-object.constants';
import type { Prisma } from '@generated/prisma/client';

@Controller({ version: '1', path: 'stored-objects' })
export class StoredObjectController {
  constructor(private readonly storedObjectService: StoredObjectService) {}

  @Get()
  @UseInterceptors(new SmartQueryInterceptor(storedObjectQueryConfig))
  async findAll(
    @SmartQuery() query: SmartQueryResult<Prisma.StoredObjectWhereInput>,
    @Query('withDeleted') withDeleted?: string,
  ) {
    const { where, orderBy, skip, take, page, limit } = query;

    const result = await this.storedObjectService.findAll(
      { where, orderBy, skip, take },
      withDeleted === 'true',
    );

    return {
      data: result.data,
      meta: { page, limit, total: result.total },
    };
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.storedObjectService.findOne(id);
  }

  @Get('entity/:entityType/:entityId')
  findByEntity(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.storedObjectService.findByEntity(entityType, entityId);
  }
}
