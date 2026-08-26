import { PartialType } from '@nestjs/mapped-types';
import { CreateStoredObjectDto } from './create-stored-object.dto';

export class UpdateStoredObjectDto extends PartialType(CreateStoredObjectDto) {}
