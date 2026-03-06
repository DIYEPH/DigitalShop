# DigitalShop Backend Web

Public storefront backend API for the `frontend` Next.js app.

This project is intentionally separate from:

- `backend-nestjs`: bot/internal API, currently exposes Telegram/Bot routes that may require `x-bot-secret`.
- `admin-backend`: admin panel API with admin-only contracts.
- `backend-batch`: batch/background worker concerns.

## Scope

`backend-web` owns public customer-facing web APIs:

- Catalog and category browsing.
- Email/password auth for storefront users.
- Profile, password, daily login points.
- Cart checkout, order quote, order creation.
- Order detail, payment instruction, messages, warranty request.
- Wallet/top-up and balance payment.
- Coupons, promotions, SMS rental entry points.
- Region/i18n response localization.

## Runtime Contract

- Base path: `/api`
- Default port: `3002`
- Frontend rewrite target: `API_ORIGIN=http://localhost:3002`
- Auth header: `Authorization: Bearer <jwt>`
- Region header: `X-Country`, currently `VN` or `US`
- Field naming: snake_case, aligned with DB/API/frontend types

## Development

```bash
cd backend-web
npm install
cp .env.example .env
npm run start:dev
```

Health check:

```bash
curl http://localhost:3002/api/health
```

## Documentation

- `docs/ARCHITECTURE.md`: module boundaries and layering.
- `docs/API_STANDARDS.md`: response format, errors, auth, pagination.
- `docs/DEVELOPMENT.md`: local setup and verification.
- `docs/IMPLEMENTATION_STATUS.md`: current delivery checklist.
- `docs/features/*.md`: detailed contract by storefront function.

Docs are part of the implementation contract. If an endpoint shape changes, update the matching feature MD and frontend type/client in the same change.
