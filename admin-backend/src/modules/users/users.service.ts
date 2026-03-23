import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { getPgPool } from "../../common/database/pg-pool";
import {
  createPaginationMeta,
  resolvePagination,
} from "../../common/utils/pagination.util";
import { ErrorCodes } from "../../common/enums/error-codes.enum";
import { UserRole, UserStatus } from "../../common/enums";
import { UserQueryDto } from "./dto/user-query.dto";

type UserRow = {
  id: number;
  email: string | null;
  username: string | null;
  full_name: string | null;
  telegram_id: string;
  role: string;
  status: string;
  created_at: Date;
};

@Injectable()
export class UsersService {
  private get pool() {
    return getPgPool();
  }

  async findAll(query: UserQueryDto) {
    const { page, limit, offset } = resolvePagination(query);
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (query.role) {
      params.push(query.role);
      conditions.push(`u.role = $${params.length}::role_enum`);
    }
    if (query.status) {
      params.push(query.status);
      conditions.push(`u.status = $${params.length}::user_status_enum`);
    }
    if (query.search?.trim()) {
      params.push(`%${query.search.trim()}%`);
      const idx = params.length;
      conditions.push(
        `(u.email ILIKE $${idx} OR u.username ILIKE $${idx} OR u.full_name ILIKE $${idx} OR u.telegram_id::text ILIKE $${idx})`,
      );
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const countRes = await this.pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM users u ${where}`,
      params,
    );
    const total = Number(countRes.rows[0]?.count ?? 0);

    const listParams = [...params, limit, offset];
    const limitIdx = listParams.length - 1;
    const offsetIdx = listParams.length;

    const res = await this.pool.query<UserRow>(
      `SELECT
          u.id,
          u.email,
          u.username,
          u.full_name,
          u.telegram_id::text AS telegram_id,
          u.role::text AS role,
          u.status::text AS status,
          u.created_at
        FROM users u
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $${limitIdx} OFFSET $${offsetIdx}`,
      listParams,
    );

    const meta = createPaginationMeta(page, limit, total);

    return {
      users: res.rows.map((row) => this.toListItem(row)),
      pagination: {
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
        totalPages: meta.pages,
      },
    };
  }

  async updateRole(userId: number, role: UserRole) {
    const existing = await this.getRow(userId);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: `User ${userId} not found`,
      });
    }

    if (existing.role === role) {
      return this.toListItem(existing);
    }

    if (existing.role === UserRole.ADMIN && role === UserRole.USER) {
      throw new BadRequestException({
        code: ErrorCodes.USER_ROLE_CHANGE_DENIED,
        message: "Cannot demote admin to user",
      });
    }

    if (existing.status !== UserStatus.ACTIVE) {
      throw new BadRequestException({
        code: ErrorCodes.USER_ROLE_CHANGE_DENIED,
        message: "Only active users can be promoted to admin",
      });
    }

    if (role !== UserRole.ADMIN) {
      throw new BadRequestException({
        code: ErrorCodes.USER_ROLE_CHANGE_DENIED,
        message: "Only promotion to ADMIN is allowed",
      });
    }

    const res = await this.pool.query<UserRow>(
      `UPDATE users
       SET role = $1::role_enum, updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         email,
         username,
         full_name,
         telegram_id::text AS telegram_id,
         role::text AS role,
         status::text AS status,
         created_at`,
      [role, userId],
    );

    return this.toListItem(res.rows[0]);
  }

  async updateStatus(userId: number, status: UserStatus) {
    const existing = await this.getRow(userId);
    if (!existing) {
      throw new NotFoundException({
        code: ErrorCodes.USER_NOT_FOUND,
        message: `User ${userId} not found`,
      });
    }

    if (existing.role === UserRole.ADMIN) {
      throw new BadRequestException({
        code: ErrorCodes.USER_CANNOT_BAN_ADMIN,
        message: "Cannot change admin status",
      });
    }

    if (existing.status === status) {
      return this.toListItem(existing);
    }

    const res = await this.pool.query<UserRow>(
      `UPDATE users
       SET status = $1::user_status_enum, updated_at = NOW()
       WHERE id = $2
       RETURNING
         id,
         email,
         username,
         full_name,
         telegram_id::text AS telegram_id,
         role::text AS role,
         status::text AS status,
         created_at`,
      [status, userId],
    );

    return this.toListItem(res.rows[0]);
  }

  private async getRow(id: number): Promise<UserRow | null> {
    const res = await this.pool.query<UserRow>(
      `SELECT
          id,
          email,
          username,
          full_name,
          telegram_id::text AS telegram_id,
          role::text AS role,
          status::text AS status,
          created_at
        FROM users
        WHERE id = $1`,
      [id],
    );
    return res.rows[0] ?? null;
  }

  private toListItem(row: UserRow) {
    return {
      id: row.id,
      email: row.email,
      username: row.username,
      full_name: row.full_name,
      telegram_id: Number(row.telegram_id),
      role: row.role,
      status: row.status,
      created_at: row.created_at.toISOString(),
    };
  }
}
