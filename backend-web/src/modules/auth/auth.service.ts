import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { getPgPool } from '../../common/database/pg-pool';
import { AuthResponse, AuthUser, JwtPayload } from './types/auth-user';
import { generatePublicCode, generateReferralCode, normalizeEmail } from './utils/code-generator';

type UserRow = {
  id: number;
  email: string;
  password: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED';
};

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class AuthService {
  private get pool(): Pool {
    return getPgPool();
  }

  constructor(
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = normalizeEmail(email);
    const existing = await this.findActiveUserByEmail(normalizedEmail);

    if (existing) {
      throw new ConflictException('Email is already registered');
    }

    const rounds = Number(this.config.get<string>('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(password, rounds);
    const user = await this.createWebUser(normalizedEmail, passwordHash);

    return this.toAuthResponse(user);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.findActiveUserByEmail(normalizedEmail);

    if (!user?.password || !(await bcrypt.compare(password, user.password))) {
      throw new UnauthorizedException('Invalid email or password');
    }

    return this.toAuthResponse(user);
  }

  async getActiveUserById(id: number): Promise<AuthUser | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password, role, status
       FROM users
       WHERE id = $1 AND role = 'USER' AND status = 'ACTIVE'
       LIMIT 1`,
      [id],
    );
    const user = result.rows[0];
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      role: user.role,
    };
  }

  private async findActiveUserByEmail(email: string): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password, role, status
       FROM users
       WHERE email = $1 AND role = 'USER' AND status = 'ACTIVE'
       LIMIT 1`,
      [email],
    );

    return result.rows[0] ?? null;
  }

  private async createWebUser(email: string, passwordHash: string): Promise<UserRow> {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const result = await this.pool.query<UserRow>(
          `INSERT INTO users (
              email,
              password,
              topup_code,
              referral_code,
              role,
              status,
              language
            )
            VALUES ($1, $2, $3, $4, 'USER', 'ACTIVE', 'EN')
            RETURNING id, email, password, role, status`,
          [email, passwordHash, generatePublicCode('WEB'), generateReferralCode()],
        );

        return result.rows[0];
      } catch (error) {
        if (this.isUniqueViolation(error)) {
          const existing = await this.findActiveUserByEmail(email);
          if (existing) {
            throw new ConflictException('Email is already registered');
          }
          if (attempt < 7) continue;
          throw new ConflictException('Email or generated user code already exists');
        }

        throw error;
      }
    }

    throw new ConflictException('Could not create web user');
  }

  private toAuthResponse(row: Pick<UserRow, 'id' | 'email' | 'role'>): AuthResponse {
    const user: AuthUser = {
      id: row.id,
      email: row.email,
      role: row.role,
    };
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return {
      user,
      token: this.jwtService.sign(payload),
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code?: string }).code === UNIQUE_VIOLATION
    );
  }
}
