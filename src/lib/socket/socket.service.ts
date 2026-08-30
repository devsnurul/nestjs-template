import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(private readonly gateway: SocketGateway) {}

  emitToUser<T>(userId: string, event: string, data: T): void {
    this.gateway.emitToUser(userId, event, data);
  }

  emitToRoom<T>(room: string, event: string, data: T): void {
    this.gateway.emitToRoom(room, event, data);
  }

  emitToAll<T>(event: string, data: T): void {
    this.gateway.emitToAll(event, data);
  }
}
