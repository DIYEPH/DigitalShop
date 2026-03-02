import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { ApiException } from '../../../../../shared/errors/api.exception';
import { TopupCurrency, TopupEntity, TopupProvider } from '../../../domain/entities/topup.entity';
import {
  CreateTopupParams,
  TopupRepository,
} from '../../../domain/repositories/topup.repository';

@Injectable()
export class PgTopupRepository implements TopupRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async findUserIdByTelegramId(telegramId: number): Promise<number | null> {
    const result = await this.pool.query<{ id: number }>(
      `SELECT id FROM users WHERE telegram_id = $1 LIMIT 1`,
      [telegramId],
    );
    return result.rows[0]?.id ?? null;
  }

  async findActivePendingTopup(userId: number): Promise<TopupEntity | null> {
    const result = await this.pool.query<TopupRow>(
      `SELECT id, user_id, provider::text, currency::text, amount::float8,
              payment_code, tx_id, status::text, expires_at, paid_at, created_at
       FROM balance_topups
       WHERE user_id = $1
         AND status = 'PENDING'
         AND expires_at > NOW()
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async createBinanceTopup(params: CreateTopupParams): Promise<TopupEntity> {
    return this.insertTopup(params, 'BINANCE', 'USDT');
  }

  async createBankTopup(params: CreateTopupParams): Promise<TopupEntity> {
    return this.insertTopup(params, 'BANK', 'VND');
  }

  async findTopupById(id: number, userId: number): Promise<TopupEntity | null> {
    const result = await this.pool.query<TopupRow>(
      `SELECT id, user_id, provider::text, currency::text, amount::float8,
              payment_code, tx_id, status::text, expires_at, paid_at, created_at
       FROM balance_topups
       WHERE id = $1 AND user_id = $2
       LIMIT 1`,
      [id, userId],
    );
    return result.rows[0] ? mapRow(result.rows[0]) : null;
  }

  async cancelTopup(id: number, userId: number): Promise<boolean> {
    const result = await this.pool.query(
      `UPDATE balance_topups
       SET status = 'FAILED', updated_at = NOW()
       WHERE id = $1 AND user_id = $2 AND status = 'PENDING'`,
      [id, userId],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async listPendingBinanceTopups(): Promise<TopupEntity[]> {
    return this.listPendingByProvider('BINANCE');
  }

  async listPendingBankTopups(): Promise<TopupEntity[]> {
    return this.listPendingByProvider('BANK');
  }

  async confirmBinanceTopupAndCreditBalance(id: number, txId: string): Promise<boolean> {
    return this.confirmAndCredit(id, txId, 'BINANCE', 'USDT', 'balance_usdt');
  }

  async confirmBankTopupAndCreditBalance(id: number, txId: string): Promise<boolean> {
    return this.confirmAndCredit(id, txId, 'BANK', 'VND', 'balance_vnd');
  }

  async expireTimedPendingTopups(batchSize = 100): Promise<{ cancelledCount: number }> {
    const result = await this.pool.query<{ cancelled_count: string }>(
      `WITH expired AS (
          SELECT id FROM balance_topups
          WHERE status = 'PENDING' AND expires_at < NOW()
          ORDER BY created_at ASC
          LIMIT $1
          FOR UPDATE SKIP LOCKED
        )
        UPDATE balance_topups
        SET status = 'FAILED', updated_at = NOW()
        FROM expired
        WHERE balance_topups.id = expired.id
        RETURNING balance_topups.id`,
      [batchSize],
    );
    return { cancelledCount: result.rowCount ?? 0 };
  }

  private async insertTopup(
    params: CreateTopupParams,
    provider: TopupProvider,
    currency: TopupCurrency,
  ): Promise<TopupEntity> {
    const result = await this.pool.query<TopupRow>(
      `INSERT INTO balance_topups (user_id, provider, currency, amount, payment_code, expires_at)
       VALUES ($1, $2::product_payment_method_enum, $3::currency_enum, $4, $5, $6)
       RETURNING id, user_id, provider::text, currency::text, amount::float8,
                 payment_code, tx_id, status::text, expires_at, paid_at, created_at`,
      [params.userId, provider, currency, params.amount, params.paymentCode, params.expiresAt],
    );
    if (!result.rows[0]) {
      throw new ApiException('topup_create_failed', 'Failed to create topup.', 500);
    }
    return mapRow(result.rows[0]);
  }

  private async listPendingByProvider(provider: TopupProvider): Promise<TopupEntity[]> {
    const result = await this.pool.query<TopupRow>(
      `SELECT id, user_id, provider::text, currency::text, amount::float8,
              payment_code, tx_id, status::text, expires_at, paid_at, created_at
       FROM balance_topups
       WHERE status = 'PENDING'
         AND provider = $1::product_payment_method_enum
         AND expires_at > NOW()
       ORDER BY created_at ASC`,
      [provider],
    );
    return result.rows.map(mapRow);
  }

  private async confirmAndCredit(
    id: number,
    txId: string,
    provider: TopupProvider,
    currency: TopupCurrency,
    balanceColumn: 'balance_usdt' | 'balance_vnd',
  ): Promise<boolean> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `WITH confirm AS (
            UPDATE balance_topups
            SET status = 'CONFIRMED',
                tx_id = $2,
                paid_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
              AND status = 'PENDING'
              AND tx_id IS NULL
              AND provider = $3::product_payment_method_enum
              AND currency = $4::currency_enum
            RETURNING user_id, amount
          )
          UPDATE users
          SET ${balanceColumn} = ${balanceColumn} + (SELECT amount FROM confirm),
              updated_at = NOW()
          WHERE id = (SELECT user_id FROM confirm)
          RETURNING id`,
        [id, txId, provider, currency],
      );

      await client.query('COMMIT');
      return (result.rowCount ?? 0) > 0;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}

interface TopupRow {
  id: number;
  user_id: number;
  provider: string;
  currency: string;
  amount: number;
  payment_code: string;
  tx_id: string | null;
  status: string;
  expires_at: Date;
  paid_at: Date | null;
  created_at: Date;
}

function mapRow(row: TopupRow): TopupEntity {
  return {
    id: Number(row.id),
    userId: Number(row.user_id),
    provider: row.provider as TopupProvider,
    currency: row.currency as TopupCurrency,
    amount: Number(row.amount),
    paymentCode: String(row.payment_code),
    txId: row.tx_id ? String(row.tx_id) : null,
    status: row.status as TopupEntity['status'],
    expiresAt: new Date(row.expires_at),
    paidAt: row.paid_at ? new Date(row.paid_at) : null,
    createdAt: new Date(row.created_at),
  };
}
