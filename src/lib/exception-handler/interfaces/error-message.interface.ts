export interface ErrorMessage {
  path: string;
  message: string[];
}

export interface ErrorResponse {
  success: boolean;
  message: string;
  errorMessages: ErrorMessage[];
}
