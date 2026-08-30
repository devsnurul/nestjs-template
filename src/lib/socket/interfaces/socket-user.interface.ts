export interface SocketUser {
  sub: string;
  email: string;
  role: string;
  rules: string[];
  jti?: string;
}
