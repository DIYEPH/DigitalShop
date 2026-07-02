"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { orderDetailService } from "./order-detail.service";
import type {
  AdminOrderDetail,
  AdminOrderMessage,
  AdminStockItem,
} from "./order-detail.types";

function errMessage(e: unknown, fallback: string) {
  return e instanceof ApiError ? e.message : fallback;
}

export function useOrderDetail() {
  const token = useAdminToken();
  const params = useParams<{ id: string }>();
  const orderId = params.id;

  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [slots, setSlots] = useState<AdminStockItem[]>([]);
  const [messages, setMessages] = useState<AdminOrderMessage[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionMsg, setActionMsg] = useState<string | null>(null);

  const [drafts, setDrafts] = useState<Record<number, string>>({});
  const [savingSlotId, setSavingSlotId] = useState<number | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [delivering, setDelivering] = useState(false);
  const [posting, setPosting] = useState(false);

  const [txHash, setTxHash] = useState("");
  const [deliveryNote, setDeliveryNote] = useState("");
  const [newMessage, setNewMessage] = useState("");

  const load = useCallback(
    async (opts: { silent?: boolean } = {}) => {
      if (!token || !orderId) return;
      if (!opts.silent) setLoading(true);
      setError(null);
      try {
        // Fetching the order materialises PREORDER slots server-side when PAID.
        const data = await orderDetailService.get(token, orderId);
        setOrder(data);

        const [slotRes, msgRes] = await Promise.all([
          orderDetailService.listSlots(token, orderId).catch(() => ({ items: [] })),
          orderDetailService.listMessages(token, orderId).catch(() => ({ messages: [] })),
        ]);
        setSlots(slotRes.items);
        setMessages(msgRes.messages);
        setDrafts((prev) => {
          const next: Record<number, string> = {};
          for (const s of slotRes.items) {
            next[s.id] = prev[s.id] ?? s.payload ?? "";
          }
          return next;
        });
      } catch (e) {
        setError(errMessage(e, "Không tải được chi tiết đơn hàng."));
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [token, orderId],
  );

  useEffect(() => {
    queueMicrotask(() => void load());
  }, [load]);

  const setDraft = useCallback((slotId: number, value: string) => {
    setDrafts((prev) => ({ ...prev, [slotId]: value }));
  }, []);

  const saveSlot = useCallback(
    async (slotId: number) => {
      if (!token) return;
      const payload = (drafts[slotId] ?? "").trim();
      if (!payload) {
        setActionError("Payload không được để trống.");
        return;
      }
      setSavingSlotId(slotId);
      setActionError(null);
      setActionMsg(null);
      try {
        await orderDetailService.fillSlot(token, slotId, { payload });
        setActionMsg(`Đã lưu payload cho slot #${slotId}.`);
        await load({ silent: true });
      } catch (e) {
        setActionError(errMessage(e, "Không lưu được payload."));
      } finally {
        setSavingSlotId(null);
      }
    },
    [token, drafts, load],
  );

  const confirm = useCallback(async () => {
    if (!token || !order) return;
    setConfirming(true);
    setActionError(null);
    setActionMsg(null);
    try {
      await orderDetailService.confirm(token, order.id, txHash.trim() || undefined);
      setActionMsg("Đã đánh dấu đơn là đã thanh toán (PAID).");
      setTxHash("");
      await load({ silent: true });
    } catch (e) {
      setActionError(errMessage(e, "Không xác nhận được đơn."));
    } finally {
      setConfirming(false);
    }
  }, [token, order, txHash, load]);

  const deliver = useCallback(async () => {
    if (!token || !order) return;
    setDelivering(true);
    setActionError(null);
    setActionMsg(null);
    try {
      await orderDetailService.deliver(token, order.id, deliveryNote.trim() || undefined);
      setActionMsg("Đã giao hàng (DELIVERED).");
      setDeliveryNote("");
      await load({ silent: true });
    } catch (e) {
      setActionError(errMessage(e, "Không giao được đơn."));
    } finally {
      setDelivering(false);
    }
  }, [token, order, deliveryNote, load]);

  const postMessage = useCallback(async () => {
    if (!token || !order) return;
    const message = newMessage.trim();
    if (!message) return;
    setPosting(true);
    setActionError(null);
    try {
      await orderDetailService.postMessage(token, order.id, message);
      setNewMessage("");
      await load({ silent: true });
    } catch (e) {
      setActionError(errMessage(e, "Không gửi được tin nhắn."));
    } finally {
      setPosting(false);
    }
  }, [token, order, newMessage, load]);

  const reservedSlots = useMemo(
    () => slots.filter((s) => s.status === "RESERVED"),
    [slots],
  );
  const deliveredSlots = useMemo(
    () => slots.filter((s) => s.status === "DELIVERED"),
    [slots],
  );
  const expectedUnits = useMemo(
    () => (order?.items ?? []).reduce((sum, it) => sum + it.quantity, 0),
    [order],
  );
  const unfilledCount = useMemo(
    () => reservedSlots.filter((s) => !(s.payload ?? "").trim()).length,
    [reservedSlots],
  );
  const filledCount = deliveredSlots.length + (reservedSlots.length - unfilledCount);

  const isPending = order?.status === "PENDING";
  const isPaid = order?.status === "PAID";
  const canDeliver =
    isPaid &&
    unfilledCount === 0 &&
    reservedSlots.length >= Math.max(expectedUnits, 1) - deliveredSlots.length;

  return {
    orderId,
    order,
    slots,
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
    isPending,
    isPaid,
    canDeliver,
    expectedUnits,
    filledCount,
    unfilledCount,
  };
}
