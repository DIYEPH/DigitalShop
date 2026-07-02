# DigitalShop Seller Admin Frontend

This app is the seller-facing admin UI.

## Backend Boundary

- Seller admin API: `admin-backend`
- Platform admin/support API: `platform-admin-backend`

## Seller Flow

1. Seller logs in.
2. If the user has shops, the UI requires an active shop selection and sends `X-Shop-Id`.
3. If the user has no shop but `can_create_shop = true`, show shop onboarding.
4. If the user has no shop and no creation permission, show an access-pending state.

## Out of Scope

This app should not expose platform-wide user management, global category CRUD, support actions, or cross-shop reporting. Those belong in a separate platform admin UI.
