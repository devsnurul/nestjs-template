import { Module } from '@nestjs/common';
import { StoredObjectController } from './stored-object.controller';
import { StoredObjectService } from './stored-object.service';

@Module({
  controllers: [StoredObjectController],
  providers: [StoredObjectService],
  exports: [StoredObjectService],
})
export class StoredObjectModule {}
