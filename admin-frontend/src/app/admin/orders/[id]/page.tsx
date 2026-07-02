"use client";

import Link from "next/link";
import {
  Alert,
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Table,
} from "@/components/ui";
import {
  formatDate,
  formatMoney,
  orderStatusVariant,
} from "./order-detail.constants";
import { useOrderDetail } from "./order-detail.hooks";

export default function AdminOrderDetailPage() {
  const { orderId, order, loading, error } = useOrderDetail();

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            className="text-xs font-semibold text-gray-600 hover:text-brutal-fg"
            href="/admin/orders"
          >
            Về đơn hàng
          </Link>
          <h1 className="mt-1 text-lg font-semibold tracking-tight text-brutal-fg">
            Chi tiết đơn hàng
          </h1>
          <p className="font-mono text-xs text-gray-600">#{orderId}</p>
        </div>
        {order ? (
          <Badge variant={orderStatusVariant(order.status)}>
            {order.status}
          </Badge>
        ) : null}
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      {loading ? (
        <Card className="text-sm text-gray-600">
          Đang tải chi tiết đơn hàng…
        </Card>
      ) : order ? (
        <>
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin đơn</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      Khách hàng
                    </dt>
                    <dd className="mt-1 text-brutal-fg">
                      {order.user?.email ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      User ID
                    </dt>
                    <dd className="mt-1 font-mono text-brutal-fg">
                      {order.user?.id ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">Tổng</dt>
                    <dd className="mt-1 font-semibold text-brutal-fg">
                      {formatMoney(order.total_price, order.currency)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      Số dòng hàng
                    </dt>
                    <dd className="mt-1 text-brutal-fg">{order.item_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      Tạo lúc
                    </dt>
                    <dd className="mt-1 text-brutal-fg">
                      {formatDate(order.created_at)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      Cập nhật
                    </dt>
                    <dd className="mt-1 text-brutal-fg">
                      {formatDate(order.updated_at)}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thanh toán & giao hàng</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm">
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      payment_method
                    </dt>
                    <dd className="mt-1 font-mono text-brutal-fg">
                      {order.payment_method}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      payment_code
                    </dt>
                    <dd className="mt-1 font-mono text-brutal-fg">
                      {order.payment_code ?? "—"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">tx_id</dt>
                    <dd className="mt-1 break-all font-mono text-brutal-fg">
                      {order.tx_id ?? "—"}
                    </dd>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <dt className="text-xs font-semibold text-gray-600">
                        paid_at
                      </dt>
                      <dd className="mt-1 text-brutal-fg">
                        {formatDate(order.paid_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs font-semibold text-gray-600">
                        delivered_at
                      </dt>
                      <dd className="mt-1 text-brutal-fg">
                        {formatDate(order.delivered_at)}
                      </dd>
                    </div>
                  </div>
                  <div>
                    <dt className="text-xs font-semibold text-gray-600">
                      delivery_note
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap text-brutal-fg">
                      {order.delivery_note ?? "—"}
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>

          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm">
              <div className="text-xs font-semibold text-gray-600">
                {order.items.length} dòng hàng
              </div>
            </div>
            <Table>
              <thead className="bg-brutal-muted text-gray-600">
                <tr>
                  <th className="px-3 py-2 text-left font-semibold">Item</th>
                  <th className="px-3 py-2 text-left font-semibold">Biến thể</th>
                  <th className="px-3 py-2 text-left font-semibold">
                    Fulfillment
                  </th>
                  <th className="px-3 py-2 text-right font-semibold">SL</th>
                  <th className="px-3 py-2 text-right font-semibold">Đơn giá</th>
                  <th className="px-3 py-2 text-right font-semibold">Kho</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-t-3 border-brutal transition-colors duration-150 hover:bg-brutal-muted"
                  >
                    <td className="px-3 py-2 font-mono text-[11px] text-gray-600">
                      #{item.id}
                    </td>
                    <td className="px-3 py-2">
                      <div className="font-semibold text-brutal-fg">
                        {item.snapshot_variant_name}
                      </div>
                      <div className="text-[11px] text-gray-600">
                        variant_id: {item.variant_id}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-xs text-brutal-fg">
                      <div>{item.snapshot_fulfillment_type}</div>
                      <div className="mt-1 text-gray-600">
                        {item.snapshot_warranty_type}
                        {item.snapshot_warranty_value
                          ? ` · ${item.snapshot_warranty_value} ${item.snapshot_warranty_unit ?? ""}`
                          : ""}
                      </div>
                    </td>
                    <td className="px-3 py-2 text-right text-brutal-fg">
                      {item.quantity}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold text-brutal-fg">
                      {formatMoney(item.unit_price, order.currency)}
                    </td>
                    <td className="px-3 py-2 text-right text-xs text-gray-600">
                      Giữ:{item.reserved_count} · Giao:{item.delivered_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </>
        </>
      ) : (
        <Card className="text-sm text-gray-600">Không tìm thấy đơn hàng.</Card>
      )}
    </div>
  );
}
