/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { SmartQueryContext } from '../interfaces/index';

export const SmartQuery = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): SmartQueryContext => {
    const request = ctx.switchToHttp().getRequest();
    return request.smartQuery as SmartQueryContext;
  },
);
