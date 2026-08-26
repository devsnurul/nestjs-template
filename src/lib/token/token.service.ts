import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'node:crypto';
import { env } from '../../config/env/index';

export interface TokenPayload {
  sub: string;
  email: string;
  role: string;
  rules: string[];
  jti?: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  generateTokens(payload: TokenPayload): TokenPair {
    const jti = crypto.randomUUID();
    const accessToken = this.jwtService.sign(
      { ...payload, jti },
      { expiresIn: env.jwt.accessExpiry },
    );
    const refreshToken = this.jwtService.sign(
      { ...payload, jti },
      { expiresIn: env.jwt.refreshExpiry },
    );
    return { accessToken, refreshToken };
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return this.jwtService.verify<TokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload & { jti: string } {
    try {
      return this.jwtService.verify<TokenPayload & { jti: string }>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  refreshTokens(refreshToken: string, rules: string[]) {
    const payload = this.verifyRefreshToken(refreshToken);
    const tokenPair = this.generateTokens({
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
      rules,
    });
    return { payload, ...tokenPair };
  }
}
