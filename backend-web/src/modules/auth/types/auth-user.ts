export type WebUserRole = 'USER' | 'ADMIN';

export type AuthUser = {
  id: number;
  email: string;
  role: WebUserRole;
};

export type AuthResponse = {
  user: AuthUser;
  token: string;
};

export type JwtPayload = {
  sub: number;
  email: string;
  role: WebUserRole;
};
