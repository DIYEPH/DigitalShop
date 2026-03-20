import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { CouponDiscountType, CouponVisibility } from "../../common/enums";
import {
  createPaginationMeta,
  resolvePagination,
} from "../../common/utils/pagination.util";
import { CouponQueryDto } from "./dto/coupon-query.dto";
import { CreateCouponDto } from "./dto/create-coupon.dto";
import { GrantCouponDto } from "./dto/grant-coupon.dto";
import { UpdateCouponDto } from "./dto/update-coupon.dto";

type CouponRow = {
  id: number;
  code: string;
  variant_id: number;
  product_id: number;
  product_name_en: string;
  product_name_vi: string;
  variant_name_en: string;
  variant_name_vi: string;
  is_active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  visibility: string;
  requires_ownership: boolean;
  discount_type: string;
  percent_bps: number | null;
  amount_usdt: string | null;
  amount_vnd: string | null;
  cost_point: number;
  max_redemptions: number | null;
  per_user_limit: number | null;
  created_at: Date;
  updated_at: Date;
};

type CouponPatch = {
  code: string;
  variant_id: number;
  is_active: boolean;
  starts_at: Date | null;
  ends_at: Date | null;
  visibility: CouponVisibility;
  requires_ownership: boolean;
  discount_type: CouponDiscountType;
  percent_bps: number | null;
  amount_usdt: number | null;
  amount_vnd: number | null;
  cost_point: number;
  max_redemptions: number | null;
  per_user_limit: number | null;
};

@Injectable()
export class CouponsService {
  private get pool() {
    return getPgPool();
  }

  async findAll(query: CouponQueryDto) {
    const { page, limit, offset } = resolvePagination(query);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (query.search?.trim()) {
      params.push(`%${query.search.trim()}%`);
      conditions.push(`c.code ILIKE $${params.length}`);
    }
    if (query.visibility) {
      params.push(query.visibility);
      conditions.push(
        `c.visibility = $${params.length}::coupon_visibility_enum`,
      );
    }
    if (query.discount_type) {
      params.push(query.discount_type);
      conditions.push(
        `c.discount_type = $${params.length}::coupon_discount_type_enum`,
      );
    }
    if (query.requires_ownership !== undefined) {
      params.push(query.requires_ownership);
      conditions.push(`c.requires_ownership = $${params.length}`);
    }
    if (query.variant_id !== undefined) {
      params.push(query.variant_id);
      conditions.push(`c.variant_id = $${params.length}`);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM coupons c ${where}`,
      params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const listParams = [...params, limit, offset];
    const limitIdx = listParams.length - 1;
    const offsetIdx = listParams.length;
    const res = await this.pool.query<CouponRow>(
      `${this.baseSelect()}
       ${where}
       ORDER BY c.created_at DESC, c.id DESC
       LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    const meta = createPaginationMeta(page, limit, total);
    return {
      coupons: res.rows.map((row) => this.toResponse(row)),
      pagination: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.pages,
      },
    };
  }

  async create(dto: CreateCouponDto) {
    const next = await this.resolveCreate(dto);
    await this.assertVariantExists(next.variant_id);
    await this.assertCodeUnique(next.code);
    await this.assertPublicPromoConflict(next);

    const res = await this.pool.query<CouponRow>(
      `WITH inserted AS (
         INSERT INTO coupons (
           code, variant_id, is_active, starts_at, ends_at, visibility,
           requires_ownership, discount_type, percent_bps, amount_usdt, amount_vnd,
           cost_point, max_redemptions, per_user_limit
         )
         VALUES (
           $1, $2, $3, $4, $5, $6::coupon_visibility_enum,
           $7, $8::coupon_discount_type_enum, $9, $10, $11,
           $12, $13, $14
         )
         RETURNING *
       )
       ${this.baseSelect("inserted")}`,
      [
        next.code,
        next.variant_id,
        next.is_active,
        next.starts_at,
        next.ends_at,
        next.visibility,
        next.requires_ownership,
        next.discount_type,
        next.percent_bps,
        next.amount_usdt,
        next.amount_vnd,
        next.cost_point,
        next.max_redemptions,
        next.per_user_limit,
      ],
    );

    return this.toResponse(res.rows[0]);
  }

  async update(id: number, dto: UpdateCouponDto) {
    const existing = await this.getCouponPatch(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.COUPON_NOT_FOUND,
        message: `Coupon with ID ${id} not found`,
      });
    }

    const next = await this.resolveUpdate(existing, dto);
    await this.assertVariantExists(next.variant_id);
    if (next.code !== existing.code) await this.assertCodeUnique(next.code, id);
    await this.assertPublicPromoConflict(next, id);

    const res = await this.pool.query<CouponRow>(
      `WITH updated AS (
         UPDATE coupons
         SET code = $2,
             variant_id = $3,
             is_active = $4,
             starts_at = $5,
             ends_at = $6,
             visibility = $7::coupon_visibility_enum,
             requires_ownership = $8,
             discount_type = $9::coupon_discount_type_enum,
             percent_bps = $10,
             amount_usdt = $11,
             amount_vnd = $12,
             cost_point = $13,
             max_redemptions = $14,
             per_user_limit = $15,
             updated_at = NOW()
         WHERE id = $1
         RETURNING *
       )
       ${this.baseSelect("updated")}`,
      [
        id,
        next.code,
        next.variant_id,
        next.is_active,
        next.starts_at,
        next.ends_at,
        next.visibility,
        next.requires_ownership,
        next.discount_type,
        next.percent_bps,
        next.amount_usdt,
        next.amount_vnd,
        next.cost_point,
        next.max_redemptions,
        next.per_user_limit,
      ],
    );

    return this.toResponse(res.rows[0]);
  }

  async grant(dto: GrantCouponDto) {
    const code = this.normalizeCode(dto.code);
    const userIds = this.parseUserIds(dto.user_ids ?? dto.user_id);
    const quantity = dto.quantity ?? 1;
    if (userIds.length === 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "user_ids or user_id is required",
      });
    }

    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const couponRes = await client.query<{
        id: number;
        code: string;
        is_active: boolean;
        requires_ownership: boolean;
        starts_at: Date | null;
        ends_at: Date | null;
        per_user_limit: number | null;
      }>(
        `SELECT id, code, is_active, requires_ownership, starts_at, ends_at, per_user_limit
         FROM coupons
         WHERE UPPER(code) = UPPER($1)
         FOR UPDATE`,
        [code],
      );
      const coupon = couponRes.rows[0];
      if (!coupon || !coupon.is_active) {
        throw new NotFoundException({
          code: ErrorCodes.COUPON_NOT_FOUND,
          message: "Coupon not found",
        });
      }
      if (!coupon.requires_ownership) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: "Coupon does not support ownership/grant",
        });
      }
      this.assertActiveWindow(coupon.starts_at, coupon.ends_at);

      const uniqueUserIds = Array.from(new Set(userIds));
      const usersRes = await client.query<{ id: number }>(
        `SELECT id FROM users WHERE id = ANY($1::int[])`,
        [uniqueUserIds],
      );
      const foundIds = new Set(usersRes.rows.map((u) => u.id));
      const results: Array<{
        user_id: number;
        ok: boolean;
        granted: number;
        owned_total?: number;
        error?: string;
      }> = [];

      for (const userId of uniqueUserIds) {
        if (!foundIds.has(userId)) {
          results.push({
            user_id: userId,
            ok: false,
            granted: 0,
            error: "User not found",
          });
          continue;
        }

        const ownedRes = await client.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM user_coupons WHERE user_id = $1 AND coupon_id = $2`,
          [userId, coupon.id],
        );
        const ownedTotal = Number(ownedRes.rows[0]?.count ?? 0);
        let grantQty = quantity;
        if (coupon.per_user_limit != null) {
          if (ownedTotal >= coupon.per_user_limit) {
            results.push({
              user_id: userId,
              ok: false,
              granted: 0,
              owned_total: ownedTotal,
              error: "Per-user coupon limit reached",
            });
            continue;
          }
          grantQty = Math.min(grantQty, coupon.per_user_limit - ownedTotal);
        }

        for (let i = 0; i < grantQty; i += 1) {
          await client.query(
            `INSERT INTO user_coupons (user_id, coupon_id) VALUES ($1, $2)`,
            [userId, coupon.id],
          );
        }
        results.push({
          user_id: userId,
          ok: true,
          granted: grantQty,
          owned_total: ownedTotal + grantQty,
        });
      }

      await client.query("COMMIT");
      return { coupon_id: coupon.id, code: coupon.code, results };
    } catch (err) {
      await client.query("ROLLBACK");
      throw err;
    } finally {
      client.release();
    }
  }

  private async resolveCreate(dto: CreateCouponDto): Promise<CouponPatch> {
    const code = this.normalizeCode(dto.code);
    this.assertCodeFormat(code);
    const startsAt = this.parseDate(dto.starts_at, "starts_at");
    const endsAt = this.parseDate(dto.ends_at, "ends_at");
    this.assertDateWindow(startsAt, endsAt);

    return this.validatePatch({
      code,
      variant_id: dto.variant_id,
      is_active: dto.is_active ?? true,
      starts_at: startsAt,
      ends_at: endsAt,
      visibility: dto.visibility ?? CouponVisibility.PRIVATE,
      requires_ownership: dto.requires_ownership ?? false,
      discount_type: dto.discount_type,
      percent_bps: dto.percent_bps ?? null,
      amount_usdt: dto.amount_usdt ?? null,
      amount_vnd: dto.amount_vnd ?? null,
      cost_point: dto.cost_point ?? 0,
      max_redemptions: dto.max_redemptions ?? null,
      per_user_limit: dto.per_user_limit ?? null,
    });
  }

  private async resolveUpdate(
    existing: CouponPatch,
    dto: UpdateCouponDto,
  ): Promise<CouponPatch> {
    const startsAt =
      dto.starts_at === undefined
        ? existing.starts_at
        : this.parseDate(dto.starts_at, "starts_at");
    const endsAt =
      dto.ends_at === undefined
        ? existing.ends_at
        : this.parseDate(dto.ends_at, "ends_at");
    this.assertDateWindow(startsAt, endsAt);

    const code =
      dto.code === undefined ? existing.code : this.normalizeCode(dto.code);
    this.assertCodeFormat(code);

    return this.validatePatch({
      code,
      variant_id: dto.variant_id ?? existing.variant_id,
      is_active: dto.is_active ?? existing.is_active,
      starts_at: startsAt,
      ends_at: endsAt,
      visibility: dto.visibility ?? existing.visibility,
      requires_ownership: dto.requires_ownership ?? existing.requires_ownership,
      discount_type: dto.discount_type ?? existing.discount_type,
      percent_bps: dto.percent_bps ?? existing.percent_bps,
      amount_usdt: dto.amount_usdt ?? existing.amount_usdt,
      amount_vnd: dto.amount_vnd ?? existing.amount_vnd,
      cost_point: dto.cost_point ?? existing.cost_point,
      max_redemptions: dto.max_redemptions ?? existing.max_redemptions,
      per_user_limit: dto.per_user_limit ?? existing.per_user_limit,
    });
  }

  private validatePatch(input: CouponPatch): CouponPatch {
    if (input.discount_type === CouponDiscountType.PERCENT) {
      if (
        !input.percent_bps ||
        input.percent_bps < 1 ||
        input.percent_bps > 10000
      ) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: "percent_bps must be between 1 and 10000",
        });
      }
      input.amount_usdt = null;
      input.amount_vnd = null;
    } else {
      if (
        !input.amount_usdt ||
        input.amount_usdt <= 0 ||
        !input.amount_vnd ||
        input.amount_vnd <= 0
      ) {
        throw new BadRequestException({
          code: ErrorCodes.VALIDATION_ERROR,
          message: "amount_usdt and amount_vnd are required for FIXED coupons",
        });
      }
      input.percent_bps = null;
    }

    if (input.cost_point < 0) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "cost_point must be >= 0",
      });
    }
    return input;
  }

  private async getCouponPatch(id: number): Promise<CouponPatch | null> {
    const res = await this.pool.query<{
      code: string;
      variant_id: number;
      is_active: boolean;
      starts_at: Date | null;
      ends_at: Date | null;
      visibility: string;
      requires_ownership: boolean;
      discount_type: string;
      percent_bps: number | null;
      amount_usdt: string | null;
      amount_vnd: string | null;
      cost_point: number;
      max_redemptions: number | null;
      per_user_limit: number | null;
    }>(
      `SELECT code, variant_id, is_active, starts_at, ends_at, visibility::text AS visibility,
              requires_ownership, discount_type::text AS discount_type, percent_bps,
              amount_usdt::text AS amount_usdt, amount_vnd::text AS amount_vnd,
              cost_point, max_redemptions, per_user_limit
       FROM coupons
       WHERE id = $1`,
      [id],
    );
    const row = res.rows[0];
    if (!row) return null;
    return {
      ...row,
      visibility: row.visibility as CouponVisibility,
      discount_type: row.discount_type as CouponDiscountType,
      amount_usdt: row.amount_usdt == null ? null : Number(row.amount_usdt),
      amount_vnd: row.amount_vnd == null ? null : Number(row.amount_vnd),
    };
  }

  private async assertVariantExists(variantId: number) {
    const res = await this.pool.query<{ id: number }>(
      `SELECT id FROM product_variants WHERE id = $1 AND is_active = TRUE`,
      [variantId],
    );
    if (!res.rows[0]) {
      throw new BadRequestException({
        code: ErrorCodes.COUPON_INVALID_VARIANT,
        message: "variant_id not found or inactive",
      });
    }
  }

  private async assertCodeUnique(code: string, exceptId?: number) {
    const params: unknown[] = [code];
    const except = exceptId ? `AND id <> $2` : "";
    if (exceptId) params.push(exceptId);
    const res = await this.pool.query<{ id: number }>(
      `SELECT id FROM coupons WHERE UPPER(code) = UPPER($1) ${except} LIMIT 1`,
      params,
    );
    if (res.rows[0]) {
      throw new ConflictException({
        code: ErrorCodes.COUPON_CODE_EXISTS,
        message: "Coupon code already exists",
      });
    }
  }

  private async assertPublicPromoConflict(
    next: CouponPatch,
    exceptId?: number,
  ) {
    if (
      !next.is_active ||
      next.requires_ownership ||
      next.visibility !== CouponVisibility.PUBLIC
    )
      return;
    const params: unknown[] = [next.variant_id, next.starts_at, next.ends_at];
    const except = exceptId ? `AND c.id <> $4` : "";
    if (exceptId) params.push(exceptId);
    const res = await this.pool.query<{ code: string }>(
      `SELECT c.code
       FROM coupons c
       WHERE c.variant_id = $1
         AND c.is_active = TRUE
         AND c.requires_ownership = FALSE
         AND c.visibility = 'PUBLIC'
         ${except}
         AND COALESCE(c.starts_at, '-infinity'::timestamptz) < COALESCE($3::timestamptz, 'infinity'::timestamptz)
         AND COALESCE($2::timestamptz, '-infinity'::timestamptz) < COALESCE(c.ends_at, 'infinity'::timestamptz)
       LIMIT 1`,
      params,
    );
    if (res.rows[0]) {
      throw new ConflictException({
        code: ErrorCodes.COUPON_CODE_EXISTS,
        message: `Variant already has an active public coupon (${res.rows[0].code})`,
      });
    }
  }

  private parseUserIds(input: string | number | undefined): number[] {
    if (typeof input === "number")
      return Number.isInteger(input) && input > 0 ? [input] : [];
    if (typeof input !== "string") return [];
    return input
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isInteger(n) && n > 0);
  }

  private parseDate(value: string | undefined, field: string): Date | null {
    if (!value) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `${field} is invalid`,
      });
    }
    return d;
  }

  private assertDateWindow(startsAt: Date | null, endsAt: Date | null) {
    if (startsAt && endsAt && endsAt <= startsAt) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "ends_at must be after starts_at",
      });
    }
  }

  private assertActiveWindow(startsAt: Date | null, endsAt: Date | null) {
    const now = Date.now();
    if (
      (startsAt && startsAt.getTime() > now) ||
      (endsAt && endsAt.getTime() < now)
    ) {
      throw new BadRequestException({
        code: ErrorCodes.COUPON_EXPIRED,
        message: "Coupon is not active",
      });
    }
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private assertCodeFormat(code: string) {
    if (!/^[A-Z0-9_-]{3,32}$/.test(code)) {
      throw new BadRequestException({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "Invalid code format. Use 3-32 chars: A-Z, 0-9, _, -",
      });
    }
  }

  private baseSelect(source = "coupons"): string {
    return `SELECT
        c.id,
        c.code,
        c.variant_id,
        p.id AS product_id,
        p.name_en AS product_name_en,
        p.name_vi AS product_name_vi,
        pv.name_en AS variant_name_en,
        pv.name_vi AS variant_name_vi,
        c.is_active,
        c.starts_at,
        c.ends_at,
        c.visibility::text AS visibility,
        c.requires_ownership,
        c.discount_type::text AS discount_type,
        c.percent_bps,
        c.amount_usdt::text AS amount_usdt,
        c.amount_vnd::text AS amount_vnd,
        c.cost_point,
        c.max_redemptions,
        c.per_user_limit,
        c.created_at,
        c.updated_at
      FROM ${source} c
      INNER JOIN product_variants pv ON pv.id = c.variant_id
      INNER JOIN products p ON p.id = pv.product_id`;
  }

  private toResponse(row: CouponRow) {
    return {
      id: row.id,
      code: row.code,
      variant_id: row.variant_id,
      product_id: row.product_id,
      product_name: row.product_name_en || row.product_name_vi,
      variant_name: row.variant_name_en || row.variant_name_vi,
      variant_label: `${row.product_name_en || row.product_name_vi} / ${row.variant_name_en || row.variant_name_vi}`,
      is_active: row.is_active,
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      visibility: row.visibility,
      requires_ownership: row.requires_ownership,
      discount_type: row.discount_type,
      percent_bps: row.percent_bps,
      amount_usdt: row.amount_usdt,
      amount_vnd: row.amount_vnd,
      cost_point: row.cost_point,
      max_redemptions: row.max_redemptions,
      per_user_limit: row.per_user_limit,
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}
