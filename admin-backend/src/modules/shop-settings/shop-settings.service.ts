import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { createCipheriv, createHash, randomBytes } from "node:crypto";
import { getPgPool } from "../../common/database/pg-pool";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { CurrentShop } from "../tenant/types/current-shop";
import {
  ShopPaymentMethod,
  ShopPaymentProvider,
  UpdateTelegramBotDto,
  UpsertPaymentCredentialDto,
} from "./dto/shop-settings.dto";

type BotRow = {
  id: number;
  shop_id: string;
  bot_username: string | null;
  status: string;
  has_token: boolean;
  created_at: Date;
  updated_at: Date;
};

type CredentialRow = {
  id: number;
  shop_id: string;
  payment_method: ShopPaymentMethod;
  provider: ShopPaymentProvider;
  display_name: string;
  public_payload: Record<string, unknown>;
  status: string;
  created_at: Date;
  updated_at: Date;
};

@Injectable()
export class ShopSettingsService {
  private get pool() {
    return getPgPool();
  }

  async getTelegramBot(currentShop: CurrentShop, shopId: string) {
    this.assertCurrentShop(currentShop, shopId);

    const result = await this.pool.query<BotRow>(
      `SELECT
          id,
          shop_id::text,
          bot_username,
          status::text AS status,
          (bot_token_encrypted IS NOT NULL) AS has_token,
          created_at,
          updated_at
       FROM telegram_bots
       WHERE shop_id = $1::uuid
       ORDER BY id ASC
       LIMIT 1`,
      [shopId],
    );

    const row = result.rows[0];
    return row ? this.toBotResponse(row) : { configured: false };
  }

  async updateTelegramBot(
    currentShop: CurrentShop,
    shopId: string,
    dto: UpdateTelegramBotDto,
  ) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertManager(currentShop);

    const encryptedToken = this.encryptJson({ bot_token: dto.bot_token });
    const botSecret = randomBytes(32).toString("base64url");
    const secretHash = this.sha256(botSecret);
    const botUsername = dto.bot_username?.replace(/^@/, "") || null;
    const status = dto.status ?? "ACTIVE";

    const existing = await this.pool.query<{ id: number }>(
      `SELECT id FROM telegram_bots WHERE shop_id = $1::uuid ORDER BY id ASC LIMIT 1`,
      [shopId],
    );

    const result = existing.rows[0]
      ? await this.pool.query<BotRow>(
          `UPDATE telegram_bots
           SET bot_username = $2,
               bot_token_encrypted = $3,
               secret_hash = $4,
               status = $5::shop_status_enum,
               updated_at = NOW()
           WHERE id = $1
           RETURNING id, shop_id::text, bot_username, status::text AS status,
                     (bot_token_encrypted IS NOT NULL) AS has_token,
                     created_at, updated_at`,
          [existing.rows[0].id, botUsername, encryptedToken, secretHash, status],
        )
      : await this.pool.query<BotRow>(
          `INSERT INTO telegram_bots (
              shop_id, bot_username, bot_token_encrypted, secret_hash, status
           )
           VALUES ($1::uuid, $2, $3, $4, $5::shop_status_enum)
           RETURNING id, shop_id::text, bot_username, status::text AS status,
                     (bot_token_encrypted IS NOT NULL) AS has_token,
                     created_at, updated_at`,
          [shopId, botUsername, encryptedToken, secretHash, status],
        );

    return {
      ...this.toBotResponse(result.rows[0]),
      internal_secret: botSecret,
    };
  }

  async listPaymentCredentials(currentShop: CurrentShop, shopId: string) {
    this.assertCurrentShop(currentShop, shopId);

    const result = await this.pool.query<CredentialRow>(
      `SELECT
          id,
          shop_id::text,
          payment_method::text AS payment_method,
          provider::text AS provider,
          display_name,
          public_payload,
          status::text AS status,
          created_at,
          updated_at
       FROM shop_payment_credentials
       WHERE shop_id = $1::uuid
       ORDER BY payment_method ASC, status ASC, id ASC`,
      [shopId],
    );

    return { credentials: result.rows.map(this.toCredentialResponse) };
  }

  async upsertPaymentCredential(
    currentShop: CurrentShop,
    shopId: string,
    dto: UpsertPaymentCredentialDto,
  ) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertManager(currentShop);
    this.assertPaymentProvider(dto.payment_method, dto.provider);

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        `UPDATE shop_payment_credentials
         SET status = 'DISABLED', updated_at = NOW()
         WHERE shop_id = $1::uuid
           AND payment_method = $2::product_payment_method_enum
           AND status = 'ACTIVE'`,
        [shopId, dto.payment_method],
      );

      const result = await client.query<CredentialRow>(
        `INSERT INTO shop_payment_credentials (
            shop_id, payment_method, provider, display_name,
            encrypted_payload, public_payload, status
         )
         VALUES (
            $1::uuid, $2::product_payment_method_enum, $3::shop_payment_provider_enum,
            $4, $5, $6::jsonb, 'ACTIVE'
         )
         RETURNING id, shop_id::text, payment_method::text AS payment_method,
                   provider::text AS provider, display_name, public_payload,
                   status::text AS status, created_at, updated_at`,
        [
          shopId,
          dto.payment_method,
          dto.provider,
          dto.display_name.trim(),
          this.encryptJson(dto.payload),
          JSON.stringify(dto.public_payload ?? {}),
        ],
      );

      await client.query("COMMIT");
      return this.toCredentialResponse(result.rows[0]);
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  async disablePaymentCredential(
    currentShop: CurrentShop,
    shopId: string,
    credentialId: number,
  ) {
    this.assertCurrentShop(currentShop, shopId);
    this.assertManager(currentShop);

    const result = await this.pool.query<CredentialRow>(
      `UPDATE shop_payment_credentials
       SET status = 'DISABLED', updated_at = NOW()
       WHERE id = $1
         AND shop_id = $2::uuid
       RETURNING id, shop_id::text, payment_method::text AS payment_method,
                 provider::text AS provider, display_name, public_payload,
                 status::text AS status, created_at, updated_at`,
      [credentialId, shopId],
    );

    const row = result.rows[0];
    if (!row) {
      throw new NotFoundException({
        code: ErrorCodes.NOT_FOUND,
        message: "Payment credential not found",
      });
    }
    return this.toCredentialResponse(row);
  }

  private assertCurrentShop(currentShop: CurrentShop, shopId: string) {
    if (currentShop.id !== shopId) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_ACCESS_DENIED,
        message: "X-Shop-Id does not match the requested shop",
      });
    }
  }

  private assertManager(currentShop: CurrentShop) {
    if (!["OWNER", "MANAGER"].includes(currentShop.member_role)) {
      throw new ForbiddenException({
        code: ErrorCodes.TENANT_SHOP_ACCESS_DENIED,
        message: "Shop owner or manager role is required",
      });
    }
  }

  private assertPaymentProvider(
    paymentMethod: ShopPaymentMethod,
    provider: ShopPaymentProvider,
  ) {
    const valid =
      (paymentMethod === "BINANCE" && provider === "BINANCE") ||
      (paymentMethod === "BANK" && ["BANK", "SEPAY"].includes(provider)) ||
      (paymentMethod === "CRYPTO" && provider === "CRYPTO");

    if (!valid) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Payment provider is not compatible with payment method",
      });
    }
  }

  private encryptJson(value: Record<string, unknown>): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.encryptionKey(), iv);
    const ciphertext = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return [
      "v1",
      iv.toString("base64url"),
      tag.toString("base64url"),
      ciphertext.toString("base64url"),
    ].join(":");
  }

  private encryptionKey(): Buffer {
    const keyMaterial =
      process.env.SHOP_SECRET_ENCRYPTION_KEY ||
      process.env.CREDENTIAL_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      "digitalshop-dev-secret";
    return createHash("sha256").update(keyMaterial).digest();
  }

  private sha256(value: string): string {
    return createHash("sha256").update(value).digest("hex");
  }

  private toBotResponse(row: BotRow) {
    return {
      configured: row.has_token,
      id: row.id,
      shop_id: row.shop_id,
      bot_username: row.bot_username,
      status: row.status,
      has_token: row.has_token,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }

  private toCredentialResponse(row: CredentialRow) {
    return {
      id: row.id,
      shop_id: row.shop_id,
      payment_method: row.payment_method,
      provider: row.provider,
      display_name: row.display_name,
      public_payload: row.public_payload,
      status: row.status,
      has_payload: true,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
