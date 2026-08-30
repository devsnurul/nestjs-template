import {
  WebSocketGateway,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger, UnauthorizedException } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { TokenService } from '../token/token.service';
import { SessionsService } from 'src/modules/sessions/sessions.service';
import { SocketUser } from './interfaces/socket-user.interface';
import { env } from '../../config/env/index';

type AuthSocket = Socket & { user?: SocketUser };

@WebSocketGateway({
  path: env.socket.path,
  namespace: env.socket.namespace === '/' ? undefined : env.socket.namespace,
  cors: {
    origin: env.socket.cors.allowedOrigins,
    credentials: true,
  },
})
export class SocketGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(SocketGateway.name);

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly tokenService: TokenService,
    private readonly sessionsService: SessionsService,
  ) {}

  afterInit(server: Server): void {
    if (env.socket.useRedisAdapter) {
      const pubClient = new Redis({
        host: env.redis.host,
        port: env.redis.port,
        password: env.redis.password || undefined,
        db: env.redis.db,
      });
      const subClient = pubClient.duplicate();

      server.adapter(createAdapter(pubClient, subClient));
      this.logger.log('Socket.IO Redis adapter enabled');
    }
  }

  async handleConnection(client: AuthSocket): Promise<void> {
    try {
      const user = await this.authenticate(client);

      if (!user) {
        client.disconnect(true);
        return;
      }

      client.user = user;
      await client.join(this.userRoom(user.sub));

      this.logger.log(`Socket connected: ${client.id} (user ${user.sub})`);
    } catch (error) {
      this.logger.warn(`Socket rejected: ${client.id} - ${error}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthSocket): void {
    if (client.user) {
      this.logger.log(
        `Socket disconnected: ${client.id} (user ${client.user.sub})`,
      );
    }
  }

  @SubscribeMessage('socket:join')
  handleJoin(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() room: string,
  ): void {
    if (!this.isAuthorized(client) || !room) return;
    void client.join(this.room(room));
  }

  @SubscribeMessage('socket:leave')
  handleLeave(
    @ConnectedSocket() client: AuthSocket,
    @MessageBody() room: string,
  ): void {
    if (!this.isAuthorized(client) || !room) return;
    void client.leave(this.room(room));
  }

  @SubscribeMessage('socket:ping')
  handlePing(): { event: string; timestamp: number } {
    return { event: 'socket:pong', timestamp: Date.now() };
  }

  emitToUser<T>(userId: string, event: string, data: T): void {
    this.server.to(this.userRoom(userId)).emit(event, data);
  }

  emitToRoom<T>(room: string, event: string, data: T): void {
    this.server.to(this.room(room)).emit(event, data);
  }

  emitToAll<T>(event: string, data: T): void {
    this.server.emit(event, data);
  }

  userRoom(userId: string): string {
    return `user:${userId}`;
  }

  private room(name: string): string {
    return `room:${name}`;
  }

  private isAuthorized(client: AuthSocket): boolean {
    if (client.user) return true;
    client.disconnect(true);
    return false;
  }

  private async authenticate(client: AuthSocket): Promise<SocketUser | null> {
    const token = this.extractToken(client.handshake);

    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    const payload = this.tokenService.verifyAccessToken(token);
    await this.sessionsService.validateSession(payload.jti);

    return {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      rules: payload.rules,
      jti: payload.jti,
    };
  }

  private extractToken(handshake: Socket['handshake']): string | null {
    const authToken = handshake.auth?.token as string | undefined;
    if (authToken) return authToken;

    const headers = handshake.headers as Record<
      string,
      string | string[] | undefined
    >;
    const authorization = headers.authorization;

    if (typeof authorization !== 'string') return null;

    const [scheme, token] = authorization.split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
  }
}
