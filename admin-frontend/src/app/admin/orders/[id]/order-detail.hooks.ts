"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { orderDetailService } from "./order-detail.service";
import type { AdminOrderDetail } from "./order-detail.types";

export function useOrderDetail() {
  const token = useAdminToken();
  const params = useParams<{ id: string }>();
  const orderId = params.id;
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token || !orderId) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      void orderDetailService
        .get(token, orderId)
        .then((data) => setOrder(data))
        .catch((e) => {
          setError(
            e instanceof ApiError
              ? e.message
              : "Không tải được chi tiết đơn hàng.",
          );
        })
        .finally(() => setLoading(false));
    });
  }, [token, orderId]);

  return { orderId, order, loading, error };
}
