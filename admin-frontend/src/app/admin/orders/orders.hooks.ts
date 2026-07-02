"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { ordersService } from "./orders.service";
import type { AdminOrder, AdminOrderMessage } from "./orders.types";

export function useOrders() {
  const token = useAdminToken();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyOrderId, setBusyOrderId] = useState<string | null>(null);
  const [deliveryNoteById, setDeliveryNoteById] = useState<
    Record<string, string>
  >({});
  const [paymentCodeQuery, setPaymentCodeQuery] = useState("");
  const [warrantyOnly, setWarrantyOnly] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState<AdminOrder | null>(null);
  const [chatOrderId, setChatOrderId] = useState<string | null>(null);
  const [chatMessages, setChatMessages] = useState<AdminOrderMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const loadOrders = async (
    nextPaymentCode = paymentCodeQuery,
    nextWarrantyOnly = warrantyOnly,
  ) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await ordersService.list(
        token,
        nextPaymentCode.trim() || undefined,
        nextWarrantyOnly,
      );
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
      const r = await ordersService.listMessages(token, orderId);
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
      const created = await ordersService.postMessage(token, chatOrderId, msg);
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
      const r = await ordersService.confirm(token, o.id);
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
      const r = await ordersService.deliver(token, o.id, note);
      setOrders((prev) =>
        prev.map((x) => (x.id === o.id ? { ...x, status: r.status } : x)),
      );
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Giao hàng thất bại.");
    } finally {
      setBusyOrderId(null);
    }
  };

  return {
    // state
    orders,
    loading,
    error,
    busyOrderId,
    deliveryNoteById,
    paymentCodeQuery,
    warrantyOnly,
    confirmOrder,
    chatOrderId,
    chatMessages,
    chatText,
    chatLoading,
    // setters
    setDeliveryNoteById,
    setPaymentCodeQuery,
    setWarrantyOnly,
    setConfirmOrder,
    setChatOrderId,
    setChatText,
    // actions
    loadOrders,
    openChat,
    sendChat,
    confirm,
    deliver,
  };
}
