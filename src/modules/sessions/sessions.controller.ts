import { Controller, Get, Delete, Param } from '@nestjs/common';
import { SessionsService } from './sessions.service';
import type { TokenPayload } from '../../lib/token/token.service';
import { CurrentUser } from 'src/decorators/current-user.decorator';

@Controller({ version: '1', path: 'auth/sessions' })
export class SessionsController {
  constructor(private readonly sessionsService: SessionsService) {}

  @Get()
  findAll(@CurrentUser() user: TokenPayload) {
    return this.sessionsService.findByUserId(user.sub);
  }

  @Get('me')
  findCurrent(@CurrentUser() user: TokenPayload) {
    return this.sessionsService.findCurrent(user.jti!);
  }

  @Delete(':id')
  revoke(@Param('id') id: string, @CurrentUser() user: TokenPayload) {
    return this.sessionsService.revoke(id, user.sub);
  }

  @Delete(':sessionId/others')
  revokeOthers(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: TokenPayload,
  ) {
    return this.sessionsService.revokeOthers(sessionId, user.sub);
  }
}
