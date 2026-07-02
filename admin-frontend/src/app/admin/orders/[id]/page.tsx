"use client";

import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Table,
  Textarea,
} from "@/components/ui";
import {
  formatDate,
  formatMoney,
  orderStatusVariant,
  stockStatusVariant,
} from "./order-detail.constants";
import { useOrderDetail } from "./order-detail.hooks";

export default function AdminOrderDetailPage() {
  const {
    orderId,
    order,
    reservedSlots,
    deliveredSlots,
    messages,
    loading,
    error,
    actionError,
    actionMsg,
    drafts,
    setDraft,
    savingSlotId,
    saveSlot,
    confirming,
    confirm,
    delivering,
    deliver,
    posting,
    postMessage,
    txHash,
    setTxHash,
    deliveryNote,
    setDeliveryNote,
    newMessage,
    setNewMessage,
    warrantyRequests,
    warrantyPayloads,
    setWarrantyPayload,
    warrantyNotes,
    setWarrantyNote,
    resolvingWarrantyId,
    resolveWarranty,
    isPending,
    isPaid,
    canDeliver,
    expectedUnits,
    filledCount,
    unfilledCount,
  } = useOrderDetail();

  const warrantyStatusVariant = (status: string) =>
    status === "OPEN"
      ? "accent"
      : status === "REJECTED"
        ? "danger"
        : "success";
  const warrantyStatusLabel = (status: string) =>
    status === "OPEN"
      ? "Đang chờ"
      : status === "REPLACED"
        ? "Đã bảo hành"
        : status === "REFUNDED"
          ? "Đã hoàn tiền"
          : "Đã từ chối";

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
      {actionError ? <Alert variant="danger">{actionError}</Alert> : null}
      {actionMsg ? <Alert variant="success">{actionMsg}</Alert> : null}

      {loading ? (
        <Card className="text-sm text-gray-600">
          Đang tải chi tiết đơn hàng…
        </Card>
      ) : order ? (
        <>
          {isPending || isPaid ? (
            <Card>
              <CardHeader>
                <CardTitle>Hành động</CardTitle>
              </CardHeader>
              <CardContent>
                {isPending ? (
                  <div className="grid gap-2 rounded-brutal border-3 border-dashed border-brutal bg-brutal-muted p-3">
                    <div className="text-sm font-semibold text-brutal-fg">
                      Đánh dấu đã thanh toán (thủ công)
                    </div>
                    <p className="text-xs text-gray-600">
                      Đơn crypto tự chuyển sang PAID khi khách nhập txid và hệ
                      thống xác minh giao dịch. Chỉ dùng nút này làm phương án dự
                      phòng khi auto-verify chưa chạy hoặc lỗi.
                    </p>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="grid w-full gap-1 sm:w-auto">
                        <label className="text-xs font-semibold text-gray-600">
                          Mã giao dịch / txid (tuỳ chọn)
                        </label>
                        <Input
                          className="w-full sm:w-72"
                          placeholder="transaction_hash / tx_id"
                          value={txHash}
                          onChange={(e) => setTxHash(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="outline"
                        loading={confirming}
                        onClick={() => void confirm()}
                      >
                        Đánh dấu đã thanh toán
                      </Button>
                    </div>
                  </div>
                ) : null}

                {isPaid ? (
                  <div className="grid gap-3">
                    <div className="text-sm text-brutal-fg">
                      Tiến độ điền hàng:{" "}
                      <span className="font-semibold">
                        {filledCount}/{expectedUnits}
                      </span>
                      {unfilledCount > 0 ? (
                        <span className="ml-2 text-brutal-destructive">
                          còn {unfilledCount} slot chưa điền payload
                        </span>
                      ) : (
                        <span className="ml-2 text-brutal-success">
                          đã đủ payload
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-end gap-3">
                      <div className="grid w-full gap-1 sm:w-auto">
                        <label className="text-xs font-semibold text-gray-600">
                          Ghi chú giao hàng (tuỳ chọn)
                        </label>
                        <Input
                          className="w-full sm:w-72"
                          placeholder="delivery_note"
                          value={deliveryNote}
                          onChange={(e) => setDeliveryNote(e.target.value)}
                        />
                      </div>
                      <Button
                        variant="success"
                        loading={delivering}
                        disabled={!canDeliver}
                        onClick={() => void deliver()}
                      >
                        Giao hàng
                      </Button>
                    </div>
                    {!canDeliver && unfilledCount > 0 ? (
                      <p className="text-xs text-gray-600">
                        Điền đủ payload cho tất cả slot bên dưới trước khi giao.
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

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

          {reservedSlots.length > 0 || deliveredSlots.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  Điền hàng ({filledCount}/{expectedUnits})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {reservedSlots.length === 0 ? (
                    <p className="text-sm text-gray-600">
                      Không còn slot nào cần điền.
                    </p>
                  ) : null}

                  {reservedSlots.map((slot) => {
                    const draft = drafts[slot.id] ?? "";
                    const dirty = draft.trim() !== (slot.payload ?? "").trim();
                    const empty = !(slot.payload ?? "").trim();
                    return (
                      <div
                        key={slot.id}
                        className="grid gap-2 rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 text-xs">
                            <Badge variant={stockStatusVariant(slot.status)}>
                              {slot.status}
                            </Badge>
                            <span className="font-mono text-gray-600">
                              slot #{slot.id} · variant {slot.variant_id}
                            </span>
                          </div>
                          <Badge variant={empty ? "danger" : "success"} size="sm">
                            {empty ? "Chưa điền" : "Đã điền"}
                          </Badge>
                        </div>
                        <Textarea
                          size="sm"
                          className="min-h-[72px] font-mono"
                          placeholder="Nhập tài khoản / key giao cho khách…"
                          value={draft}
                          onChange={(e) => setDraft(slot.id, e.target.value)}
                        />
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            variant="primary"
                            loading={savingSlotId === slot.id}
                            disabled={!draft.trim() || !dirty}
                            onClick={() => void saveSlot(slot.id)}
                          >
                            Lưu payload
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {deliveredSlots.map((slot) => (
                    <div
                      key={slot.id}
                      className="grid gap-2 rounded-brutal border-3 border-brutal bg-brutal-muted p-3"
                    >
                      <div className="flex items-center gap-2 text-xs">
                        <Badge variant={stockStatusVariant(slot.status)}>
                          {slot.status}
                        </Badge>
                        <span className="font-mono text-gray-600">
                          slot #{slot.id} · variant {slot.variant_id} · giao{" "}
                          {formatDate(slot.delivered_at)}
                        </span>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all rounded-brutal border-3 border-brutal bg-brutal-bg p-2 font-mono text-xs text-brutal-fg">
                        {slot.payload || "—"}
                      </pre>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {warrantyRequests.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Yêu cầu bảo hành ({warrantyRequests.length})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3">
                  {warrantyRequests.map((req) => {
                    const open = req.status === "OPEN";
                    const resolving = resolvingWarrantyId === req.id;
                    return (
                      <div
                        key={req.id}
                        className="grid gap-3 rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2 text-xs">
                            <Badge variant={warrantyStatusVariant(req.status)} size="sm">
                              {warrantyStatusLabel(req.status)}
                            </Badge>
                            <span className="font-semibold text-brutal-fg">
                              {req.snapshot_variant_name ?? `item #${req.order_item_id ?? "—"}`}
                            </span>
                            <span className="text-gray-600">
                              variant {req.variant_id ?? "—"}
                            </span>
                          </div>
                          <span className="text-xs text-gray-600">
                            {formatDate(req.created_at)}
                          </span>
                        </div>

                        <div className="text-xs text-gray-600">
                          Đã dùng:{" "}
                          <span className="font-semibold text-brutal-fg">
                            {req.days_used ?? "—"} ngày
                          </span>
                          {req.warranty_type ? ` · ${req.warranty_type}` : ""}
                        </div>

                        <div className="rounded-brutal border-3 border-dashed border-brutal bg-brutal-muted p-2 text-sm text-brutal-fg">
                          <span className="text-xs font-semibold text-gray-600">
                            Lý do:{" "}
                          </span>
                          <span className="whitespace-pre-wrap">{req.reason}</span>
                        </div>

                        {open ? (
                          <div className="grid gap-3">
                            <div className="grid gap-2 rounded-brutal border-3 border-brutal bg-brutal-bg p-3">
                              <label className="text-xs font-semibold text-gray-600">
                                Bảo hành đổi hàng — nhập tài khoản/key thay thế
                              </label>
                              <Textarea
                                size="sm"
                                className="min-h-[64px] font-mono"
                                placeholder="Payload thay thế giao cho khách…"
                                value={warrantyPayloads[req.id] ?? ""}
                                onChange={(e) =>
                                  setWarrantyPayload(req.id, e.target.value)
                                }
                              />
                              <div className="flex justify-end">
                                <Button
                                  size="sm"
                                  variant="success"
                                  loading={resolving}
                                  disabled={!(warrantyPayloads[req.id] ?? "").trim()}
                                  onClick={() => void resolveWarranty(req.id, "REPLACED")}
                                >
                                  Đã bảo hành
                                </Button>
                              </div>
                            </div>

                            <div className="grid gap-2 rounded-brutal border-3 border-brutal bg-brutal-bg p-3">
                              <label className="text-xs font-semibold text-gray-600">
                                Ghi chú gửi khách (bắt buộc khi từ chối)
                              </label>
                              <Input
                                placeholder="Lý do / ghi chú…"
                                value={warrantyNotes[req.id] ?? ""}
                                onChange={(e) =>
                                  setWarrantyNote(req.id, e.target.value)
                                }
                              />
                              <div className="flex flex-wrap justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  loading={resolving}
                                  onClick={() => void resolveWarranty(req.id, "REFUNDED")}
                                >
                                  Đã hoàn tiền
                                </Button>
                                <Button
                                  size="sm"
                                  variant="danger"
                                  loading={resolving}
                                  disabled={!(warrantyNotes[req.id] ?? "").trim()}
                                  onClick={() => void resolveWarranty(req.id, "REJECTED")}
                                >
                                  Từ chối
                                </Button>
                              </div>
                            </div>
                          </div>
                        ) : req.resolution_note ? (
                          <div className="text-xs text-gray-600">
                            <span className="font-semibold">Ghi chú:</span>{" "}
                            {req.resolution_note}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Tin nhắn đơn hàng ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3">
                {messages.length === 0 ? (
                  <p className="text-sm text-gray-600">Chưa có tin nhắn.</p>
                ) : (
                  <ul className="grid gap-2">
                    {messages.map((m) => (
                      <li
                        key={m.id}
                        className="rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm"
                      >
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                m.sender_role === "ADMIN" ? "primary" : "secondary"
                              }
                              size="sm"
                            >
                              {m.sender_role}
                            </Badge>
                            <span className="text-gray-600">{m.kind}</span>
                          </div>
                          <span className="text-gray-600">
                            {formatDate(m.created_at)}
                          </span>
                        </div>
                        <p className="mt-2 whitespace-pre-wrap text-sm text-brutal-fg">
                          {m.message}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid gap-2">
                  <Textarea
                    size="sm"
                    placeholder="Nhập tin nhắn gửi khách…"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      variant="primary"
                      loading={posting}
                      disabled={!newMessage.trim()}
                      onClick={() => void postMessage()}
                    >
                      Gửi tin nhắn
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card className="text-sm text-gray-600">Không tìm thấy đơn hàng.</Card>
      )}
    </div>
  );
}
