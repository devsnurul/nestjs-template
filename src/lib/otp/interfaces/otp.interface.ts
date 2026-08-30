export interface OtpRequestResult {
  expiresAt: Date;
  cooldownSeconds: number;
  code?: string;
}

export interface OtpVerifyResult {
  phone: string;
  purpose: string;
  userId?: string;
}
