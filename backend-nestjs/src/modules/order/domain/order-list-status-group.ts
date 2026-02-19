export const ORDER_LIST_STATUS_GROUPS = ['completed', 'pending', 'cancelled'] as const;

export type OrderListStatusGroup = (typeof ORDER_LIST_STATUS_GROUPS)[number];

export function sqlStatusesForOrderListGroup(
  group: OrderListStatusGroup,
): readonly string[] {
  switch (group) {
    case 'pending':
      return ['PENDING'];
    case 'cancelled':
      return ['CANCELLED'];
    case 'completed':
      return ['DELIVERED', 'PAID'];
    default:
      return [];
  }
}
