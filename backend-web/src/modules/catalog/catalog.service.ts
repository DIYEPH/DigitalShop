import { Injectable, NotFoundException } from '@nestjs/common';
import { Pool } from 'pg';
import { PaginationMeta } from '../../common/dto/api-response.dto';
import { getPgPool } from '../../common/database/pg-pool';
import { ListProductsQueryDto } from './dto/catalog-query.dto';
import {
  CategoryResponse,
  ProductPlanResponse,
  ProductResponse,
  ProductVariantResponse,
  StorefrontLanguage,
  StorefrontPaymentMethod,
  VolumeTierResponse,
} from './types/catalog.types';
import {
  localizedText,
  parseDbPaymentMethods,
  toIsoString,
  toNullableNumber,
  toNumber,
} from './utils/catalog-mapper';

type CategoryRow = {
  id: number;
  slug: string;
  name_en: string;
  name_vi: string;
  image_url: string | null;
  parent_id: number | null;
  parent_slug: string | null;
  parent_name_en: string | null;
  parent_name_vi: string | null;
  products_count: string;
};

type ProductRow = {
  id: number;
  slug: string;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  image_url: string | null;
  category_id: number;
  category_slug: string;
  category_name_en: string;
  category_name_vi: string;
  price_usdt: string | null;
  payment_methods: unknown;
  available_stock_count: string;
  has_preorder: boolean;
  created_at: Date;
  updated_at: Date;
  total_count?: string;
};

type ProductDetailRow = ProductRow & {
  plans_json: unknown;
  variants_json: unknown;
};

type PlanJsonRow = {
  id: number;
  slug: string;
  name_en: string;
  name_vi: string;
  sort_order: number;
};

type VariantJsonRow = {
  id: number;
  name_en: string;
  name_vi: string;
  is_active: boolean;
  plan_id: number | null;
  fulfillment_type: 'IN_STOCK' | 'PREORDER';
  preorder_limit: number | null;
  preorder_delivery_hours: number | null;
  available_stock_count: number | string | null;
  preorder_sold_count: number | string | null;
  warranty_type: string;
  warranty_value: number | null;
  warranty_unit: string | null;
  amount_usdt: number | string;
  payment_methods: unknown;
  volume_tiers: VolumeTierResponse[] | null;
};

@Injectable()
export class CatalogService {
  private get pool(): Pool {
    return getPgPool();
  }

  async listCategories(language: StorefrontLanguage, flat = true): Promise<CategoryResponse[]> {
    const result = await this.pool.query<CategoryRow>(
      `SELECT
          c.id,
          c.slug,
          c.name_en,
          c.name_vi,
          c.image_url,
          c.parent_id,
          p.slug AS parent_slug,
          p.name_en AS parent_name_en,
          p.name_vi AS parent_name_vi,
          (COUNT(DISTINCT prod.id) FILTER (WHERE v.id IS NOT NULL))::text AS products_count
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id AND p.is_active = TRUE
        LEFT JOIN products prod ON prod.category_id = c.id
        LEFT JOIN product_variants v ON v.product_id = prod.id AND v.is_active = TRUE
        WHERE c.is_active = TRUE
        GROUP BY c.id, p.id
        ORDER BY c.sort_order ASC, c.id ASC`,
    );

    const categories = result.rows.map((row) => this.mapCategory(row, language));
    if (flat) return categories;

    return this.toCategoryTree(categories);
  }

  async getCategoryBySlug(slug: string, language: StorefrontLanguage): Promise<CategoryResponse> {
    const result = await this.pool.query<CategoryRow>(
      `SELECT
          c.id,
          c.slug,
          c.name_en,
          c.name_vi,
          c.image_url,
          c.parent_id,
          p.slug AS parent_slug,
          p.name_en AS parent_name_en,
          p.name_vi AS parent_name_vi,
          (COUNT(DISTINCT prod.id) FILTER (WHERE v.id IS NOT NULL))::text AS products_count
        FROM categories c
        LEFT JOIN categories p ON p.id = c.parent_id AND p.is_active = TRUE
        LEFT JOIN products prod ON prod.category_id = c.id
        LEFT JOIN product_variants v ON v.product_id = prod.id AND v.is_active = TRUE
        WHERE c.slug = $1 AND c.is_active = TRUE
        GROUP BY c.id, p.id
        LIMIT 1`,
      [slug],
    );

    const row = result.rows[0];
    if (!row) throw new NotFoundException('Category not found');
    return this.mapCategory(row, language);
  }

  async listProducts(
    query: ListProductsQueryDto,
    language: StorefrontLanguage,
  ): Promise<{ data: ProductResponse[]; pagination: PaginationMeta }> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.min(50, Math.max(1, query.limit ?? 5));
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const filters = ['c.is_active = TRUE'];

    if (query.category_slug) {
      params.push(query.category_slug);
      filters.push(`c.slug = $${params.length}`);
    } else if (query.category_id) {
      params.push(Number(query.category_id));
      filters.push(`c.id = $${params.length}`);
    }

    params.push(limit, offset);
    const limitIndex = params.length - 1;
    const offsetIndex = params.length;

    const result = await this.pool.query<ProductRow>(
      `${this.productBaseSelect()}
       WHERE ${filters.join(' AND ')}
         AND stats.active_variant_count > 0
       ORDER BY p.id DESC
       LIMIT $${limitIndex} OFFSET $${offsetIndex}`,
      params,
    );

    const total = toNumber(result.rows[0]?.total_count, 0);

    return {
      data: result.rows.map((row) => this.mapProduct(row, language, [], [])),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  async getProductBySlug(slug: string, language: StorefrontLanguage): Promise<ProductResponse> {
    const result = await this.pool.query<ProductDetailRow>(
      `${this.productBaseSelect(true)}
       WHERE p.slug = $1
         AND c.is_active = TRUE
         AND stats.active_variant_count > 0
       LIMIT 1`,
      [slug],
    );

    const row = result.rows[0];
    if (!row) throw new NotFoundException('Product not found');

    const plans = this.parseJsonArray<PlanJsonRow>(row.plans_json).map((plan) => ({
      id: toNumber(plan.id),
      slug: String(plan.slug),
      name: localizedText(plan as Record<string, unknown>, 'name', language),
      sort_order: toNumber(plan.sort_order),
    }));
    const variants = this.parseJsonArray<VariantJsonRow>(row.variants_json).map((variant) =>
      this.mapVariant(variant, language),
    );

    return this.mapProduct(row, language, plans, variants);
  }

  private productBaseSelect(includeDetails = false): string {
    const detailSelect = includeDetails
      ? `,
        COALESCE(plans.plans_json, '[]'::json) AS plans_json,
        COALESCE(variants.variants_json, '[]'::json) AS variants_json`
      : '';
    const detailJoins = includeDetails
      ? `
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', pp.id,
            'slug', pp.slug,
            'name_en', pp.name_en,
            'name_vi', pp.name_vi,
            'sort_order', pp.sort_order
          ) ORDER BY pp.sort_order ASC, pp.id ASC
        ) AS plans_json
        FROM product_plans pp
        WHERE pp.product_id = p.id AND pp.is_active = TRUE
      ) plans ON TRUE
      LEFT JOIN LATERAL (
        SELECT json_agg(
          json_build_object(
            'id', v.id,
            'name_en', v.name_en,
            'name_vi', v.name_vi,
            'is_active', v.is_active,
            'plan_id', v.plan_id,
            'fulfillment_type', v.fulfillment_type,
            'preorder_limit', v.preorder_limit,
            'preorder_delivery_hours', v.preorder_delivery_hours,
            'available_stock_count', COALESCE(stock.available_stock_count, 0),
            'preorder_sold_count', COALESCE(preorder.sold_count, 0),
            'warranty_type', v.warranty_type,
            'warranty_value', v.warranty_value,
            'warranty_unit', v.warranty_unit,
            'amount_usdt', ROUND(v.amount_usdt, 2),
            'payment_methods', v.payment_methods,
            'volume_tiers', COALESCE(tiers.volume_tiers, '[]'::json)
          ) ORDER BY v.sort_order ASC, v.id ASC
        ) AS variants_json
        FROM product_variants v
        LEFT JOIN LATERAL (
          SELECT COUNT(s.id)::int AS available_stock_count
          FROM stock_items s
          WHERE s.variant_id = v.id AND s.status = 'AVAILABLE'
        ) stock ON TRUE
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(oi.quantity), 0)::int AS sold_count
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE oi.variant_id = v.id
            AND o.status IN ('PENDING', 'PAID', 'DELIVERED')
        ) preorder ON TRUE
        LEFT JOIN LATERAL (
          SELECT json_agg(
            json_build_object(
              'min_quantity', vt.min_quantity,
              'discount_bps', vt.discount_bps
            ) ORDER BY vt.min_quantity ASC
          ) AS volume_tiers
          FROM variant_volume_tiers vt
          WHERE vt.variant_id = v.id AND vt.is_active = TRUE
        ) tiers ON TRUE
        WHERE v.product_id = p.id AND v.is_active = TRUE
      ) variants ON TRUE`
      : '';

    return `SELECT
        p.id,
        p.slug,
        p.name_en,
        p.name_vi,
        p.description_en,
        p.description_vi,
        p.image_url,
        p.category_id,
        p.created_at,
        p.updated_at,
        c.slug AS category_slug,
        c.name_en AS category_name_en,
        c.name_vi AS category_name_vi,
        stats.price_usdt,
        stats.payment_methods,
        stats.available_stock_count,
        stats.has_preorder${detailSelect},
        COUNT(*) OVER()::text AS total_count
      FROM products p
      INNER JOIN categories c ON c.id = p.category_id
      INNER JOIN LATERAL (
        SELECT
          COUNT(v.id)::int AS active_variant_count,
          ROUND(MIN(v.amount_usdt), 2)::text AS price_usdt,
          COALESCE(
            (
              SELECT array_agg(DISTINCT pm.method)
              FROM product_variants pv
              CROSS JOIN LATERAL unnest(pv.payment_methods) AS pm(method)
              WHERE pv.product_id = p.id AND pv.is_active = TRUE
            ),
            ARRAY[]::product_payment_method_enum[]
          ) AS payment_methods,
          COALESCE(
            (
              SELECT COUNT(s.id)::int
              FROM product_variants sv
              INNER JOIN stock_items s ON s.variant_id = sv.id AND s.status = 'AVAILABLE'
              WHERE sv.product_id = p.id AND sv.is_active = TRUE
            ),
            0
          )::text AS available_stock_count,
          BOOL_OR(
            v.fulfillment_type = 'PREORDER'
            AND (v.preorder_limit IS NULL OR COALESCE(preorder.sold_count, 0) < v.preorder_limit)
          ) AS has_preorder
        FROM product_variants v
        LEFT JOIN LATERAL (
          SELECT COALESCE(SUM(oi.quantity), 0)::int AS sold_count
          FROM order_items oi
          INNER JOIN orders o ON o.id = oi.order_id
          WHERE oi.variant_id = v.id
            AND o.status IN ('PENDING', 'PAID', 'DELIVERED')
        ) preorder ON TRUE
        WHERE v.product_id = p.id AND v.is_active = TRUE
      ) stats ON TRUE${detailJoins}`;
  }

  private mapCategory(row: CategoryRow, language: StorefrontLanguage): CategoryResponse {
    return {
      id: toNumber(row.id),
      slug: row.slug,
      name: localizedText(row as unknown as Record<string, unknown>, 'name', language),
      image_url: row.image_url,
      products_count: toNumber(row.products_count),
      parent_id: row.parent_id,
      parent: row.parent_id
        ? {
            id: row.parent_id,
            slug: String(row.parent_slug),
            name: language === 'vi' ? String(row.parent_name_vi) : String(row.parent_name_en),
          }
        : null,
    };
  }

  private toCategoryTree(categories: CategoryResponse[]): CategoryResponse[] {
    const byId = new Map(categories.map((category) => [category.id, { ...category, children: [] as CategoryResponse[] }]));
    const roots: CategoryResponse[] = [];

    for (const category of byId.values()) {
      if (category.parent_id && byId.has(category.parent_id)) {
        byId.get(category.parent_id)?.children?.push(category);
      } else {
        roots.push(category);
      }
    }

    return roots;
  }

  private mapProduct(
    row: ProductRow,
    language: StorefrontLanguage,
    plans: ProductPlanResponse[],
    variants: ProductVariantResponse[],
  ): ProductResponse {
    const price = toNumber(row.price_usdt);
    const paymentMethods = parseDbPaymentMethods(row.payment_methods);
    const availableStock = toNumber(row.available_stock_count);

    return {
      id: toNumber(row.id),
      slug: row.slug,
      name: localizedText(row as unknown as Record<string, unknown>, 'name', language),
      description: localizedText(row as unknown as Record<string, unknown>, 'description', language),
      price,
      currency: 'USDT',
      prices: { USDT: price },
      payment_methods: paymentMethods,
      sold_count: 0,
      badges: [],
      in_stock: availableStock > 0 || Boolean(row.has_preorder),
      image_url: row.image_url,
      category_id: toNumber(row.category_id),
      category: {
        id: toNumber(row.category_id),
        slug: row.category_slug,
        name: language === 'vi' ? row.category_name_vi : row.category_name_en,
        image_url: null,
        parent_id: null,
      },
      plans,
      variants,
      created_at: toIsoString(row.created_at),
      updated_at: toIsoString(row.updated_at),
    };
  }

  private mapVariant(variant: VariantJsonRow, language: StorefrontLanguage): ProductVariantResponse {
    const price = toNumber(variant.amount_usdt);
    const stockCount = toNumber(variant.available_stock_count);
    const preorderLimit = toNullableNumber(variant.preorder_limit);
    const preorderSold = toNumber(variant.preorder_sold_count);
    const preorderRemaining =
      variant.fulfillment_type === 'PREORDER' && preorderLimit != null
        ? Math.max(0, preorderLimit - preorderSold)
        : null;

    return {
      id: toNumber(variant.id),
      name: localizedText(variant as unknown as Record<string, unknown>, 'name', language),
      is_active: Boolean(variant.is_active),
      plan_id: toNullableNumber(variant.plan_id),
      fulfillment_type: variant.fulfillment_type,
      preorder_limit: preorderLimit,
      preorder_delivery_hours: toNullableNumber(variant.preorder_delivery_hours),
      preorder_remaining: preorderRemaining,
      available_stock_count: stockCount,
      warranty_type: String(variant.warranty_type),
      warranty_value: toNullableNumber(variant.warranty_value),
      warranty_unit: variant.warranty_unit ? String(variant.warranty_unit) : null,
      prices: { USDT: price },
      promo_ends_at: null,
      promo_percent_bps: null,
      volume_tiers: Array.isArray(variant.volume_tiers) ? variant.volume_tiers : [],
    };
  }

  private parseJsonArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) return value as T[];
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value) as unknown;
        return Array.isArray(parsed) ? (parsed as T[]) : [];
      } catch {
        return [];
      }
    }
    return [];
  }
}
