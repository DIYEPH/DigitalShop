import { PaginationDto, PaginationMeta } from "../dto/pagination.dto";

export function resolvePagination(dto: PaginationDto): {
  page: number;
  limit: number;
  offset: number;
} {
  const page = Math.max(1, dto.page ?? 1);
  const limit = Math.min(100, Math.max(1, dto.limit ?? 20));
  return { page, limit, offset: (page - 1) * limit };
}

export function createPaginationMeta(
  page: number,
  limit: number,
  total: number,
): PaginationMeta {
  return {
    page,
    limit,
    total,
    pages: total > 0 ? Math.ceil(total / limit) : 0,
  };
}
