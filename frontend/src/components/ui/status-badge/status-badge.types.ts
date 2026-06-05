import type { OrderStatus } from "@/types/order";

export type StatusBadgeProps = {
  status: OrderStatus | string;
  className?: string;
};
