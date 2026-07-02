import {
  adminConfirmOrder,
  adminDeliverOrder,
  adminGetOrder,
  adminListOrderMessages,
  adminListStock,
  adminListWarrantyRequests,
  adminPostOrderMessage,
  adminResolveWarranty,
  adminUpdateStock,
} from "@/lib/api/admin";

export const orderDetailService = {
  get: (token: string, orderId: string) => adminGetOrder(token, orderId),
  listSlots: (token: string, orderId: string) =>
    adminListStock(token, { order_id: orderId }),
  fillSlot: (
    token: string,
    stockItemId: number,
    input: { payload: string; note?: string },
  ) => adminUpdateStock(token, stockItemId, input),
  confirm: (token: string, orderId: string, transactionHash?: string) =>
    adminConfirmOrder(token, orderId, transactionHash),
  deliver: (token: string, orderId: string, deliveryNote?: string) =>
    adminDeliverOrder(token, orderId, deliveryNote),
  listMessages: (token: string, orderId: string) =>
    adminListOrderMessages(token, orderId),
  postMessage: (token: string, orderId: string, message: string) =>
    adminPostOrderMessage(token, orderId, { message }),
  listWarranty: (token: string, orderId: string) =>
    adminListWarrantyRequests(token, orderId),
  resolveWarranty: (
    token: string,
    orderId: string,
    requestId: number,
    input: {
      resolution: "REPLACED" | "REFUNDED" | "REJECTED";
      payload?: string;
      note?: string;
    },
  ) => adminResolveWarranty(token, orderId, requestId, input),
};
