export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ApiResponse<T> = {
  data: T;
  pagination?: PaginationMeta;
};

export type ApiErrorResponse = {
  message: string;
  statusCode: number;
  error?: string;
};
