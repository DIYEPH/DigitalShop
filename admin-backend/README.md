# Admin Backend - DigitalShop

REST API cho admin web. NestJS + `pg` (shared PostgreSQL với `backend-nestjs`).

## Quick start

```bash
npm install
cp .env.example .env   # PORT=3000, DATABASE_URL, JWT_SECRET
npm run start:dev
```

| | URL |
|---|-----|
| API | `http://localhost:3000/api/admin/v1` |
| Login | `POST /api/admin/v1/auth/login` |
| Ping | `GET /ping` |
| Swagger | `http://localhost:3000/api/admin/docs` |

**Admin login (sau `db:seed` ở backend-nestjs):** `admin@digitalshop.dev` / `password`

## Trạng thái

Xem **[docs/IMPLEMENTATION_STATUS.md](./docs/IMPLEMENTATION_STATUS.md)** — **Auth, Products, Categories, Stock, Orders v1**.

**Cursor rules:** `.cursor/rules/admin-backend-*.mdc`

## Tài liệu

- [docs/CHAT_HANDOFF.md](../docs/CHAT_HANDOFF.md) — tóm tắt phiên chat / handoff cho AI
- [docs/README.md](./docs/README.md) — tổng quan
- [docs/features/](./docs/features/) — spec từng module
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)
- [docs/API_STANDARDS.md](./docs/API_STANDARDS.md)
- [docs/DEVELOPMENT.md](./docs/DEVELOPMENT.md)

## Integration

- **admin-frontend:** `NEXT_PUBLIC_API_ORIGIN=http://localhost:3000`, gọi `/api/admin/v1/...`
- **backend-nestjs:** cùng DB; schema/seed từ repo đó
