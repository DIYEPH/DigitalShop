import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPgPool } from '../../common/database/pg-pool';
import { ErrorCodes } from '../../common/enums/error-codes.enum';
import { slugify } from '../products/utils/slug.util';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

type CategoryRow = {
  id: number;
  name_en: string;
  slug: string;
  image_url: string | null;
  parent_id: number | null;
};

@Injectable()
export class CategoriesService {
  private get pool() {
    return getPgPool();
  }

  async findAll(flat?: boolean) {
    const res = await this.pool.query<CategoryRow>(
      `SELECT id, name_en, slug, image_url, parent_id
       FROM categories
       WHERE is_active = TRUE
       ORDER BY sort_order ASC, name_en ASC`,
    );
    const items = res.rows.map((row) => this.toDto(row));
    if (flat) return items;
    return items;
  }

  async create(dto: CreateCategoryDto) {
    if (dto.parent_id != null) {
      await this.assertParentExists(dto.parent_id);
    }

    const slug = await this.uniqueSlug(slugify(dto.name));
    const res = await this.pool.query<CategoryRow>(
      `INSERT INTO categories (name_en, name_vi, slug, image_url, parent_id)
       VALUES ($1, $1, $2, $3, $4)
       RETURNING id, name_en, slug, image_url, parent_id`,
      [dto.name.trim(), slug, dto.image_url ?? null, dto.parent_id ?? null],
    );
    return this.toDto(res.rows[0]);
  }

  async update(id: number, dto: UpdateCategoryDto) {
    const existing = await this.getRow(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.CAT_NOT_FOUND,
        message: `Category ${id} not found`,
      });
    }

    if (dto.parent_id != null) {
      if (dto.parent_id === id) {
        throw new BadRequestException({
          code: ErrorCodes.CAT_CIRCULAR_REFERENCE,
          message: 'Category cannot be its own parent',
        });
      }
      await this.assertParentExists(dto.parent_id);
      await this.assertNoCircular(id, dto.parent_id);
    }

    const name = dto.name?.trim() ?? existing.name_en;
    const slug =
      dto.name != null && dto.name.trim() !== existing.name_en
        ? await this.uniqueSlug(slugify(name), id)
        : existing.slug;

    const res = await this.pool.query<CategoryRow>(
      `UPDATE categories
       SET name_en = $1,
           name_vi = $1,
           slug = $2,
           image_url = COALESCE($3, image_url),
           parent_id = CASE WHEN $4::boolean THEN $5 ELSE parent_id END,
           updated_at = NOW()
       WHERE id = $6 AND is_active = TRUE
       RETURNING id, name_en, slug, image_url, parent_id`,
      [
        name,
        slug,
        dto.image_url ?? null,
        dto.parent_id !== undefined,
        dto.parent_id ?? null,
        id,
      ],
    );

    return this.toDto(res.rows[0]);
  }

  async remove(id: number) {
    const existing = await this.getRow(id);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.CAT_NOT_FOUND,
        message: `Category ${id} not found`,
      });
    }

    const products = await this.pool.query(
      `SELECT 1 FROM products WHERE category_id = $1 LIMIT 1`,
      [id],
    );
    if ((products.rowCount ?? 0) > 0) {
      throw new ConflictException({
        code: ErrorCodes.CAT_HAS_PRODUCTS,
        message: 'Cannot delete category with products',
      });
    }

    const children = await this.pool.query(
      `SELECT 1 FROM categories WHERE parent_id = $1 AND is_active = TRUE LIMIT 1`,
      [id],
    );
    if ((children.rowCount ?? 0) > 0) {
      throw new ConflictException({
        code: ErrorCodes.CAT_HAS_PRODUCTS,
        message: 'Cannot delete category with child categories',
      });
    }

    await this.pool.query(
      `UPDATE categories SET is_active = FALSE, updated_at = NOW() WHERE id = $1`,
      [id],
    );

    return { message: 'Category deleted successfully' };
  }

  private async getRow(id: number): Promise<CategoryRow | null> {
    const res = await this.pool.query<CategoryRow>(
      `SELECT id, name_en, slug, image_url, parent_id
       FROM categories WHERE id = $1 AND is_active = TRUE`,
      [id],
    );
    return res.rows[0] ?? null;
  }

  private async assertParentExists(parentId: number) {
    const res = await this.pool.query(
      `SELECT 1 FROM categories WHERE id = $1 AND is_active = TRUE`,
      [parentId],
    );
    if (res.rowCount === 0) {
      throw new NotFoundException({
        code: ErrorCodes.CAT_PARENT_NOT_FOUND,
        message: `Parent category ${parentId} not found`,
      });
    }
  }

  private async assertNoCircular(categoryId: number, newParentId: number) {
    let current: number | null = newParentId;
    const visited = new Set<number>();
    while (current != null) {
      if (current === categoryId) {
        throw new BadRequestException({
          code: ErrorCodes.CAT_CIRCULAR_REFERENCE,
          message: 'Circular parent reference',
        });
      }
      if (visited.has(current)) break;
      visited.add(current);
      const res = await this.pool.query<{ parent_id: number | null }>(
        `SELECT parent_id FROM categories WHERE id = $1`,
        [current],
      );
      current = res.rows[0]?.parent_id ?? null;
    }
  }

  private async uniqueSlug(base: string, excludeId?: number): Promise<string> {
    let slug = base;
    let n = 0;
    for (;;) {
      const params: unknown[] = [slug];
      let sql = `SELECT 1 FROM categories WHERE slug = $1`;
      if (excludeId != null) {
        params.push(excludeId);
        sql += ` AND id <> $2`;
      }
      const res = await this.pool.query(sql, params);
      if (res.rowCount === 0) return slug;
      n += 1;
      slug = `${base}-${n}`;
    }
  }

  private toDto(row: CategoryRow) {
    return {
      id: row.id,
      name: row.name_en,
      slug: row.slug,
      image_url: row.image_url,
      parent_id: row.parent_id,
    };
  }
}
