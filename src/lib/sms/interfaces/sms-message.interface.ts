export interface SmsMessage {
  to: string;
  body: string;
  from?: string;
  mediaUrl?: string[];
}

export interface SmsSendOptions {
  from?: string;
  mediaUrl?: string[];
}

export interface SmsSendJobPayload {
  messages: SmsMessage[];
}
