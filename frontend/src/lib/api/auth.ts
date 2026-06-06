import { apiFetch } from "./client";

export type AuthUser = {
  id: number;
  email: string;
  role: "USER" | "ADMIN";
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type AuthRequestOptions = {
  turnstileToken?: string | null;
};

function makeAuthBody(email: string, password: string, options?: AuthRequestOptions) {
  return {
    email,
    password,
    ...(options?.turnstileToken ? { turnstile_token: options.turnstileToken } : {}),
  };
}

export async function login(email: string, password: string, options?: AuthRequestOptions): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`/api/auth/login`, {
    method: "POST",
    body: makeAuthBody(email, password, options),
    cache: "no-store",
  });
}

export async function register(email: string, password: string, options?: AuthRequestOptions): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`/api/auth/register`, {
    method: "POST",
    body: makeAuthBody(email, password, options),
    cache: "no-store",
  });
}

