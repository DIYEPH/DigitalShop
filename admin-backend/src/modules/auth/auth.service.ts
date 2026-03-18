import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from "bcrypt";
import { getPgPool } from "../../common/database/pg-pool";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { jwtExpiresInSeconds } from "../../common/utils/jwt-expires.util";
import { AdminUser } from "./types/admin-user";

type AdminRow = {
  id: number;
  email: string;
  password: string | null;
  role: string;
  full_name: string | null;
  status: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class AuthService {
  private get pool() {
    return getPgPool();
  }

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(email: string, password: string) {
    const user = await this.findAdminByEmail(email);
    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: "Invalid email or password",
      });
    }

    const access_token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      access_token,
      expires_in: jwtExpiresInSeconds(),
      admin: this.toAdminProfile(user),
    };
  }

  async getActiveAdminById(id: number): Promise<AdminUser | null> {
    const result = await this.pool.query<AdminRow>(
      `SELECT id, email, role, full_name, status
       FROM users
       WHERE id = $1 AND role = 'ADMIN' AND status = 'ACTIVE'`,
      [id],
    );
    const row = result.rows[0];
    if (!row) return null;
    return this.toAdminProfile(row);
  }

  async getProfile(userId: number) {
    const admin = await this.getActiveAdminById(userId);
    if (!admin) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_USER_NOT_FOUND,
        message: "Admin user not found",
      });
    }

    const result = await this.pool.query<{
      created_at: Date;
      updated_at: Date;
    }>(`SELECT created_at, updated_at FROM users WHERE id = $1`, [userId]);
    const meta = result.rows[0];

    return {
      ...admin,
      created_at: meta?.created_at,
      updated_at: meta?.updated_at,
    };
  }

  async changePassword(
    userId: number,
    currentPassword: string,
    newPassword: string,
  ): Promise<void> {
    if (currentPassword === newPassword) {
      throw new BadRequestException({
        code: ErrorCodes.AUTH_PASSWORD_TOO_WEAK,
        message: "New password must be different from current password",
      });
    }

    const result = await this.pool.query<Pick<AdminRow, "password">>(
      `SELECT password FROM users WHERE id = $1 AND role = 'ADMIN' AND status = 'ACTIVE'`,
      [userId],
    );
    const row = result.rows[0];
    if (!row?.password) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_USER_NOT_FOUND,
        message: "Admin user not found",
      });
    }

    const ok = await bcrypt.compare(currentPassword, row.password);
    if (!ok) {
      throw new UnauthorizedException({
        code: ErrorCodes.AUTH_INVALID_CREDENTIALS,
        message: "Current password is incorrect",
      });
    }

    const rounds = this.config.get<number>("security.bcryptRounds") || 12;
    const hash = await bcrypt.hash(newPassword, rounds);

    await this.pool.query(
      `UPDATE users SET password = $1, updated_at = NOW() WHERE id = $2`,
      [hash, userId],
    );
  }

  private async findAdminByEmail(email: string): Promise<AdminRow | null> {
    const result = await this.pool.query<AdminRow>(
      `SELECT id, email, password, role, full_name, status, created_at, updated_at
       FROM users
       WHERE email = $1 AND role = 'ADMIN' AND status = 'ACTIVE'`,
      [email],
    );
    return result.rows[0] ?? null;
  }

  private toAdminProfile(
    row: Pick<AdminRow, "id" | "email" | "role" | "full_name">,
  ): AdminUser {
    return {
      id: row.id,
      email: row.email,
      full_name: row.full_name,
      role: row.role,
    };
  }
}
