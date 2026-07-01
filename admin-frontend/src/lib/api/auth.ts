import { apiFetch } from "./client";
import type { SellerShop } from "@/lib/shop-context";

type AuthResponse = {
  access_token: string;
  expires_in: number;
  admin: {
    id: number;
    email: string;
    full_name: string;
    role: string;
    can_create_shop: boolean;
    shops: SellerShop[];
  };
};

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>(`/api/admin/v1/auth/login`, {
    method: "POST",
    body: { email, password },
    cache: "no-store",
  });
}

type AdminProfile = AuthResponse["admin"] & {
  can_create_shop: boolean;
  shops: SellerShop[];
  created_at?: string;
  updated_at?: string;
};

export async function getMe(token: string): Promise<AdminProfile> {
  return apiFetch<AdminProfile>(`/api/admin/v1/auth/me`, {
    method: "GET",
    token,
    cache: "no-store",
  });
}

export async function logout(token: string): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/v1/auth/logout`, {
    method: "POST",
    token,
    cache: "no-store",
  });
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return apiFetch<{ message: string }>(`/api/admin/v1/auth/change-password`, {
    method: "PUT",
    token,
    body: { currentPassword, newPassword },
    cache: "no-store",
  });
}

