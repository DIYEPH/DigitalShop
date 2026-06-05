# Cấu trúc `src/components`

## Tầng (từ nhỏ → lớn)

```
components/
├── ui/              # Primitives — không business logic, không fetch
├── layout/          # Shell: header, footer, tabs, hotbar
├── domain/          # Business UI theo nghiệp vụ
├── screens/         # Composition page-level (chỉ khi có logic view thật)
└── STRUCTURE.md     # File này
```

## `ui/` — mỗi primitive một folder

```
ui/
├── button/
├── card/
├── form-field/
├── input/
├── quantity-stepper/
├── radio-card/
├── select/
├── status-badge/
└── index.ts         # Public barrel
```

Quy ước mỗi folder:

- `<name>.tsx` — **named export** (`export function Name`), không `export default`
- `<name>.module.scss`
- `index.ts` — re-export public API
- `*.types.ts` — `XxxProps` (không prefix `I`)
- `*.constants.ts` — luôn số nhiều (không `.constant.ts`)
- `*.hooks.ts` — chỉ khi có React state/effect/context thật; named `export function useXxx`, không `export default`
- Không tạo hook rỗng, hook chỉ wrap helper thuần, hoặc hook chỉ để gọi một function không dùng React API.
- Shared hook nằm theo domain hạ tầng: `lib/auth/use-auth-token.ts`, `lib/cart/use-checkout.ts`.

## `domain/`

| Folder | Nội dung |
|--------|----------|
| `catalog/` | Product, grid, sidebar, hero (trước đây `store/`) |
| `cart/` | Giỏ hàng |
| `checkout/` | Form thanh toán |
| `orders/` | Danh sách + chi tiết đơn |
| `payment/` | Trang/chi tiết thanh toán |
| `account/` | Profile, password |
| `billing/` | Top-up |
| `auth/` | SCSS shared auth |
| `events/` | Modal sự kiện |

## `screens/`

Chỉ giữ screen có composition thật. Route đơn giản import thẳng `domain/**`.

| Screen | Ghi chú |
|--------|---------|
| `home/`, `product/`, `categories/`, `promotions/` | Có layout/composition |
| `auth/` | Login/register pages + forms |
| `cart/`, `checkout/` | Wrapper heading + domain form |

Không tạo screen chỉ để re-export domain.

## Thứ tự chuẩn hóa (đang làm)

1. **Cấu trúc** — xóa folder rỗng, ghi doc
2. **`ui/`** — folder + index từng primitive
3. **`layout/`** — naming/export thống nhất
4. **`domain/`** — leaf components trước (badge, chip, card…), composite sau

## Import

- Barrel: `@/components/ui`, `@/components/domain/cart`
- Tránh import chéo tầng: `ui` không import `domain`
- Alias: `@/lib/...`, `@/components/...`
