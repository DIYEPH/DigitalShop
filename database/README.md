# DigitalShop Database

This project owns the shared PostgreSQL schema for `backend-bot`, `admin-backend`, `backend-web`, and `backend-batch`.

Markdown docs in this project are written in English by default. Vietnamese notes can be added as a separate optional section when needed.

## Scripts

```bash
npm run db:init
npm run db:reset
npm run db:migrate
npm run db:status
```

- `db:init`: applies `init.sql` to an empty database.
- `db:reset`: drops and recreates the `public` schema, then applies `init.sql`.
- `db:migrate`: applies future SQL migrations from `migrations/`.
- `db:status`: prints migration status.

## Schema Direction

The current baseline is multi-shop only.

Core tenant tables:

- `shops`: tenant root.
- `shop_members`: admin membership per shop.
- `shop_categories`: selected shared categories per shop.
- `shop_payment_credentials`: encrypted payment credentials per shop.
- `user_shop_balances`: balance per `user_id + shop_id`.
- `telegram_bots`: bot secret mapped to a shop.

Shop-scoped business tables:

- `products`
- `coupons`
- `orders`
- `balance_topups`
- `order_messages`

Shop-scoped unique keys:

- `products`: `(shop_id, slug)`.
- `coupons`: `(shop_id, code)`.
- `orders`: `(shop_id, payment_code)` when `payment_code IS NOT NULL`.
- `balance_topups`: `(shop_id, payment_code)`.

`tx_id` remains globally unique because an external transaction must never be counted twice across shops.

## Tenant Context

Do not trust `shop_id` from arbitrary request bodies.

- Admin APIs resolve active shop from authenticated user membership and `X-Shop-Id`.
- Bot APIs resolve shop from `telegram_bots.secret_hash`.
- Future storefront APIs resolve shop from domain, subdomain, or shop slug.

Repository methods should receive tenant context explicitly and scope reads/writes with `shop_id`.

## Payment Ownership

Payment belongs to the shop that sells the product. The platform records and reports payment state only; the seller receives money directly.

Expected flow:

1. Buyer creates an order or topup inside a shop.
2. Backend loads active credentials from `shop_payment_credentials`.
3. Payment instructions display that shop's Binance, bank, SePay, or crypto destination.
4. Sync jobs poll pending payments per `shop_id + payment_method`.
5. Confirmed topups credit `user_shop_balances(user_id, shop_id)`.
6. Balance checkout debits `user_shop_balances`, not global user balance columns.

## Dev Flow

```bash
cd backend-bot
npm run db:fresh
```

This resets the shared schema, seeds default dev data, and runs the migration runner for future migrations.
