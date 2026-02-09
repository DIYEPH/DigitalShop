const path = require('node:path');
const { Client } = require('pg');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

function assertSafeEnvironment() {
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_PROD_DB_SCRIPTS !== 'true') {
    throw new Error('Refusing to run DB seed in production without ALLOW_PROD_DB_SCRIPTS=true');
  }
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required');
  }
}

async function upsertUser(client, user) {
  const result = await client.query(
    `INSERT INTO users (
        email, telegram_id, username, language, full_name, password, topup_code,
        role, balance_usdt, balance_vnd, balance_point, referral_code, status
      )
      VALUES ($1, $2, $3, $4::language_enum, $5, $6, $7, $8::role_enum, $9, $10, $11, $12, 'ACTIVE')
      ON CONFLICT (telegram_id) DO UPDATE SET
        email = EXCLUDED.email,
        username = EXCLUDED.username,
        language = EXCLUDED.language,
        full_name = EXCLUDED.full_name,
        password = EXCLUDED.password,
        role = EXCLUDED.role,
        balance_usdt = EXCLUDED.balance_usdt,
        balance_vnd = EXCLUDED.balance_vnd,
        balance_point = EXCLUDED.balance_point,
        status = 'ACTIVE',
        updated_at = NOW()
      RETURNING id`,
    [
      user.email,
      user.telegramId,
      user.username,
      user.language,
      user.fullName,
      user.password,
      `TG${user.telegramId}`,
      user.role,
      user.balanceUsdt,
      user.balanceVnd,
      user.balancePoint,
      user.referralCode,
    ],
  );
  return result.rows[0].id;
}

async function seedCatalog(client) {
  const category = await client.query(
    `INSERT INTO categories (name_en, name_vi, slug, emoji_id, sort_order, description_en, description_vi)
      VALUES ('Software Accounts', 'Tai khoan phan mem', 'software-accounts', 'PC', 1, 'Digital software accounts', 'Tai khoan phan mem so')
      ON CONFLICT (slug) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_vi = EXCLUDED.name_vi,
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id`,
  );

  const product = await client.query(
    `INSERT INTO products (category_id, name_en, name_vi, description_en, description_vi, slug, emoji_id)
      VALUES ($1, 'Canva Pro', 'Canva Pro', 'Canva Pro account', 'Tai khoan Canva Pro', 'canva-pro', 'ART')
      ON CONFLICT (slug) DO UPDATE SET
        category_id = EXCLUDED.category_id,
        name_en = EXCLUDED.name_en,
        name_vi = EXCLUDED.name_vi,
        description_en = EXCLUDED.description_en,
        description_vi = EXCLUDED.description_vi,
        updated_at = NOW()
      RETURNING id`,
    [category.rows[0].id],
  );

  const plan = await client.query(
    `INSERT INTO product_plans (product_id, name_en, name_vi, slug, sort_order, is_active)
      VALUES ($1, 'Pro', 'Pro', 'pro', 1, TRUE)
      ON CONFLICT (product_id, slug) DO UPDATE SET
        name_en = EXCLUDED.name_en,
        name_vi = EXCLUDED.name_vi,
        sort_order = EXCLUDED.sort_order,
        is_active = TRUE,
        updated_at = NOW()
      RETURNING id`,
    [product.rows[0].id],
  );

  const existingVariant = await client.query(
    `SELECT id FROM product_variants WHERE product_id = $1 AND plan_id = $2 AND name_en = '30 Days' LIMIT 1`,
    [product.rows[0].id, plan.rows[0].id],
  );

  const variant = existingVariant.rows[0]
    ? await client.query(
        `UPDATE product_variants
          SET name_vi = 'Canva Pro 30 Ngay',
              fulfillment_type = 'IN_STOCK',
              preorder_limit = NULL,
              preorder_delivery_hours = NULL,
              warranty_type = 'LOGIN',
              warranty_value = 30,
              warranty_unit = 'DAY',
              is_active = TRUE,
              sort_order = 1,
              payment_methods = ARRAY['BINANCE','BALANCE','BALANCE_VND','CRYPTO','BANK']::product_payment_method_enum[],
              amount_usdt = 4.99,
              amount_vnd = 129000,
              updated_at = NOW()
          WHERE id = $1
          RETURNING id`,
        [existingVariant.rows[0].id],
      )
    : await client.query(
        `INSERT INTO product_variants (
            product_id, plan_id, name_en, name_vi, fulfillment_type, warranty_type,
            warranty_value, warranty_unit, is_active, sort_order, payment_methods, amount_usdt, amount_vnd
          )
          VALUES (
            $1, $2, '30 Days', 'Canva Pro 30 Ngay', 'IN_STOCK', 'LOGIN',
            30, 'DAY', TRUE, 1,
            ARRAY['BINANCE','BALANCE','BALANCE_VND','CRYPTO','BANK']::product_payment_method_enum[],
            4.99, 129000
          )
          RETURNING id`,
        [product.rows[0].id, plan.rows[0].id],
      );

  return variant.rows[0].id;
}

async function seedStock(client, variantId) {
  for (const payload of [
    'seed-canva-01@example.com|password-01',
    'seed-canva-02@example.com|password-02',
    'seed-canva-03@example.com|password-03',
    'seed-canva-04@example.com|password-04',
  ]) {
    await client.query(
      `INSERT INTO stock_items (variant_id, status, is_locked, payload, note)
        SELECT $1, 'AVAILABLE', FALSE, $2, 'seed'
        WHERE NOT EXISTS (SELECT 1 FROM stock_items WHERE variant_id = $1 AND payload = $2)`,
      [variantId, payload],
    );
  }
}

async function upsertCoupon(client, coupon) {
  const result = await client.query(
    `INSERT INTO coupons (
        code, variant_id, is_active, visibility, requires_ownership, discount_type,
        percent_bps, amount_usdt, amount_vnd, cost_point, max_redemptions, per_user_limit
      )
      VALUES ($1, $2, TRUE, $3::coupon_visibility_enum, $4, $5::coupon_discount_type_enum, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (code) DO UPDATE SET
        variant_id = EXCLUDED.variant_id,
        is_active = TRUE,
        visibility = EXCLUDED.visibility,
        requires_ownership = EXCLUDED.requires_ownership,
        discount_type = EXCLUDED.discount_type,
        percent_bps = EXCLUDED.percent_bps,
        amount_usdt = EXCLUDED.amount_usdt,
        amount_vnd = EXCLUDED.amount_vnd,
        cost_point = EXCLUDED.cost_point,
        max_redemptions = EXCLUDED.max_redemptions,
        per_user_limit = EXCLUDED.per_user_limit,
        updated_at = NOW()
      RETURNING id`,
    [
      coupon.code,
      coupon.variantId,
      coupon.visibility,
      coupon.requiresOwnership,
      coupon.discountType,
      coupon.percentBps,
      coupon.amountUsdt,
      coupon.amountVnd,
      coupon.costPoint,
      coupon.maxRedemptions,
      coupon.perUserLimit,
    ],
  );
  return result.rows[0].id;
}

async function seedCoupons(client, variantId, userId) {
  const definitions = [
    ['WELCOME10', 'PUBLIC', false, 'PERCENT', 1000, null, null, 0],
    ['E2E_VIP10', 'PRIVATE', true, 'PERCENT', 2000, null, null, 0],
    ['E2E_SHOP5', 'PRIVATE', true, 'PERCENT', 500, null, null, 10],
    ['E2E_PROMO15', 'PRIVATE', false, 'PERCENT', 1500, null, null, 0],
    ['E2E_FIXED5', 'PUBLIC', false, 'FIXED', null, 1, 10000, 0],
  ];
  const couponIds = new Map();

  for (const [code, visibility, requiresOwnership, discountType, percentBps, amountUsdt, amountVnd, costPoint] of definitions) {
    const id = await upsertCoupon(client, {
      code,
      variantId,
      visibility,
      requiresOwnership,
      discountType,
      percentBps,
      amountUsdt,
      amountVnd,
      costPoint,
      maxRedemptions: null,
      perUserLimit: null,
    });
    couponIds.set(code, id);
  }

  await client.query(
    `INSERT INTO user_coupons (user_id, coupon_id)
      SELECT $1, $2
      WHERE NOT EXISTS (
        SELECT 1 FROM user_coupons WHERE user_id = $1 AND coupon_id = $2 AND used_at IS NULL
      )`,
    [userId, couponIds.get('E2E_VIP10')],
  );
}

async function main() {
  assertSafeEnvironment();
  const adminTelegramId = Number(process.env.SEED_ADMIN_TELEGRAM_ID || 900000001);
  const userTelegramId = Number(process.env.SEED_USER_TELEGRAM_ID || 900000002);
  const client = new Client({ connectionString: process.env.DATABASE_URL });

  await client.connect();
  try {
    await client.query('BEGIN');
    await upsertUser(client, {
      email: 'admin@digitalshop.dev',
      telegramId: adminTelegramId,
      username: 'seed_admin',
      language: 'EN',
      fullName: 'Seed Admin',
      password: 'password',
      role: 'ADMIN',
      balanceUsdt: 1000,
      balanceVnd: 1000000,
      balancePoint: 0,
      referralCode: 'ADMINREF',
    });
    const userId = await upsertUser(client, {
      email: 'user@digitalshop.dev',
      telegramId: userTelegramId,
      username: 'seed_user',
      language: 'EN',
      fullName: 'Seed User',
      password: 'password',
      role: 'USER',
      balanceUsdt: 50,
      balanceVnd: 200000,
      balancePoint: 100,
      referralCode: 'USERREF',
    });
    const variantId = await seedCatalog(client);
    await seedStock(client, variantId);
    await seedCoupons(client, variantId, userId);
    await client.query('COMMIT');
    console.log('Database seed complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
