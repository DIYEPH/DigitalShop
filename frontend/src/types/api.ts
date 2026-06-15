export type ApiErrorBody = {
  code: string;
  message: string;
  details?: unknown;
};

/** Success JSON from DigitalShop API (see backend `shared/http/apiResponse.js`). */
export type ApiSuccessBody<T> = { data: T; pagination?: Pagination; meta?: Record<string, unknown> };

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export interface PaginatedResult<T> {
  items: T[];
  pagination: Pagination;
}
