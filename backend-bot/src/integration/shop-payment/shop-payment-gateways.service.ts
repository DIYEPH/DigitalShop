import { Injectable } from '@nestjs/common';
import { getSharedPgPool } from '../../shared/infrastructure/pg-pool';
import { decryptShopSecretJson } from '../../shared/infrastructure/shop-secret-crypto';
import { BinancePayGateway } from '../binance/binance-pay.gateway';
import { SepayGateway } from '../bank/sepay.gateway';

interface CredentialRow {
  provider: string;
  encrypted_payload: string | null;
  public_payload: Record<string, unknown> | null;
}

interface CacheEntry<T> {
  value: T | null;
  expiresAt: number;
}

const CACHE_TTL_MS = 30_000;

function str(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

/**
 * Per-shop payment gateways built from shop_payment_credentials (managed in
 * seller admin settings). Replaces the old process-wide env-based gateways.
 */
@Injectable()
export class ShopPaymentGatewaysService {
  private readonly binanceCache = new Map<string, CacheEntry<BinancePayGateway>>();
  private readonly sepayCache = new Map<string, CacheEntry<SepayGateway>>();

  async getBinance(shopId: string): Promise<BinancePayGateway | null> {
    return this.getCached(this.binanceCache, shopId, async () => {
      const row = await this.findActiveCredential(shopId, 'BINANCE');
      if (!row) return null;
      const pub = row.public_payload ?? {};
      const secret = decryptShopSecretJson(row.encrypted_payload);
      const gateway = new BinancePayGateway(
        str(secret.api_key),
        str(secret.api_secret),
        str(pub.pay_id),
        str(pub.qr_url),
      );
      return gateway.isEnabled() ? gateway : null;
    });
  }

  async getSepay(shopId: string): Promise<SepayGateway | null> {
    return this.getCached(this.sepayCache, shopId, async () => {
      const row = await this.findActiveCredential(shopId, 'BANK');
      if (!row || row.provider !== 'SEPAY') return null;
      const pub = row.public_payload ?? {};
      const secret = decryptShopSecretJson(row.encrypted_payload);
      const gateway = new SepayGateway(
        str(secret.api_key),
        str(pub.bank_name),
        str(pub.account_number),
        str(pub.account_holder),
        str(pub.bank_bin),
      );
      return gateway.isBankCheckoutReady() ? gateway : null;
    });
  }

  private async findActiveCredential(
    shopId: string,
    method: 'BINANCE' | 'BANK',
  ): Promise<CredentialRow | null> {
    const result = await getSharedPgPool().query<CredentialRow>(
      `SELECT provider::text AS provider, encrypted_payload, public_payload
       FROM shop_payment_credentials
       WHERE shop_id = $1::uuid
         AND payment_method = $2::product_payment_method_enum
         AND status = 'ACTIVE'
       LIMIT 1`,
      [shopId, method],
    );
    return result.rows[0] ?? null;
  }

  private async getCached<T>(
    cache: Map<string, CacheEntry<T>>,
    shopId: string,
    load: () => Promise<T | null>,
  ): Promise<T | null> {
    const now = Date.now();
    const cached = cache.get(shopId);
    if (cached && cached.expiresAt > now) return cached.value;
    const value = await load();
    cache.set(shopId, { value, expiresAt: now + CACHE_TTL_MS });
    return value;
  }
}
