import { Global, Module } from '@nestjs/common';
import { ObjectManagerService } from './object-manager.service';
import { StoredObjectModule } from 'src/modules/stored-object/stored-object.module';

@Global()
@Module({
  imports: [StoredObjectModule],
  providers: [ObjectManagerService],
  exports: [ObjectManagerService],
})
export class ObjectManagerModule {}
