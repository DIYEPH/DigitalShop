import {
  adminConfirmOrder,
  adminDeliverOrder,
  adminListOrderMessages,
  adminListOrders,
  adminPostOrderMessage,
} from "@/lib/api/admin";

export const ordersService = {
  list: (token: string, payment_code?: string) =>
    adminListOrders(token, { page: 1, limit: 50, payment_code }),
  confirm: (token: string, orderId: string) =>
    adminConfirmOrder(token, orderId),
  deliver: (token: string, orderId: string, note?: string) =>
    adminDeliverOrder(token, orderId, note),
  listMessages: (token: string, orderId: string) =>
    adminListOrderMessages(token, orderId),
  postMessage: (token: string, orderId: string, message: string) =>
    adminPostOrderMessage(token, orderId, { message, kind: "TEXT" }),
};
