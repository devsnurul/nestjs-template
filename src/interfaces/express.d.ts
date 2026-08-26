import { JwtPayload } from '../path/to/jwt-payload';

declare module 'express' {
  export interface Request {
    user?: JwtPayload;
  }
}
