import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Pool } from 'pg';
import { getPgPool } from '../../common/database/pg-pool';
import { AuthUser } from '../auth/types/auth-user';
import { normalizeEmail } from '../auth/utils/code-generator';
import {
  DailyLoginPointClaimResult,
  DailyLoginPointMonthHistoryItem,
  DailyLoginPointStatus,
  ProfileResponse,
} from './types/me.types';
import { resolveDailyLoginConfig } from './utils/daily-login-config';

type UserRow = {
  id: number;
  email: string;
  password: string | null;
  role: 'USER' | 'ADMIN';
  status: 'ACTIVE' | 'BANNED';
  balance_point: string;
};

const UNIQUE_VIOLATION = '23505';

@Injectable()
export class MeService {
  private get pool(): Pool {
    return getPgPool();
  }

  constructor(private readonly config: ConfigService) {}

  async getProfile(userId: number): Promise<ProfileResponse> {
    const user = await this.findActiveUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user: this.toAuthUser(user) };
  }

  async updateProfile(userId: number, email: string): Promise<ProfileResponse> {
    const normalizedEmail = normalizeEmail(email);
    const current = await this.findActiveUserById(userId);
    if (!current) {
      throw new NotFoundException('User not found');
    }

    if (current.email === normalizedEmail) {
      return { user: this.toAuthUser(current) };
    }

    const duplicate = await this.pool.query<{ id: number }>(
      `SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1`,
      [normalizedEmail, userId],
    );
    if (duplicate.rows[0]) {
      throw new ConflictException('Email is already registered');
    }

    const result = await this.pool.query<UserRow>(
      `UPDATE users
       SET email = $2, updated_at = NOW()
       WHERE id = $1 AND role = 'USER' AND status = 'ACTIVE'
       RETURNING id, email, password, role, status, balance_point::text AS balance_point`,
      [userId, normalizedEmail],
    );
    const updated = result.rows[0];
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    return { user: this.toAuthUser(updated) };
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<{ message: string }> {
    if (currentPassword === newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const user = await this.findActiveUserById(userId);
    if (!user?.password) {
      throw new NotFoundException('User not found');
    }

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const rounds = Number(this.config.get<string>('BCRYPT_ROUNDS') ?? 12);
    const passwordHash = await bcrypt.hash(newPassword, rounds);

    await this.pool.query(
      `UPDATE users SET password = $2, updated_at = NOW() WHERE id = $1`,
      [userId, passwordHash],
    );

    return { message: 'Password changed' };
  }

  async getDailyLoginStatus(userId: number): Promise<DailyLoginPointStatus> {
    const user = await this.findActiveUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const daily = resolveDailyLoginConfig({
      timezone: this.config.get<string>('DAILY_LOGIN_TIMEZONE'),
      pointsReward: this.config.get<string>('DAILY_LOGIN_POINTS_REWARD'),
    });

    const claimResult = await this.pool.query<{ id: number }>(
      `SELECT id
       FROM daily_login_point_claims
       WHERE user_id = $1 AND claim_date = $2::date
       LIMIT 1`,
      [userId, daily.claimDate],
    );

    return {
      claimedToday: Boolean(claimResult.rows[0]),
      reward: daily.pointsReward,
      points: Number(user.balance_point ?? 0),
    };
  }

  async claimDailyLogin(userId: number): Promise<DailyLoginPointClaimResult> {
    const user = await this.findActiveUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const daily = resolveDailyLoginConfig({
      timezone: this.config.get<string>('DAILY_LOGIN_TIMEZONE'),
      pointsReward: this.config.get<string>('DAILY_LOGIN_POINTS_REWARD'),
    });

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const claimInsert = await client.query<{ id: number }>(
        `INSERT INTO daily_login_point_claims (user_id, claim_date, points_awarded)
         VALUES ($1, $2::date, $3)
         ON CONFLICT (user_id, claim_date) DO NOTHING
         RETURNING id`,
        [userId, daily.claimDate, daily.pointsReward],
      );

      if ((claimInsert.rowCount ?? 0) === 0) {
        await client.query('ROLLBACK');
        return {
          claimed: false,
          claimedToday: true,
          reward: daily.pointsReward,
          points: Number(user.balance_point ?? 0),
        };
      }

      await client.query(
        `INSERT INTO point_transactions (user_id, amount, type)
         VALUES ($1, $2, 'EARN'::point_tx_type_enum)`,
        [userId, daily.pointsReward],
      );

      const balanceResult = await client.query<{ balance_point: string }>(
        `UPDATE users
         SET balance_point = balance_point + $2,
             updated_at = NOW()
         WHERE id = $1
         RETURNING balance_point::text AS balance_point`,
        [userId, daily.pointsReward],
      );

      await client.query('COMMIT');

      return {
        claimed: true,
        claimedToday: true,
        reward: daily.pointsReward,
        points: Number(balanceResult.rows[0]?.balance_point ?? 0),
      };
    } catch (error) {
      await client.query('ROLLBACK');
      if (this.isUniqueViolation(error)) {
        return {
          claimed: false,
          claimedToday: true,
          reward: daily.pointsReward,
          points: Number(user.balance_point ?? 0),
        };
      }
      throw error;
    } finally {
      client.release();
    }
  }

  async getDailyLoginMonthHistory(userId: number): Promise<{ items: DailyLoginPointMonthHistoryItem[] }> {
    const user = await this.findActiveUserById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const daily = resolveDailyLoginConfig({
      timezone: this.config.get<string>('DAILY_LOGIN_TIMEZONE'),
      pointsReward: this.config.get<string>('DAILY_LOGIN_POINTS_REWARD'),
    });

    const result = await this.pool.query<{
      id: number;
      claim_date: string;
      points_awarded: number;
      created_at: Date;
    }>(
      `SELECT id, claim_date::text, points_awarded, created_at
       FROM daily_login_point_claims
       WHERE user_id = $1
         AND claim_date >= date_trunc('month', $2::date)
         AND claim_date < (date_trunc('month', $2::date) + INTERVAL '1 month')
       ORDER BY claim_date DESC, id DESC`,
      [userId, daily.claimDate],
    );

    return {
      items: result.rows.map((row) => ({
        id: row.id,
        claimDate: row.claim_date,
        pointsAwarded: row.points_awarded,
        createdAt: row.created_at.toISOString(),
      })),
    };
  }

  private async findActiveUserById(userId: number): Promise<UserRow | null> {
    const result = await this.pool.query<UserRow>(
      `SELECT id, email, password, role, status, balance_point::text AS balance_point
       FROM users
       WHERE id = $1 AND role = 'USER' AND status = 'ACTIVE'
       LIMIT 1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  private toAuthUser(row: Pick<UserRow, 'id' | 'email' | 'role'>): AuthUser {
    return {
      id: row.id,
      email: row.email,
      role: row.role,
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
