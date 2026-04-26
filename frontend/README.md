# Hello Summer Store — Frontend

Next.js 16 + React 19 + TailwindCSS storefront for the `digitalshop` Node.js
backend. Server-rendered, fully typed (TypeScript) and SEO-friendly with
Vietnamese / English locales and VND / USD pricing.

## Features

- **SEO / SSR** — everything under `/app/**` uses React Server Components;
  product pages emit full OpenGraph metadata.
- **i18n** — URL-based locales `/vi/*` and `/en/*`, dictionaries in
  `src/lib/i18n/dictionaries/*.json`.
- **Region detection** — `src/lib/region/detect.ts` reads `X-Country`,
  `CF-IPCountry`, Vercel geo headers, and falls back to `Accept-Language`.
- **Backend integration** — typed `apiFetch` client in `src/lib/api/*`
  talks to the Express API, forwarding `X-Country` so the backend returns
  localized name / description + the correct currency.
- **Products** — listing page with pagination and category filter; detail
  page with localized content and structured metadata.
- **Cart** — client-side, persisted in `localStorage`
  (`src/lib/cart/CartProvider.tsx`), with a live count badge on the nav tab.
- **Checkout** — country-scoped payment methods:
  - `VN` → Bank transfer (VND) · USDT · Binance Pay
  - Elsewhere → USDT · Binance Pay
- **Performance** — `next/image` with `priority` for the hero,
  `fetch`-level caching (`revalidate: 60` for products, `300` for
  categories), route-segment static generation for `[lang]`.

## Folder structure

```text
frontend/
├─ public/
│  └─ banner.png                      # summer hero asset
├─ src/
│  ├─ app/
│  │  ├─ layout.tsx                   # root <html>
│  │  ├─ page.tsx                     # redirect to /vi or /en by country
│  │  ├─ globals.css                  # mixus-* design system
│  │  └─ [lang]/
│  │     ├─ layout.tsx                # validates locale, wraps CartProvider
│  │     ├─ page.tsx                  # home (banner + featured)
│  │     ├─ products/
│  │     │  ├─ page.tsx               # listing + pagination + filter
│  │     │  └─ [id]/page.tsx          # localized product detail
│  │     ├─ cart/page.tsx
│  │     └─ checkout/page.tsx
│  ├─ components/
│  │  ├─ layout/                      # StoreShell, StoreHeader, StoreTabs, LangSwitcher
│  │  ├─ store/                       # StoreHero, CategoryChips, ProductCard, ...
│  │  ├─ cart/                        # CartBadge, CartItemList
│  │  └─ checkout/CheckoutForm.tsx
│  ├─ lib/
│  │  ├─ api/                         # typed clients: products, categories, orders
│  │  ├─ i18n/                        # config + dictionaries + types
│  │  ├─ region/                      # country detection + payments policy
│  │  ├─ cart/                        # CartProvider + types
│  │  └─ utils/                       # formatPrice, cn
│  └─ types/                          # api, product, category, order
├─ next.config.mjs                    # /api/* rewrite to backend, image config
├─ tsconfig.json
└─ .env.local
```

## Environment

`.env.local`:

```env
API_ORIGIN=http://localhost:3000
NEXT_PUBLIC_API_ORIGIN=http://localhost:3000
# FORCE_COUNTRY=VN   # optional override for local testing
```

## Scripts

```bash
npm run dev        # http://localhost:4000
npm run build
npm run start
npm run typecheck
```

The backend must be reachable at `API_ORIGIN` (defaults to
`http://localhost:3000`). Requests from the browser go through Next.js's
`/api/*` rewrite, server components fetch the backend directly.

## Routing map

| URL                            | Content                                          |
| ------------------------------ | ------------------------------------------------ |
| `/`                            | 307 → `/vi` or `/en` (country-based)             |
| `/vi` · `/en`                  | Home: hero + categories + featured products      |
| `/{lang}/products`             | Listing w/ `?category=` and `?page=`             |
| `/{lang}/products/{id}`        | Product detail (localized, indexable)            |
| `/{lang}/cart`                 | Cart (client-rendered from `localStorage`)       |
| `/{lang}/checkout`             | Checkout w/ region-scoped payment methods        |

## API integration example

```ts
// src/lib/api/products.ts
import { apiFetch, apiFetchWithPagination } from "./client";

export async function listProducts({ lang, page = 1, limit = 5, categoryId }) {
  const qs = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (categoryId) qs.set("category_id", String(categoryId));

  const { data, pagination } = await apiFetchWithPagination(
    `/api/products?${qs}`,
    { lang, next: { revalidate: 60, tags: [`products:${categoryId ?? "all"}`] } },
  );
  return { items: data, pagination };
}
```

`apiFetch` forwards `X-Country` (derived from the URL locale) so the backend
localizes name / description and returns the right currency (VND for `vi`,
USD for `en`).
