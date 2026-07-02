import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { generateReferralCode } from '../../../../../shared/referral-code';
import {
  assertShopCustomerNotBanned,
  upsertShopCustomer,
} from '../../../../../shared/infrastructure/shop-customer';
import { AuthUserEntity } from '../../../domain/entities/auth-user.entity';
import { AuthUserRepository } from '../../../domain/repositories/auth-user.repository';

@Injectable()
export class PgAuthUserRepository implements AuthUserRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  async findTelegramMeById(
    shopId: string,
    telegramId: number,
  ): Promise<{
    id: number;
    telegramId: number;
    username: string | null;
    fullName: string | null;
    balanceVnd: number;
    balanceUsdt: number;
    balancePoint: number;
    completedOrders: number;
    balanceSpentUsdt: number;
    creditsSpentCoin: number;
  } | null> {
    const result = await this.pool.query(
      `WITH TARGET_USER AS (
        SELECT
          U.ID,
          U.TELEGRAM_ID,
          U.USERNAME,
          U.FULL_NAME,
          COALESCE(B.BALANCE_VND, 0) AS BALANCE_VND,
          COALESCE(B.BALANCE_USDT, 0) AS BALANCE_USDT,
          COALESCE(B.BALANCE_POINT, 0) AS BALANCE_POINT
        FROM USERS U
        LEFT JOIN USER_SHOP_BALANCES B
          ON B.USER_ID = U.ID AND B.SHOP_ID = $2::uuid
        WHERE U.TELEGRAM_ID = $1
        LIMIT 1
      ),
      ORDER_STATS AS (
        SELECT
          O.USER_ID,
          COUNT(*) FILTER (WHERE O.STATUS = 'DELIVERED')::INT AS COMPLETED_ORDERS,
          COALESCE(
            SUM(O.TOTAL_PRICE) FILTER (
              WHERE O.PAYMENT_METHOD = 'BALANCE'
                AND O.CURRENCY = 'USDT'
                AND O.STATUS IN ('PAID', 'DELIVERED')
            ),
            0
          ) AS BALANCE_SPENT_USDT
        FROM ORDERS O
        WHERE O.USER_ID = (SELECT ID FROM TARGET_USER)
          AND O.SHOP_ID = $2::uuid
        GROUP BY O.USER_ID
      ),
      POINT_STATS AS (
        SELECT
          PT.USER_ID,
          COALESCE(
            SUM(PT.AMOUNT) FILTER (WHERE PT.TYPE = 'SPEND'),
            0
          )::INT AS CREDITS_SPENT_COIN
        FROM POINT_TRANSACTIONS PT
        WHERE PT.USER_ID = (SELECT ID FROM TARGET_USER)
          AND PT.SHOP_ID = $2::uuid
        GROUP BY PT.USER_ID
      )
      SELECT
        TU.ID,
        TU.TELEGRAM_ID,
        TU.USERNAME,
        TU.FULL_NAME,
        TU.BALANCE_VND,
        TU.BALANCE_USDT,
        TU.BALANCE_POINT,
        COALESCE(OS.COMPLETED_ORDERS, 0) AS COMPLETED_ORDERS,
        COALESCE(OS.BALANCE_SPENT_USDT, 0) AS BALANCE_SPENT_USDT,
        COALESCE(PS.CREDITS_SPENT_COIN, 0) AS CREDITS_SPENT_COIN
      FROM TARGET_USER TU
      LEFT JOIN ORDER_STATS OS ON OS.USER_ID = TU.ID
      LEFT JOIN POINT_STATS PS ON PS.USER_ID = TU.ID`,
      [telegramId, shopId],
    );

    if (!result.rows.length) return null;
    const row = result.rows[0];
    return {
      id: Number(row.id),
      telegramId: Number(row.telegram_id),
      username: row.username ? String(row.username) : null,
      fullName: row.full_name ? String(row.full_name) : null,
      balanceVnd: Number(row.balance_vnd || 0),
      balanceUsdt: Number(row.balance_usdt || 0),
      balancePoint: Number(row.balance_point || 0),
      completedOrders: Number(row.completed_orders || 0),
      balanceSpentUsdt: Number(row.balance_spent_usdt || 0),
      creditsSpentCoin: Number(row.credits_spent_coin || 0),
    };
  }

  async getOrCreateByTelegramIdentity(
    shopId: string,
    input: {
      telegramId: number;
      username?: string;
      fullName?: string;
    },
  ): Promise<AuthUserEntity> {
    const tgId = input.telegramId;
    const username = input.username?.trim() || null;
    const fullName = input.fullName?.trim() || null;
    const topupCode = `TG${tgId}`;
    const referralCode = generateReferralCode(tgId);

    const upserted = await this.pool.query(
      `INSERT INTO
        USERS (
          TELEGRAM_ID,
          USERNAME,
          FULL_NAME,
          TOPUP_CODE,
          REFERRAL_CODE,
          ROLE
        )
      VALUES
        ($1, $2, $3, $4, $5, 'USER')
      ON CONFLICT (TELEGRAM_ID) DO UPDATE
      SET
        USERNAME = COALESCE(EXCLUDED.USERNAME, USERS.USERNAME),
        FULL_NAME = COALESCE(EXCLUDED.FULL_NAME, USERS.FULL_NAME),
        UPDATED_AT = NOW()
      RETURNING
        ID,
        TELEGRAM_ID,
        USERNAME,
        FULL_NAME,
        LANGUAGE,
        ROLE`,
      [tgId, username, fullName, topupCode, referralCode],
    );

    const user = this.mapRow(upserted.rows[0]);

    await assertShopCustomerNotBanned(this.pool, shopId, user.id);
    await upsertShopCustomer(this.pool, shopId, user.id);

    return user;
  }

  async updateLanguageByTelegramId(
    telegramId: number,
    language: 'en' | 'vi' | 'ru' | 'zh',
  ): Promise<AuthUserEntity | null> {
    const toDb = { en: 'EN', vi: 'VI', ru: 'RU', zh: 'ZH' } as const;
    const dbLanguage = toDb[language];
    const result = await this.pool.query(
      `UPDATE USERS
      SET
        LANGUAGE = $2,
        UPDATED_AT = NOW()
      WHERE
        TELEGRAM_ID = $1
      RETURNING
        ID,
        TELEGRAM_ID,
        USERNAME,
        FULL_NAME,
        LANGUAGE,
        ROLE`,
      [telegramId, dbLanguage],
    );

    if (!result.rows.length) return null;
    return this.mapRow(result.rows[0]);
  }

  private mapRow(row: Record<string, unknown>): AuthUserEntity {
    return {
      id: Number(row.id),
      telegramId: Number(row.telegram_id),
      username: row.username ? String(row.username) : null,
      fullName: row.full_name ? String(row.full_name) : null,
      language: this.mapDbLanguage(row.language),
      role: String(row.role) as 'USER' | 'ADMIN',
    };
  }

  private mapDbLanguage(value: unknown): AuthUserEntity['language'] {
    const raw = String(value || 'EN').toUpperCase();
    const table: Record<string, AuthUserEntity['language']> = {
      EN: 'en',
      VI: 'vi',
      RU: 'ru',
      ZH: 'zh',
    };
    return table[raw] ?? 'en';
  }
}
