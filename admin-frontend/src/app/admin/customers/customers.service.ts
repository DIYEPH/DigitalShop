import { listShopCustomers, setShopCustomerStatus } from "@/lib/api/shops";

export const customersService = {
  list: (
    token: string,
    shopId: string,
    args: { page?: number; limit?: number; search?: string } = {},
  ) => listShopCustomers(token, shopId, args),
  setStatus: (
    token: string,
    shopId: string,
    userId: number,
    status: "ACTIVE" | "BANNED",
  ) => setShopCustomerStatus(token, shopId, userId, status),
};
