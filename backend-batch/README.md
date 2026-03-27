# DigitalShop Backend Batch

NestJS one-shot maintenance jobs.

## Clean cancelled orders

Deletes cancelled orders older than `CANCELLED_ORDER_RETENTION_DAYS` days, using raw SQL inside one transaction.

Safety rules:

- only `orders.status = CANCELLED`
- older than the retention window, default `2` days
- no `payment_info.transaction_hash`
- no delivered stock item attached to the order
- reserved stock is released before deleting the order
- attached user coupons are restored before deleting the order

```bash
npm run clean:cancelled-orders:dry-run
npm run clean:cancelled-orders
```
