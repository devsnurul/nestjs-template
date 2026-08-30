export const OTP_PURPOSES = {
  APPLICANT_AUTH: 'APPLICANT_AUTH',
} as const;

export type OtpPurpose = (typeof OTP_PURPOSES)[keyof typeof OTP_PURPOSES];

export const OTP_SERVICE = 'otp';
