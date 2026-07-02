"use client";

import { useCallback, useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { getActiveShopId } from "@/lib/shop-context";
import { customersService } from "./customers.service";
import type { ShopCustomer } from "./customers.types";

export function useCustomers() {
  const token = useAdminToken();
  const [shopId, setShopId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<ShopCustomer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);

  useEffect(() => {
    queueMicrotask(() => setShopId(getActiveShopId()));
  }, []);

  const load = useCallback(
    async (args: { page?: number; search?: string } = {}) => {
      if (!token || !shopId) return;
      const nextPage = args.page ?? 1;
      const nextSearch = args.search ?? search;
      setLoading(true);
      setError(null);
      try {
        const r = await customersService.list(token, shopId, {
          page: nextPage,
          limit: 20,
          search: nextSearch.trim() || undefined,
        });
        setCustomers(r.customers);
        setTotal(r.pagination.total);
        setPage(r.pagination.page);
        setTotalPages(r.pagination.totalPages);
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Không tải được khách hàng.");
      } finally {
        setLoading(false);
      }
    },
    [token, shopId, search],
  );

  useEffect(() => {
    queueMicrotask(() => void load({ page: 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, shopId]);

  const setStatus = useCallback(
    async (userId: number, status: "ACTIVE" | "BANNED") => {
      if (!token || !shopId) return;
      setBusyUserId(userId);
      setError(null);
      try {
        await customersService.setStatus(token, shopId, userId, status);
        setCustomers((prev) =>
          prev.map((c) => (c.user_id === userId ? { ...c, status } : c)),
        );
      } catch (e) {
        setError(
          e instanceof ApiError ? e.message : "Không cập nhật được trạng thái.",
        );
      } finally {
        setBusyUserId(null);
      }
    },
    [token, shopId],
  );

  return {
    customers,
    total,
    page,
    totalPages,
    search,
    setSearch,
    loading,
    error,
    busyUserId,
    load,
    setStatus,
  };
}
