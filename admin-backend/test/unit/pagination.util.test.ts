import * as assert from "node:assert/strict";
import { describe, test } from "node:test";
import { PaginationDto } from "../../src/common/dto/pagination.dto";
import {
  createPaginationMeta,
  resolvePagination,
} from "../../src/common/utils/pagination.util";

describe("resolvePagination", () => {
  test("mặc định page=1 limit=20", () => {
    const r = resolvePagination({} as PaginationDto);
    assert.deepEqual(r, { page: 1, limit: 20, offset: 0 });
  });

  test("page 3 limit 10 → offset 20", () => {
    const r = resolvePagination({ page: 3, limit: 10 } as PaginationDto);
    assert.deepEqual(r, { page: 3, limit: 10, offset: 20 });
  });

  test("limit tối đa 100", () => {
    const r = resolvePagination({ page: 1, limit: 500 } as PaginationDto);
    assert.equal(r.limit, 100);
  });

  test("page tối thiểu 1", () => {
    const r = resolvePagination({ page: 0, limit: 5 } as PaginationDto);
    assert.equal(r.page, 1);
    assert.equal(r.offset, 0);
  });
});

describe("createPaginationMeta", () => {
  test("total 0 → pages 0", () => {
    assert.deepEqual(createPaginationMeta(1, 20, 0), {
      page: 1,
      limit: 20,
      total: 0,
      pages: 0,
    });
  });

  test("total 45 limit 20 → pages 3", () => {
    assert.deepEqual(createPaginationMeta(1, 20, 45), {
      page: 1,
      limit: 20,
      total: 45,
      pages: 3,
    });
  });
});
