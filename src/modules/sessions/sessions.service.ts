import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../lib/prisma/prisma.service';
import { TokenService } from '../../lib/token/token.service';
import { env } from '../../config/env/index';
import type { Session } from '@generated/prisma/client';

export interface CreateSessionParams {
  userId: string;
  refreshToken: string;
  jti: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly tokenService: TokenService,
  ) {}

  async create(params: CreateSessionParams): Promise<Session> {
    const refreshTokenHash = this.tokenService.hashToken(params.refreshToken);
    const expiresAt = new Date(Date.now() + env.jwt.refreshExpiry * 1000);

    return this.prisma.session.create({
      data: {
        userId: params.userId,
        refreshTokenHash,
        jti: params.jti,
        deviceInfo: params.deviceInfo,
        ipAddress: params.ipAddress,
        userAgent: params.userAgent,
        expiresAt,
      },
    });
  }

  async findByJti(jti: string): Promise<Session | null> {
    return this.prisma.session.findUnique({ where: { jti } });
  }

  async findCurrent(jti: string) {
    const session = await this.prisma.session.findUnique({
      where: { jti },
      omit: { refreshTokenHash: true },
    });
    if (!session) throw new NotFoundException('Session not found');
    return session;
  }

  async findByUserId(userId: string): Promise<Session[]> {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: { gt: new Date() },
      },
      orderBy: { lastActivity: 'desc' },
    });
  }

  async revoke(id: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({ where: { id } });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) {
      throw new ForbiddenException('Cannot revoke another user session');
    }

    await this.prisma.session.update({
      where: { id },
      data: { revokedAt: new Date() },
    });
  }

  async revokeByJti(jti: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  async revokeOthers(sessionId: string, userId: string): Promise<void> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Session not found');
    if (session.userId !== userId) {
      throw new ForbiddenException('Cannot manage another user sessions');
    }

    await this.prisma.session.updateMany({
      where: {
        userId,
        id: { not: sessionId },
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });
  }

  async updateActivity(jti: string): Promise<void> {
    await this.prisma.session.update({
      where: { jti },
      data: { lastActivity: new Date() },
    });
  }

  async validateSession(jti?: string): Promise<void> {
    if (!jti) {
      throw new UnauthorizedException('Invalid session');
    }

    const session = await this.prisma.session.findUnique({ where: { jti } });
    if (!session || session.revokedAt || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Session has been revoked or expired');
    }
  }
}
