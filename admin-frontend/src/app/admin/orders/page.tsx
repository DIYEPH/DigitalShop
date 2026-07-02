"use client";

import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Modal,
  Table,
} from "@/components/ui";
import { orderStatusVariant } from "./orders.constants";
import { useOrders } from "./orders.hooks";

export default function AdminOrdersPage() {
  const {
    orders,
    loading,
    error,
    busyOrderId,
    deliveryNoteById,
    paymentCodeQuery,
    confirmOrder,
    chatOrderId,
    chatMessages,
    chatText,
    chatLoading,
    setDeliveryNoteById,
    setPaymentCodeQuery,
    setConfirmOrder,
    setChatOrderId,
    setChatText,
    loadOrders,
    openChat,
    sendChat,
    confirm,
    deliver,
  } = useOrders();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brutal-fg">
          Đơn hàng
        </h1>
        <p className="text-sm text-gray-600">
          Xác nhận thanh toán, giao hàng và chat hỗ trợ
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <>
        <div className="rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-gray-600">
              {loading ? "Đang tải…" : `${orders.length} đơn`}
            </div>
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void loadOrders();
              }}
            >
              <Input
                size="sm"
                className="w-56"
                placeholder="Lọc payment_code"
                value={paymentCodeQuery}
                onChange={(e) => setPaymentCodeQuery(e.target.value)}
              />
              <Button variant="primary" size="sm" type="submit" disabled={loading}>
                Tìm
              </Button>
              <Button
                size="sm"
                type="button"
                variant="ghost"
                disabled={loading || !paymentCodeQuery}
                onClick={() => {
                  setPaymentCodeQuery("");
                  void loadOrders("");
                }}
              >
                Xóa lọc
              </Button>
            </form>
          </div>
        </div>

        <Table>
          <thead className="bg-brutal-muted text-gray-600">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">ID</th>
              <th className="px-3 py-2 text-left font-semibold">Khách</th>
              <th className="px-3 py-2 text-left font-semibold">Nội dung CK</th>
              <th className="px-3 py-2 text-left font-semibold">Tổng</th>
              <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
              <th className="px-3 py-2 text-left font-semibold">Kho</th>
              <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr
                key={o.id}
                className="border-t-3 border-brutal transition-colors duration-150 hover:bg-brutal-muted"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-gray-600">
                  {o.id}
                </td>
                <td className="px-3 py-2 font-semibold text-brutal-fg">
                  {o.user?.email ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[11px] font-semibold text-brutal-fg">
                    {o.payment_code ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-brutal-fg">
                  {o.total_price} {o.currency}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={orderStatusVariant(o.status)}>
                    {o.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-gray-600">
                  <div className="text-[10px]">
                    <span>Giữ:{o.reserved_count ?? 0}</span>
                    <span className="ml-1">Giao:{o.delivered_count ?? 0}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex flex-col items-end gap-1">
                    <div className="inline-flex gap-1">
                      <Button variant="outline" size="sm" asChild>
                        <Link href={`/admin/orders/${o.id}`}>Chi tiết</Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        type="button"
                        onClick={() => openChat(o.id)}
                      >
                        Chat
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={
                          busyOrderId === o.id ||
                          o.status === "PAID" ||
                          o.status === "DELIVERED"
                        }
                        onClick={() => setConfirmOrder(o)}
                      >
                        Xác nhận CK
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={busyOrderId === o.id || o.status !== "PAID"}
                        onClick={() => deliver(o)}
                      >
                        Hoàn thành giao
                      </Button>
                    </div>
                    {o.status === "PAID" && (
                      <Input
                        size="sm"
                        className="w-56"
                        placeholder="Ghi chú giao hàng"
                        value={deliveryNoteById[o.id] ?? ""}
                        onChange={(e) =>
                          setDeliveryNoteById((p) => ({
                            ...p,
                            [o.id]: e.target.value,
                          }))
                        }
                      />
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && orders.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-600" colSpan={7}>
                  Chưa có đơn.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </>

      {chatOrderId ? (
        <Modal open onClose={() => setChatOrderId(null)}>
          <Card
            className="w-full max-w-xl overflow-hidden p-0 shadow-brutal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-3 border-brutal px-3 py-2">
              <span className="text-xs font-semibold text-brutal-fg">
                Chat đơn #{chatOrderId}
              </span>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                onClick={() => setChatOrderId(null)}
              >
                Đóng
              </Button>
            </div>
            <div className="grid gap-2 p-3">
              <div className="h-64 overflow-auto rounded-brutal border-3 border-brutal bg-brutal-muted p-2">
                {chatLoading && chatMessages.length === 0 ? (
                  <p className="text-xs text-gray-600">Đang tải…</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-xs text-gray-600">Chưa có tin nhắn.</p>
                ) : (
                  <div className="grid gap-1.5">
                    {chatMessages.map((m) => (
                      <Card key={m.id} className="p-2 shadow-none">
                        <div className="flex gap-2 text-[10px] text-gray-600">
                          <span className="font-semibold text-brutal-fg">
                            {m.sender_role}
                          </span>
                          <span>{m.kind}</span>
                          <span className="ml-auto">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-brutal-fg">
                          {m.message}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <Input
                  size="sm"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                />
                <Button
                  variant="primary"
                  size="sm"
                  disabled={chatLoading}
                  type="button"
                  onClick={sendChat}
                >
                  Gửi
                </Button>
              </div>
            </div>
          </Card>
        </Modal>
      ) : null}

      {confirmOrder ? (
        <Modal open onClose={() => setConfirmOrder(null)}>
          <Card
            className="w-full max-w-md shadow-brutal"
            onClick={(e) => e.stopPropagation()}
          >
            <CardHeader>
              <CardTitle>Xác nhận thanh toán thủ công</CardTitle>
              <CardDescription>{`Đơn #${confirmOrder.id}`}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-semibold text-brutal-fg">
                Bạn chắc chắn người này đã chuyển khoản và sẽ giao tài khoản thủ
                công?
              </p>
              <p className="mt-2 text-xs leading-5 text-gray-600">
                Thao tác này chỉ chuyển đơn sang PAID và giữ stock nếu có. Hệ
                thống sẽ không tự giao tài khoản, kể cả sản phẩm giao ngay hoặc
                giao sau. Admin bấm «Hoàn thành giao» sau khi đã chuẩn bị nội dung
                giao.
              </p>
              <Card className="mt-3 border-brutal bg-brutal-muted p-2 shadow-none">
                <div className="text-xs text-brutal-fg">
                  <span className="font-semibold">payment_code:</span>{" "}
                  <span className="font-mono">
                    {confirmOrder.payment_code ?? "—"}
                  </span>
                </div>
                <div className="mt-1 text-xs text-brutal-fg">
                  <span className="font-semibold">Tổng:</span>{" "}
                  {confirmOrder.total_price} {confirmOrder.currency}
                </div>
              </Card>
              <div className="mt-4 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  type="button"
                  onClick={() => setConfirmOrder(null)}
                >
                  Hủy
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  type="button"
                  disabled={busyOrderId === confirmOrder.id}
                  onClick={() => confirm(confirmOrder)}
                >
                  Đã xác nhận thanh toán
                </Button>
              </div>
            </CardContent>
          </Card>
        </Modal>
      ) : null}
    </div>
  );
}
