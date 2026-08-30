import { SocketUser } from './socket-user.interface';

export interface SocketAuthResult {
  user: SocketUser | null;
  authorized: boolean;
}

export interface SocketAuthPayload {
  user?: SocketUser;
}

export interface SocketEvent<T = unknown> {
  event: string;
  data: T;
  to?: string;
  room?: string;
}
