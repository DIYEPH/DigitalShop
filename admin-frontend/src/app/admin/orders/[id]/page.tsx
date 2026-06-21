"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Alert,
  Badge,
  Card,
  Table,
  TableHeader,
  TableWrap,
  orderStatusBadgeTone,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { adminGetOrder, type AdminOrderDetail } from "@/lib/api/admin";
import { useAdminToken } from "@/lib/auth/use-admin-token";

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString() : "—";
}

function formatMoney(value: number, currency: string) {
  return `${value.toLocaleString("vi-VN")} ${currency}`;
}

export default function AdminOrderDetailPage() {
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
      void adminGetOrder(token, orderId)
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

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="text-xs font-semibold text-muted-foreground hover:text-foreground"
            href="/admin/orders"
          >
            Về đơn hàng
          </Link>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-foreground">
            Chi tiết đơn hàng
          </h1>
          <p className="font-mono text-xs text-muted-foreground">#{orderId}</p>
        </div>
        {order ? (
          <Badge tone={orderStatusBadgeTone(order.status)}>
            {order.status}
          </Badge>
        ) : null}
      </div>

      {error ? (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      {loading ? (
        <Card className="text-sm text-muted-foreground">
          Đang tải chi tiết đơn hàng…
        </Card>
      ) : order ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card title="Thông tin đơn">
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    Khách hàng
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {order.user?.email ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    User ID
                  </dt>
                  <dd className="mt-1 font-mono text-foreground">
                    {order.user?.id ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    Tổng
                  </dt>
                  <dd className="mt-1 font-semibold text-foreground">
                    {formatMoney(order.total_price, order.currency)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    Số dòng hàng
                  </dt>
                  <dd className="mt-1 text-foreground">{order.item_count}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    Tạo lúc
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {formatDate(order.created_at)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    Cập nhật
                  </dt>
                  <dd className="mt-1 text-foreground">
                    {formatDate(order.updated_at)}
                  </dd>
                </div>
              </dl>
            </Card>

            <Card title="Thanh toán & giao hàng">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    payment_method
                  </dt>
                  <dd className="mt-1 font-mono text-foreground">
                    {order.payment_method}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    payment_code
                  </dt>
                  <dd className="mt-1 font-mono text-foreground">
                    {order.payment_code ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    tx_id
                  </dt>
                  <dd className="mt-1 break-all font-mono text-foreground">
                    {order.tx_id ?? "—"}
                  </dd>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">
                      paid_at
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {formatDate(order.paid_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-muted-foreground">
                      delivered_at
                    </dt>
                    <dd className="mt-1 text-foreground">
                      {formatDate(order.delivered_at)}
                    </dd>
                  </div>
                </div>
                <div>
                  <dt className="text-xs font-semibold text-muted-foreground">
                    delivery_note
                  </dt>
                  <dd className="mt-1 whitespace-pre-wrap text-foreground">
                    {order.delivery_note ?? "—"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>

          <TableWrap>
            <TableHeader>
              <div className="text-xs font-semibold text-muted-foreground">
                {order.items.length} dòng hàng
              </div>
            </TableHeader>
            <Table>
              <thead className="bg-muted text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Biến thể
                  </th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Fulfillment
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">SL</th>
                  <th className="px-3 py-2 text-right font-semibold">
                    Đơn giá
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">Kho</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t border-border-subtle transition-colors duration-150 hover:bg-muted/40"
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                      #{item.id}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-foreground">
                        {item.snapshot_variant_name}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        variant_id: {item.variant_id}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-foreground">
                      <div>{item.snapshot_fulfillment_type}</div>
                      <div className="mt-1 text-muted-foreground">
                        {item.snapshot_warranty_type}
                        {item.snapshot_warranty_value
                          ? ` · ${item.snapshot_warranty_value} ${item.snapshot_warranty_unit ?? ""}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-foreground">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-foreground">
                      {formatMoney(item.unit_price, order.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-muted-foreground">
                      Giữ:{item.reserved_count} · Giao:{item.delivered_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </TableWrap>
        </>
      ) : (
        <Card className="text-sm text-muted-foreground">
          Không tìm thấy đơn hàng.
        </Card>
      )}
    </div>
  );
}
