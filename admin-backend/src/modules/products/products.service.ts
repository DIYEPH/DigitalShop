import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPgPool } from '../../common/database/pg-pool';
import { ErrorCodes } from '../../common/enums/error-codes.enum';
import { FulfillmentType, PaymentMethod, WarrantyType } from '../../common/enums';
import { createPaginationMeta, resolvePagination } from '../../common/utils/pagination.util';
import { CreatePlanDto } from './dto/create-plan.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { CreateVariantDto } from './dto/create-variant.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { UpdatePlanDto } from './dto/update-plan.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateVolumeTiersDto, VolumeTierDto } from './dto/volume-tier.dto';
import {
  dbPaymentMethodsToUi,
  parsePgEnumArray,
  uiPaymentMethodsToDb,
} from './utils/payment-methods.util';
import { slugify } from './utils/slug.util';
import {
  resolvePricesForCreate,
  resolvePricesForUpdate,
  variantPricesFromRow,
} from './utils/variant-prices.util';
import { validateVolumeTiers } from './utils/volume-tier.validator';

type ProductRow = {
  id: number;
  name_en: string;
  name_vi: string;
  description_en: string;
  description_vi: string;
  slug: string;
  image_url: string | null;
  category_id: number;
  created_at: Date;
  updated_at: Date;
};

type PlanRow = {
  id: number;
  product_id: number;
  name_en: string;
  name_vi: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
};

type VariantRow = {
  id: number;
  product_id: number;
  plan_id: number | null;
  name_en: string;
  name_vi: string;
  fulfillment_type: string;
  preorder_limit: number | null;
  preorder_delivery_hours: number | null;
  warranty_type: string;
  warranty_value: number | null;
  warranty_unit: string | null;
  is_active: boolean;
  sort_order: number;
  payment_methods: unknown;
  amount_usdt: string;
  amount_vnd: string;
  plan_slug?: string | null;
  plan_name_en?: string | null;
  stock_item_count?: number | string;
};

type VolumeTierRow = {
  id: number;
  variant_id: number;
  min_quantity: number;
  discount_bps: number;
  is_active: boolean;
};

@Injectable()
export class ProductsService {
  private get pool() {
    return getPgPool();
  }

  async findAll(query: ProductQueryDto) {
    const { page, limit, offset } = resolvePagination(query);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (query.category_id != null) {
      params.push(query.category_id);
      conditions.push(`p.category_id = $${params.length}`);
    }
    if (query.search?.trim()) {
      params.push(`%${query.search.trim()}%`);
      conditions.push(
        `(p.name_en ILIKE $${params.length} OR p.name_vi ILIKE $${params.length})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM products p ${where}`,
      params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    params.push(limit, offset);
    const limitIdx = params.length - 1;
    const offsetIdx = params.length;

    const result = await this.pool.query<
      ProductRow & {
        category_name_en: string;
        category_slug: string;
        min_price_usdt: string | null;
        min_price_vnd: string | null;
      }
    >(
      `SELECT
          p.id, p.name_en, p.name_vi, p.description_en, p.description_vi,
          p.slug, p.image_url, p.category_id, p.created_at, p.updated_at,
          c.name_en AS category_name_en, c.slug AS category_slug,
          prices.min_price_usdt,
          prices.min_price_vnd
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        LEFT JOIN (
          SELECT
            v.product_id,
            MIN(v.amount_usdt)::text AS min_price_usdt,
            MIN(NULLIF(v.amount_vnd, 0))::text AS min_price_vnd
          FROM product_variants v
          WHERE v.is_active = TRUE
          GROUP BY v.product_id
        ) prices ON prices.product_id = p.id
        ${where}
        ORDER BY p.id DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      params,
    );

    const items = result.rows.map((row) => this.toListItem(row));
    const meta = createPaginationMeta(page, limit, total);

    return {
      success: true as const,
      data: items,
      pagination: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.pages,
      },
    };
  }

  async findOne(id: number) {
    const product = await this.getProductRow(id);
    if (!product) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_NOT_FOUND,
        message: `Product with ID ${id} not found`,
      });
    }

    const [plans, variants] = await Promise.all([
      this.listPlans(id),
      this.listVariants(id),
    ]);

    return this.toDetail(product, plans, variants);
  }

  async create(dto: CreateProductDto) {
    await this.assertCategoryExists(dto.category_id);

    const { nameEn, nameVi, descriptionEn, descriptionVi } = this.resolveProductI18n(dto);
    if (!nameEn.trim() || !nameVi.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'name_en and name_vi are required',
      });
    }
    if (!descriptionEn.trim() || !descriptionVi.trim()) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: 'description_en and description_vi are required',
      });
    }
    let slug = dto.slug ?? slugify(nameEn);

    const unique = await this.validateSlugUnique(slug);
    if (!unique) {
      slug = `${slug}-${Date.now().toString(36)}`;
    }

    const result = await this.pool.query<ProductRow>(
      `INSERT INTO products (name_en, name_vi, description_en, description_vi, slug, image_url, category_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name_en, name_vi, description_en, description_vi, slug, image_url, category_id, created_at, updated_at`,
      [nameEn, nameVi, descriptionEn, descriptionVi, slug, dto.image_url ?? null, dto.category_id],
    );

    const product = result.rows[0];

    const withCategory = await this.pool.query<
      ProductRow & { category_name_en: string; category_slug: string; min_price_usdt: null }
    >(
      `SELECT
          p.id, p.name_en, p.name_vi, p.description_en, p.description_vi,
          p.slug, p.image_url, p.category_id, p.created_at, p.updated_at,
          c.name_en AS category_name_en, c.slug AS category_slug,
          NULL::text AS min_price_usdt
        FROM products p
        INNER JOIN categories c ON c.id = p.category_id
        WHERE p.id = $1`,
      [product.id],
    );

    return this.toListItem(withCategory.rows[0]);
  }

  async update(id: number, dto: UpdateProductDto) {
    const existing = await this.getProductRow(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_NOT_FOUND,
        message: `Product with ID ${id} not found`,
      });
    }

    if (dto.category_id != null) {
      await this.assertCategoryExists(dto.category_id);
    }

    if (dto.slug) {
      const unique = await this.validateSlugUnique(dto.slug, id);
      if (!unique) {
        throw new ConflictException({
          code: ErrorCodes.PROD_SLUG_EXISTS,
          message: `Product slug '${dto.slug}' already exists`,
        });
      }
    }

    const { nameEn, nameVi, descriptionEn, descriptionVi } = this.resolveProductI18n(dto, existing);
    const clearImage = dto.image_url === null;
    const imageUrlValue =
      dto.image_url === undefined || dto.image_url === null ? null : dto.image_url;

    await this.pool.query(
      `UPDATE products SET
          name_en = $2,
          name_vi = $3,
          description_en = $4,
          description_vi = $5,
          slug = COALESCE($6, slug),
          image_url = CASE WHEN $7 THEN NULL WHEN $8 IS NOT NULL THEN $8 ELSE image_url END,
          category_id = COALESCE($9, category_id),
          updated_at = NOW()
        WHERE id = $1`,
      [
        id,
        nameEn,
        nameVi,
        descriptionEn,
        descriptionVi,
        dto.slug ?? null,
        clearImage,
        imageUrlValue,
        dto.category_id ?? null,
      ],
    );

    return this.findOne(id);
  }

  async remove(id: number) {
    const existing = await this.getProductRow(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_NOT_FOUND,
        message: `Product with ID ${id} not found`,
      });
    }

    const orders = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM order_items oi
       INNER JOIN product_variants v ON v.id = oi.variant_id
       WHERE v.product_id = $1`,
      [id],
    );
    if (Number(orders.rows[0]?.count ?? 0) > 0) {
      throw new ConflictException({
        code: ErrorCodes.PROD_CANNOT_DELETE_WITH_ORDERS,
        message: 'Cannot delete product with existing orders',
      });
    }

    await this.pool.query(`UPDATE product_variants SET is_active = FALSE, updated_at = NOW() WHERE product_id = $1`, [
      id,
    ]);
    await this.pool.query(`DELETE FROM products WHERE id = $1`, [id]);
  }

  async validateSlugUnique(slug: string, excludeId?: number): Promise<boolean> {
    const params: unknown[] = [slug];
    let sql = `SELECT 1 FROM products WHERE slug = $1`;
    if (excludeId != null) {
      params.push(excludeId);
      sql += ` AND id <> $2`;
    }
    sql += ' LIMIT 1';
    const res = await this.pool.query(sql, params);
    return res.rowCount === 0;
  }

  async createPlan(productId: number, dto: CreatePlanDto) {
    await this.assertProductExists(productId);

    const { nameEn, nameVi } = this.resolvePlanNames(dto);

    try {
      const res = await this.pool.query<PlanRow>(
        `INSERT INTO product_plans (product_id, name_en, name_vi, slug, sort_order, is_active)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, product_id, name_en, name_vi, slug, sort_order, is_active`,
        [productId, nameEn, nameVi, dto.slug, dto.sort_order ?? 0, dto.is_active ?? true],
      );
      return this.toPlan(res.rows[0]);
    } catch (err: unknown) {
      if (this.isUniqueViolation(err)) {
        throw new ConflictException({
          code: ErrorCodes.PROD_SLUG_EXISTS,
          message: `Plan slug '${dto.slug}' already exists for this product`,
        });
      }
      throw err;
    }
  }

  async updatePlan(productId: number, planId: number, dto: UpdatePlanDto) {
    await this.assertPlanBelongsToProduct(productId, planId);

    const existing = await this.pool.query<PlanRow>(
      `SELECT id, product_id, name_en, name_vi, slug, sort_order, is_active FROM product_plans WHERE id = $1 AND product_id = $2`,
      [planId, productId],
    );
    const planRow = existing.rows[0];
    if (!planRow) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_PLAN_NOT_FOUND,
        message: 'Plan not found',
      });
    }

    const { nameEn, nameVi } = this.resolvePlanNames(dto, planRow);

    const res = await this.pool.query<PlanRow>(
      `UPDATE product_plans SET
          name_en = COALESCE($3, name_en),
          name_vi = COALESCE($4, name_vi),
          sort_order = COALESCE($5, sort_order),
          is_active = COALESCE($6, is_active),
          updated_at = NOW()
        WHERE id = $1 AND product_id = $2
        RETURNING id, product_id, name_en, name_vi, slug, sort_order, is_active`,
      [
        planId,
        productId,
        nameEn ?? null,
        nameVi ?? null,
        dto.sort_order ?? null,
        dto.is_active ?? null,
      ],
    );

    if (!res.rows[0]) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_PLAN_NOT_FOUND,
        message: 'Plan not found',
      });
    }

    return this.toPlan(res.rows[0]);
  }

  async removePlan(productId: number, planId: number) {
    await this.assertPlanBelongsToProduct(productId, planId);
    await this.pool.query(
      `UPDATE product_variants SET plan_id = NULL, updated_at = NOW() WHERE plan_id = $1`,
      [planId],
    );
    await this.pool.query(`DELETE FROM product_plans WHERE id = $1 AND product_id = $2`, [
      planId,
      productId,
    ]);
  }

  async createVariant(productId: number, dto: CreateVariantDto) {
    await this.assertProductExists(productId);

    if (dto.plan_id != null) {
      await this.assertPlanBelongsToProduct(productId, dto.plan_id);
    }

    const { amountUsdt, amountVnd } = resolvePricesForCreate(dto.prices);
    const paymentMethods = this.resolveVariantPaymentMethods(dto.payment_methods);
    const { nameEn, nameVi } = this.resolveVariantNames(dto);

    const res = await this.pool.query<VariantRow>(
      `INSERT INTO product_variants (
          product_id, plan_id, name_en, name_vi, fulfillment_type,
          preorder_limit, preorder_delivery_hours,
          warranty_type, warranty_value, warranty_unit,
          is_active, sort_order, payment_methods, amount_usdt, amount_vnd
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::product_payment_method_enum[], $14, $15)
        RETURNING id, product_id, plan_id, name_en, name_vi, fulfillment_type,
          preorder_limit, preorder_delivery_hours, warranty_type, warranty_value, warranty_unit,
          is_active, sort_order, payment_methods, amount_usdt, amount_vnd`,
      [
        productId,
        dto.plan_id ?? null,
        nameEn,
        nameVi,
        dto.fulfillment_type ?? FulfillmentType.PREORDER,
        dto.preorder_limit ?? null,
        dto.preorder_delivery_hours ?? null,
        dto.warranty_type ?? WarrantyType.NONE,
        dto.warranty_value ?? null,
        dto.warranty_unit ?? null,
        dto.is_active ?? true,
        dto.sort_order ?? 0,
        paymentMethods,
        amountUsdt,
        amountVnd,
      ],
    );

    const variant = res.rows[0];
    const tiers = await this.getVolumeTiers(variant.id);
    return this.toVariant(variant, tiers);
  }

  async updateVariant(variantId: number, dto: UpdateVariantDto) {
    const existing = await this.getVariantRow(variantId);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_VARIANT_NOT_FOUND,
        message: 'Variant not found',
      });
    }

    if (dto.plan_id !== undefined && dto.plan_id != null) {
      await this.assertPlanBelongsToProduct(existing.product_id, dto.plan_id);
    }

    if (dto.fulfillment_type === FulfillmentType.PREORDER) {
      const stockCount = await this.countStockItems(variantId);
      if (stockCount > 0) {
        throw new BadRequestException({
          code: ErrorCodes.PROD_VARIANT_HAS_STOCK,
          message:
            'Cannot change fulfillment to PREORDER while variant has stock items. Remove stock first.',
        });
      }
    }

    const prices = dto.prices ? resolvePricesForUpdate(dto.prices) : null;
    const paymentMethods =
      dto.payment_methods != null
        ? this.resolveVariantPaymentMethods(dto.payment_methods)
        : null;

    const { nameEn, nameVi } = this.resolveVariantNames(dto, existing);

    const clearPlan = dto.plan_id === null;
    const planIdValue = dto.plan_id === undefined || dto.plan_id === null ? null : dto.plan_id;

    await this.pool.query(
      `UPDATE product_variants SET
          plan_id = CASE WHEN $2 THEN NULL WHEN $3 IS NOT NULL THEN $3 ELSE plan_id END,
          name_en = COALESCE($4, name_en),
          name_vi = COALESCE($5, name_vi),
          fulfillment_type = COALESCE($6, fulfillment_type),
          preorder_limit = COALESCE($7, preorder_limit),
          preorder_delivery_hours = COALESCE($8, preorder_delivery_hours),
          warranty_type = COALESCE($9, warranty_type),
          warranty_value = COALESCE($10, warranty_value),
          warranty_unit = COALESCE($11, warranty_unit),
          is_active = COALESCE($12, is_active),
          sort_order = COALESCE($13, sort_order),
          payment_methods = COALESCE($14::product_payment_method_enum[], payment_methods),
          amount_usdt = COALESCE($15, amount_usdt),
          amount_vnd = COALESCE($16, amount_vnd),
          updated_at = NOW()
        WHERE id = $1`,
      [
        variantId,
        clearPlan,
        planIdValue,
        nameEn ?? null,
        nameVi ?? null,
        dto.fulfillment_type ?? null,
        dto.preorder_limit !== undefined ? dto.preorder_limit : null,
        dto.preorder_delivery_hours !== undefined ? dto.preorder_delivery_hours : null,
        dto.warranty_type ?? null,
        dto.warranty_value !== undefined ? dto.warranty_value : null,
        dto.warranty_unit !== undefined ? dto.warranty_unit : null,
        dto.is_active ?? null,
        dto.sort_order ?? null,
        paymentMethods,
        prices?.amountUsdt ?? null,
        prices?.amountVnd ?? null,
      ],
    );

    const variant = await this.getVariantRow(variantId);
    if (!variant) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_VARIANT_NOT_FOUND,
        message: 'Variant not found',
      });
    }
    const tiers = await this.getVolumeTiers(variant.id);
    return this.toVariant(variant, tiers);
  }

  async removeVariant(variantId: number) {
    const existing = await this.getVariantRow(variantId);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_VARIANT_NOT_FOUND,
        message: 'Variant not found',
      });
    }

    const orders = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM order_items WHERE variant_id = $1`,
      [variantId],
    );
    if (Number(orders.rows[0]?.count ?? 0) > 0) {
      throw new ConflictException({
        code: ErrorCodes.PROD_CANNOT_DELETE_WITH_ORDERS,
        message: 'Cannot delete variant with existing orders',
      });
    }

    await this.pool.query(
      `UPDATE product_variants SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [variantId],
    );
  }

  async getVolumeTiers(variantId: number) {
    await this.assertVariantExists(variantId);
    const res = await this.pool.query<VolumeTierRow>(
      `SELECT id, variant_id, min_quantity, discount_bps, is_active
       FROM variant_volume_tiers
       WHERE variant_id = $1
       ORDER BY min_quantity ASC`,
      [variantId],
    );
    return res.rows.map((t) => this.toVolumeTier(t));
  }

  async replaceVolumeTiers(variantId: number, dto: UpdateVolumeTiersDto) {
    await this.assertVariantExists(variantId);

    const validation = validateVolumeTiers(dto.tiers);
    if (!validation.isValid) {
      throw new BadRequestException({
        code: ErrorCodes.PROD_INVALID_VOLUME_TIERS,
        message: validation.errors.join('; '),
        details: { errors: validation.errors },
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`DELETE FROM variant_volume_tiers WHERE variant_id = $1`, [variantId]);

      for (const tier of dto.tiers) {
        await client.query(
          `INSERT INTO variant_volume_tiers (variant_id, min_quantity, discount_bps, is_active)
           VALUES ($1, $2, $3, $4)`,
          [variantId, tier.min_quantity, tier.discount_bps, tier.is_active],
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    return this.getVolumeTiers(variantId);
  }

  validateVolumeTiersPayload(tiers: VolumeTierDto[]) {
    return validateVolumeTiers(tiers);
  }

  private async getProductRow(id: number): Promise<ProductRow | null> {
    const res = await this.pool.query<ProductRow>(
      `SELECT id, name_en, name_vi, description_en, description_vi, slug, image_url, category_id, created_at, updated_at
       FROM products WHERE id = $1`,
      [id],
    );
    return res.rows[0] ?? null;
  }

  private async listPlans(productId: number): Promise<PlanRow[]> {
    const res = await this.pool.query<PlanRow>(
      `SELECT id, product_id, name_en, name_vi, slug, sort_order, is_active
       FROM product_plans WHERE product_id = $1
       ORDER BY sort_order ASC, id ASC`,
      [productId],
    );
    return res.rows;
  }

  private async listVariants(productId: number): Promise<VariantRow[]> {
    const res = await this.pool.query<VariantRow>(
      `SELECT
          v.id, v.product_id, v.plan_id, v.name_en, v.name_vi, v.fulfillment_type,
          v.preorder_limit, v.preorder_delivery_hours, v.warranty_type, v.warranty_value, v.warranty_unit,
          v.is_active, v.sort_order, v.payment_methods, v.amount_usdt, v.amount_vnd,
          pp.slug AS plan_slug, pp.name_en AS plan_name_en,
          (SELECT COUNT(*)::int FROM stock_items si WHERE si.variant_id = v.id) AS stock_item_count
        FROM product_variants v
        LEFT JOIN product_plans pp ON pp.id = v.plan_id
        WHERE v.product_id = $1
        ORDER BY v.sort_order ASC, v.id ASC`,
      [productId],
    );
    return res.rows;
  }

  private async getVariantRow(variantId: number): Promise<VariantRow | null> {
    const res = await this.pool.query<VariantRow>(
      `SELECT
          v.id, v.product_id, v.plan_id, v.name_en, v.name_vi, v.fulfillment_type,
          v.preorder_limit, v.preorder_delivery_hours, v.warranty_type, v.warranty_value, v.warranty_unit,
          v.is_active, v.sort_order, v.payment_methods, v.amount_usdt, v.amount_vnd,
          pp.slug AS plan_slug, pp.name_en AS plan_name_en,
          (SELECT COUNT(*)::int FROM stock_items si WHERE si.variant_id = v.id) AS stock_item_count
        FROM product_variants v
        LEFT JOIN product_plans pp ON pp.id = v.plan_id
        WHERE v.id = $1`,
      [variantId],
    );
    return res.rows[0] ?? null;
  }

  private async assertProductExists(productId: number) {
    const res = await this.pool.query(`SELECT 1 FROM products WHERE id = $1`, [productId]);
    if (res.rowCount === 0) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_NOT_FOUND,
        message: `Product with ID ${productId} not found`,
      });
    }
  }

  private async assertCategoryExists(categoryId: number) {
    const res = await this.pool.query(
      `SELECT 1 FROM categories WHERE id = $1 AND is_active = TRUE`,
      [categoryId],
    );
    if (res.rowCount === 0) {
      throw new BadRequestException({
        code: ErrorCodes.PROD_INVALID_CATEGORY,
        message: 'Invalid or inactive category',
      });
    }
  }

  private async assertPlanBelongsToProduct(productId: number, planId: number) {
    const res = await this.pool.query(
      `SELECT 1 FROM product_plans WHERE id = $1 AND product_id = $2`,
      [planId, productId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_PLAN_NOT_FOUND,
        message: 'Plan not found',
      });
    }
  }

  private async countStockItems(variantId: number): Promise<number> {
    const res = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM stock_items WHERE variant_id = $1`,
      [variantId],
    );
    return Number(res.rows[0]?.count ?? 0);
  }

  private async assertVariantExists(variantId: number) {
    const res = await this.pool.query(`SELECT 1 FROM product_variants WHERE id = $1`, [variantId]);
    if (res.rowCount === 0) {
      throw new NotFoundException({
        code: ErrorCodes.PROD_VARIANT_NOT_FOUND,
        message: 'Variant not found',
      });
    }
  }

  private resolveVariantPaymentMethods(methods?: string[]): PaymentMethod[] {
    const mapped = methods?.length ? uiPaymentMethodsToDb(methods) : [];
    if (mapped.length === 0) {
      return [PaymentMethod.BINANCE, PaymentMethod.BALANCE, PaymentMethod.CRYPTO];
    }
    return mapped;
  }

  private async loadVolumeTiersByVariantIds(
    variantIds: number[],
  ): Promise<Map<number, ReturnType<typeof this.toVolumeTier>[]>> {
    const map = new Map<number, ReturnType<typeof this.toVolumeTier>[]>();
    if (variantIds.length === 0) return map;

    const res = await this.pool.query<VolumeTierRow>(
      `SELECT id, variant_id, min_quantity, discount_bps, is_active
       FROM variant_volume_tiers
       WHERE variant_id = ANY($1::int[])
       ORDER BY variant_id ASC, min_quantity ASC`,
      [variantIds],
    );

    for (const row of res.rows) {
      const list = map.get(row.variant_id) ?? [];
      list.push(this.toVolumeTier(row));
      map.set(row.variant_id, list);
    }
    return map;
  }

  private toListItem(
    row: ProductRow & {
      category_name_en?: string;
      category_slug?: string;
      min_price_usdt?: string | null;
      min_price_vnd?: string | null;
    },
  ) {
    const priceUsdt = row.min_price_usdt != null ? Number(row.min_price_usdt) : 0;
    const priceVnd = row.min_price_vnd != null ? Number(row.min_price_vnd) : 0;
    return {
      id: row.id,
      name_en: row.name_en,
      name_vi: row.name_vi,
      name: row.name_en,
      slug: row.slug,
      description_en: row.description_en,
      description_vi: row.description_vi,
      description: row.description_en,
      price_usdt: Math.round(priceUsdt * 100) / 100,
      price_vnd: Math.round(priceVnd),
      price: Math.round(priceUsdt * 100) / 100,
      currency: 'USDT',
      image_url: row.image_url,
      category:
        row.category_name_en != null
          ? {
              id: row.category_id,
              name: row.category_name_en,
              slug: row.category_slug ?? '',
            }
          : null,
    };
  }

  private async toDetail(
    product: ProductRow,
    plans: PlanRow[],
    variants: VariantRow[],
  ) {
    const tierMap = await this.loadVolumeTiersByVariantIds(variants.map((v) => v.id));

    return {
      id: product.id,
      name_en: product.name_en,
      name_vi: product.name_vi,
      name: product.name_en,
      slug: product.slug,
      description_en: product.description_en,
      description_vi: product.description_vi,
      description: product.description_en,
      image_url: product.image_url,
      category_id: product.category_id,
      plans: plans.map((p) => this.toPlan(p)),
      variants: variants.map((v) => this.toVariant(v, tierMap.get(v.id) ?? [])),
    };
  }

  private toPlan(row: PlanRow) {
    return {
      id: row.id,
      slug: row.slug,
      name_en: row.name_en,
      name_vi: row.name_vi,
      name: row.name_en,
      sort_order: row.sort_order,
      is_active: row.is_active,
    };
  }

  private toVariant(row: VariantRow, volumeTiers: ReturnType<typeof this.toVolumeTier>[]) {
    const methods = parsePgEnumArray(row.payment_methods);
    return {
      id: row.id,
      plan_id: row.plan_id,
      plan:
        row.plan_id != null
          ? {
              id: row.plan_id,
              slug: row.plan_slug ?? '',
              name: row.plan_name_en ?? '',
            }
          : null,
      name_en: row.name_en,
      name_vi: row.name_vi,
      name: row.name_en,
      sku: null as string | null,
      fulfillment_type: row.fulfillment_type,
      preorder_limit: row.preorder_limit,
      preorder_delivery_hours: row.preorder_delivery_hours,
      warranty_type: row.warranty_type,
      warranty_value: row.warranty_value,
      warranty_unit: row.warranty_unit,
      sort_order: row.sort_order,
      is_active: row.is_active,
      prices: variantPricesFromRow(row),
      volume_tiers: volumeTiers,
      payment_methods: dbPaymentMethodsToUi(methods),
      stock_item_count: Number(row.stock_item_count ?? 0),
    };
  }

  /** Mỗi locale một giá trị — không copy EN sang VI. `name`/`description` legacy chỉ map EN. */
  private resolveProductI18n(
    dto: {
      name?: string;
      name_en?: string;
      name_vi?: string;
      description?: string;
      description_en?: string;
      description_vi?: string;
    },
    existing?: ProductRow,
  ) {
    let nameEn = existing?.name_en ?? '';
    let nameVi = existing?.name_vi ?? '';
    let descriptionEn = existing?.description_en ?? '';
    let descriptionVi = existing?.description_vi ?? '';

    if (dto.name_en !== undefined) nameEn = dto.name_en;
    else if (dto.name !== undefined) nameEn = dto.name;

    if (dto.name_vi !== undefined) nameVi = dto.name_vi;

    if (dto.description_en !== undefined) descriptionEn = dto.description_en;
    else if (dto.description !== undefined) descriptionEn = dto.description;

    if (dto.description_vi !== undefined) descriptionVi = dto.description_vi;

    return { nameEn, nameVi, descriptionEn, descriptionVi };
  }

  private resolvePlanNames(
    dto: { name?: string; name_en?: string; name_vi?: string },
    existing?: Pick<PlanRow, 'name_en' | 'name_vi'>,
  ) {
    let nameEn = existing?.name_en ?? '';
    let nameVi = existing?.name_vi ?? '';

    if (dto.name_en !== undefined) nameEn = dto.name_en;
    else if (dto.name !== undefined) nameEn = dto.name;

    if (dto.name_vi !== undefined) nameVi = dto.name_vi;

    return { nameEn, nameVi };
  }

  private resolveVariantNames(
    dto: { name?: string; name_en?: string; name_vi?: string },
    existing?: Pick<VariantRow, 'name_en' | 'name_vi'>,
  ) {
    let nameEn = existing?.name_en ?? '';
    let nameVi = existing?.name_vi ?? '';

    if (dto.name_en !== undefined) nameEn = dto.name_en;
    else if (dto.name !== undefined) nameEn = dto.name;

    if (dto.name_vi !== undefined) nameVi = dto.name_vi;

    return { nameEn, nameVi };
  }

  private toVolumeTier(row: VolumeTierRow) {
    return {
      id: row.id,
      min_quantity: row.min_quantity,
      discount_bps: row.discount_bps,
      is_active: row.is_active,
    };
  }

  private isUniqueViolation(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: string }).code === '23505'
    );
  }
}
