import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { parsePgEnumArray } from '../../../../../shared/infrastructure/pg-enum-array';
import {
  TelegramProductDetailEntity,
  TelegramProductVariantEntity,
} from '../../../domain/entities/product-detail.entity';
import { TelegramProductListItemEntity } from '../../../domain/entities/product-list-item.entity';
import { ProductRepository } from '../../../domain/repositories/product.repository';

@Injectable()
export class PgProductRepository implements ProductRepository {
  private readonly pool: Pool;

  constructor() {
    this.pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }

  async listTelegramProducts(
    categoryId: number | null,
    page: number,
    limit: number,
  ): Promise<{ items: TelegramProductListItemEntity[]; total: number }> {
    const offset = (page - 1) * limit;
    const queryParams: unknown[] = [];

    if (categoryId != null) queryParams.push(categoryId);
    queryParams.push(limit, offset);

    const catIdx = categoryId != null ? 1 : null;
    const limitIdx = catIdx != null ? 2 : 1;
    const offsetIdx = catIdx != null ? 3 : 2;
    const categoryWhere = catIdx != null ? `WHERE P.CATEGORY_ID = $${catIdx}` : '';

    const result = await this.pool.query(
      `SELECT
          P.ID,
          P.CATEGORY_ID,
          P.NAME_EN,
          P.NAME_VI,
          PRICES.MIN_PRICE_VND,
          PRICES.MIN_PRICE_USDT,
          COALESCE(STOCK.STOCK_COUNT, 0) AS STOCK_COUNT
        FROM PRODUCTS P
        LEFT JOIN (
          SELECT
            V.PRODUCT_ID,
            ROUND(MIN(V.AMOUNT_VND), 0) AS MIN_PRICE_VND,
            ROUND(MIN(V.AMOUNT_USDT), 2) AS MIN_PRICE_USDT
          FROM PRODUCT_VARIANTS V
          WHERE V.IS_ACTIVE = TRUE
          GROUP BY V.PRODUCT_ID
        ) PRICES ON PRICES.PRODUCT_ID = P.ID
        LEFT JOIN (
          SELECT
            V.PRODUCT_ID,
            COUNT(S.ID)::INT AS STOCK_COUNT
          FROM PRODUCT_VARIANTS V
          INNER JOIN STOCK_ITEMS S ON S.VARIANT_ID = V.ID
          WHERE V.IS_ACTIVE = TRUE AND S.STATUS = 'AVAILABLE'
          GROUP BY V.PRODUCT_ID
        ) STOCK ON STOCK.PRODUCT_ID = P.ID
        ${categoryWhere}
        ORDER BY P.ID DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      queryParams,
    );

    const items = result.rows.map((row) => ({
      id: Number(row.id),
      categoryId: Number(row.category_id),
      nameEn: String(row.name_en),
      nameVi: String(row.name_vi),
      minPriceVnd: row.min_price_vnd == null ? null : Number(row.min_price_vnd),
      minPriceUsdt: row.min_price_usdt == null ? null : Number(row.min_price_usdt),
      stockCount: Number(row.stock_count ?? 0),
    }));

    return { items, total: items.length };
  }

  async findTelegramProductDetailById(
    productId: number,
  ): Promise<TelegramProductDetailEntity | null> {
    const result = await this.pool.query<{
      id: number;
      category_id: number;
      name_en: string;
      name_vi: string;
      description_en: string;
      description_vi: string;
      variants_json: VariantJsonRow[] | null;
    }>(
      `SELECT
          P.ID,
          P.CATEGORY_ID,
          P.NAME_EN,
          P.NAME_VI,
          P.DESCRIPTION_EN,
          P.DESCRIPTION_VI,
          COALESCE(VARIANTS.VARIANTS_JSON, '[]'::json) AS VARIANTS_JSON
        FROM PRODUCTS P
        LEFT JOIN LATERAL (
          SELECT JSON_AGG(
            JSON_BUILD_OBJECT(
              'id', V.ID,
              'plan_id', V.PLAN_ID,
              'plan_name_en', PP.NAME_EN,
              'plan_name_vi', PP.NAME_VI,
              'name_en', V.NAME_EN,
              'name_vi', V.NAME_VI,
              'fulfillment_type', V.FULFILLMENT_TYPE,
              'is_active', V.IS_ACTIVE,
              'payment_methods', V.PAYMENT_METHODS,
              'amount_vnd', ROUND(V.AMOUNT_VND, 0),
              'amount_usdt', ROUND(V.AMOUNT_USDT, 2),
              'stock_count', COALESCE(STOCK.STOCK_COUNT, 0)
            ) ORDER BY V.SORT_ORDER ASC, V.ID ASC
          ) AS VARIANTS_JSON
          FROM PRODUCT_VARIANTS V
          LEFT JOIN PRODUCT_PLANS PP ON PP.ID = V.PLAN_ID
          LEFT JOIN (
            SELECT S.VARIANT_ID, COUNT(S.ID)::INT AS STOCK_COUNT
            FROM STOCK_ITEMS S
            WHERE S.STATUS = 'AVAILABLE'
            GROUP BY S.VARIANT_ID
          ) STOCK ON STOCK.VARIANT_ID = V.ID
          WHERE V.PRODUCT_ID = P.ID AND V.IS_ACTIVE = TRUE
        ) VARIANTS ON TRUE
        WHERE P.ID = $1
        LIMIT 1`,
      [productId],
    );

    const row = result.rows[0];
    if (!row) return null;

    const variantsJson = Array.isArray(row.variants_json) ? row.variants_json : [];
    const variants: TelegramProductVariantEntity[] = variantsJson.map((v) => ({
      id: Number(v.id),
      planId: v.plan_id == null ? null : Number(v.plan_id),
      planNameEn: v.plan_name_en ? String(v.plan_name_en) : null,
      planNameVi: v.plan_name_vi ? String(v.plan_name_vi) : null,
      nameEn: String(v.name_en),
      nameVi: String(v.name_vi),
      fulfillmentType: String(v.fulfillment_type),
      isActive: Boolean(v.is_active),
      paymentMethods: parsePgEnumArray(v.payment_methods),
      amountVnd: Number(v.amount_vnd),
      amountUsdt: Number(v.amount_usdt),
      stockCount: Number(v.stock_count ?? 0),
    }));

    return {
      id: Number(row.id),
      categoryId: Number(row.category_id),
      nameEn: String(row.name_en),
      nameVi: String(row.name_vi),
      descriptionEn: String(row.description_en),
      descriptionVi: String(row.description_vi),
      variants,
    };
  }
}

interface VariantJsonRow {
  id: number;
  plan_id: number | null;
  plan_name_en: string | null;
  plan_name_vi: string | null;
  name_en: string;
  name_vi: string;
  fulfillment_type: string;
  is_active: boolean;
  payment_methods: unknown;
  amount_vnd: number;
  amount_usdt: number;
  stock_count: number;
}
