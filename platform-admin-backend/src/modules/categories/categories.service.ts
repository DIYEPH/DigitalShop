import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";

@Injectable()
export class CategoriesService {
  async list() {
    const result = await getPgPool().query(
      `SELECT id, name_en, name_vi, slug, parent_id, is_active, sort_order
       FROM categories
       ORDER BY sort_order ASC, id ASC`,
    );
    return { categories: result.rows };
  }

  async create(input: {
    name_en: string;
    name_vi: string;
    slug: string;
    parent_id?: number | null;
  }) {
    try {
      const result = await getPgPool().query(
        `INSERT INTO categories (name_en, name_vi, slug, parent_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id, name_en, name_vi, slug, parent_id, is_active, sort_order`,
        [input.name_en, input.name_vi, input.slug, input.parent_id ?? null],
      );
      return result.rows[0];
    } catch (error) {
      if ((error as { code?: string }).code === "23505") {
        throw new ConflictException("Category slug already exists");
      }
      throw error;
    }
  }

  async setActive(id: number, isActive: boolean) {
    const result = await getPgPool().query(
      `UPDATE categories
       SET is_active = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name_en, name_vi, slug, is_active`,
      [id, isActive],
    );
    if (!result.rows[0]) throw new NotFoundException("Category not found");
    return result.rows[0];
  }
}
