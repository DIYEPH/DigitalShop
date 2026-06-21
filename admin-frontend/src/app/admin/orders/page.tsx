"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  adminConfirmOrder,
  adminDeliverOrder,
  adminListOrders,
  adminListOrderMessages,
  adminPostOrderMessage,
  type AdminOrder,
  type AdminOrderMessage,
} from "@/lib/api/admin";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Table,
  TableHeader,
  TableWrap,
  orderStatusBadgeTone,
} from "@/components/ui";

export default function AdminOrdersPage() {
  const token = useAdminToken();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [deliveryNoteById, setDeliveryNoteById] = useState<
    Record<string, string>
  >({});
  const [paymentCodeQuery, setPaymentCodeQuery] = useState("");
  const [confirmOrder, setConfirmOrder] = useState<AdminOrder | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AdminOrderMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadOrders = async (nextPaymentCode = paymentCodeQuery) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await adminListOrders(token, {
        page: 1,
        limit: 50,
        payment_code: nextPaymentCode.trim() || undefined,
      });
      setOrders(r.data.orders);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được đơn hàng.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    queueMicrotask(() => void loadOrders(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const openChat = async (orderId: string) => {
    if (!token) return;
    setChatOrderId(orderId);
    setChatLoading(true);
    setError(null);
    try {
      const r = await adminListOrderMessages(token, orderId);
      setChatMessages(r.messages);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được chat.");
    } finally {
      setChatLoading(false);
    }
  };

  const sendChat = async () => {
    if (!token || !chatOrderId) return;
    const msg = chatText.trim();
    if (!msg) return;
    setChatLoading(true);
    setError(null);
    try {
      const created = await adminPostOrderMessage(token, chatOrderId, {
        message: msg,
        kind: "TEXT",
      });
      setChatMessages((prev) => [...prev, created]);
      setChatText("");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Gửi tin nhắn thất bại.");
    } finally {
      setChatLoading(false);
    }
  };

  const confirm = async (o: AdminOrder) => {
    if (!token) return;
    setBusyOrderId(o.id);
    setError(null);
    try {
      const r = await adminConfirmOrder(token, o.id);
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: r.status } : x)),
      );
      setConfirmOrder(null);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Xác nhận đơn thất bại.");
    } finally {
      setBusyOrderId(null);
    }
  };

  const deliver = async (o: AdminOrder) => {
    if (!token) return;
    setBusyOrderId(o.id);
    setError(null);
    try {
      const note = deliveryNoteById[o.id] || undefined;
      const r = await adminDeliverOrder(token, o.id, note);
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: r.status } : x)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Giao hàng thất bại.");
    } finally {
      setBusyOrderId(null);
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Đơn hàng
        </h1>
        <p className="text-sm text-muted-foreground">
          Xác nhận thanh toán, giao hàng và chat hỗ trợ
        </p>
      </div>

      {error ? (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <TableWrap>
        <TableHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-muted-foreground">
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
                uiSize="sm"
                className="w-56"
                placeholder="Lọc payment_code"
                value={paymentCodeQuery}
                onChange={(e) => setPaymentCodeQuery(e.target.value)}
              />
              <Button uiSize="sm" type="submit" disabled={loading}>
                Tìm
              </Button>
              <Button
                uiSize="sm"
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
        </TableHeader>

        <Table>
          <thead className="bg-muted text-muted-foreground">
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
                className="border-t border-border-subtle transition-colors duration-150 hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {o.id}
                </td>
                <td className="px-3 py-2 font-semibold text-foreground">
                  {o.user?.email ?? "—"}
                </td>
                <td className="px-3 py-2">
                  <span className="font-mono text-[11px] font-semibold text-foreground">
                    {o.payment_code ?? "—"}
                  </span>
                </td>
                <td className="px-3 py-2 font-semibold text-foreground">
                  {o.total_price} {o.currency}
                </td>
                <td className="px-3 py-2">
                  <Badge tone={orderStatusBadgeTone(o.status)}>
                    {o.status}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  <div className="text-[10px]">
                    <span>Giữ:{o.reserved_count ?? 0}</span>
                    <span className="ml-1">Giao:{o.delivered_count ?? 0}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex flex-col items-end gap-1">
                    <div className="inline-flex gap-1">
                      <Link
                        className="inline-flex h-8 items-center justify-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-foreground transition-colors duration-150 hover:bg-muted"
                        href={`/admin/orders/${o.id}`}
                      >
                        Chi tiết
                      </Link>
                      <Button
                        variant="ghost"
                        uiSize="sm"
                        type="button"
                        onClick={() => openChat(o.id)}
                      >
                        Chat
                      </Button>
                      <Button
                        uiSize="sm"
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
                        uiSize="sm"
                        disabled={busyOrderId === o.id || o.status !== "PAID"}
                        onClick={() => deliver(o)}
                      >
                        Hoàn thành giao
                      </Button>
                    </div>
                    {o.status === "PAID" && (
                      <Input
                        uiSize="sm"
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
                <td className="px-3 py-4 text-muted-foreground" colSpan={7}>
                  Chưa có đơn.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrap>

      {chatOrderId ? (
        <Modal open onClose={() => setChatOrderId(null)}>
          <Card
            className="w-full max-w-xl overflow-hidden p-0 shadow-(--shadow-md)"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-semibold text-foreground">
                Chat đơn #{chatOrderId}
              </span>
              <Button
                variant="ghost"
                uiSize="sm"
                type="button"
                onClick={() => setChatOrderId(null)}
              >
                Đóng
              </Button>
            </div>
            <div className="grid gap-2 p-3">
              <div className="h-64 overflow-auto rounded-lg border border-border bg-muted/40 p-2">
                {chatLoading && chatMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Đang tải…</p>
                ) : chatMessages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Chưa có tin nhắn.
                  </p>
                ) : (
                  <div className="grid gap-1.5">
                    {chatMessages.map((m) => (
                      <Card key={m.id} className="p-2 shadow-none">
                        <div className="flex gap-2 text-[10px] text-muted-foreground">
                          <span className="font-semibold text-foreground">
                            {m.sender_role}
                          </span>
                          <span>{m.kind}</span>
                          <span className="ml-auto">
                            {new Date(m.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="mt-0.5 whitespace-pre-wrap text-xs text-foreground">
                          {m.message}
                        </p>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-1.5">
                <Input
                  uiSize="sm"
                  value={chatText}
                  onChange={(e) => setChatText(e.target.value)}
                  placeholder="Nhập tin nhắn…"
                />
                <Button
                  uiSize="sm"
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
            className="w-full max-w-md shadow-(--shadow-md)"
            title="Xác nhận thanh toán thủ công"
            subtitle={`Đơn #${confirmOrder.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm font-semibold text-foreground">
              Bạn chắc chắn người này đã chuyển khoản và sẽ giao tài khoản thủ
              công?
            </p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              Thao tác này chỉ chuyển đơn sang PAID và giữ stock nếu có. Hệ
              thống sẽ không tự giao tài khoản, kể cả sản phẩm giao ngay hoặc
              giao sau. Admin bấm «Hoàn thành giao» sau khi đã chuẩn bị nội dung
              giao.
            </p>
            <Card className="mt-3 border-border bg-muted/40 p-2 shadow-none">
              <div className="text-xs text-foreground">
                <span className="font-semibold">payment_code:</span>{" "}
                <span className="font-mono">
                  {confirmOrder.payment_code ?? "—"}
                </span>
              </div>
              <div className="mt-1 text-xs text-foreground">
                <span className="font-semibold">Tổng:</span>{" "}
                {confirmOrder.total_price} {confirmOrder.currency}
              </div>
            </Card>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                uiSize="sm"
                type="button"
                onClick={() => setConfirmOrder(null)}
              >
                Hủy
              </Button>
              <Button
                uiSize="sm"
                type="button"
                disabled={busyOrderId === confirmOrder.id}
                onClick={() => confirm(confirmOrder)}
              >
                Đã xác nhận thanh toán
              </Button>
            </div>
          </Card>
        </Modal>
      ) : null}
    </div>
  );
}
