import { adminGetOrder } from "@/lib/api/admin";

export const orderDetailService = {
  get: (token: string, orderId: string) => adminGetOrder(token, orderId),
};
