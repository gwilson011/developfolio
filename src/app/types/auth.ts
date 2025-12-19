export interface AuthValidationRequest {
  password: string;
}

export interface AuthValidationResponse {
  ok: boolean;
  token?: string;
  error?: string;
}
