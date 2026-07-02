#!/usr/bin/env node
/**
 * Verifies every t('key') used in src exists in all locale packs,
 * and reports locale keys no longer referenced by code.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');
const packs = {
  en: require('../src/locales/en'),
  vi: require('../src/locales/vi'),
  ru: require('../src/locales/ru'),
  zh: require('../src/locales/zh'),
};

// Dynamic key templates expanded to their known value sets.
const DYNAMIC_EXPANSIONS = {
  'order_status_icons.${key}': ['pending', 'paid', 'completed', 'cancelled'].map(
    (k) => `order_status_icons.${k}`,
  ),
  'coupon_cannot_${item.cannot_use_reason}': [
    'inactive',
    'not_started',
    'expired',
    'wrong_variant',
    'limit_exceeded',
  ].map((k) => `coupon_cannot_${k}`),
};

// Keys referenced through variables rather than literals.
const INDIRECT_KEYS = [
  'history_title', 'history_title_completed', 'history_title_pending', 'history_title_cancelled',
  'my_coupons_title_active', 'my_coupons_title_used',
  'topup_success', 'topup_success_vnd',
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) walk(full, files);
    else if (name.endsWith('.js') && !full.includes('locales')) files.push(full);
  }
  return files;
}

const usedKeys = new Set(INDIRECT_KEYS);
const unknownDynamic = [];
for (const file of walk(SRC)) {
  const text = fs.readFileSync(file, 'utf8');
  const rel = path.relative(SRC, file);
  for (const m of text.matchAll(/\bt\(\s*'([^']+)'/g)) usedKeys.add(m[1]);
  for (const m of text.matchAll(/\bt\(\s*`([^`]+)`/g)) {
    const tpl = m[1];
    if (DYNAMIC_EXPANSIONS[tpl]) DYNAMIC_EXPANSIONS[tpl].forEach((k) => usedKeys.add(k));
    else if (!tpl.includes('${')) usedKeys.add(tpl);
    else unknownDynamic.push(`${rel}: ${tpl}`);
  }
}

function get(pack, key) {
  return key.split('.').reduce((o, k) => o?.[k], pack);
}

function flatten(obj, prefix = '') {
  const out = [];
  for (const [k, v] of Object.entries(obj)) {
    if (k.startsWith('_')) continue;
    const full = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v) out.push(...flatten(v, full));
    else out.push(full);
  }
  return out;
}

let failed = false;

for (const key of [...usedKeys].sort()) {
  const absent = Object.entries(packs)
    .filter(([, pack]) => get(pack, key) == null)
    .map(([code]) => code);
  if (absent.length) {
    console.error(`MISSING ${key} in: ${absent.join(', ')}`);
    failed = true;
  }
}

for (const line of unknownDynamic) {
  console.error(`UNKNOWN DYNAMIC KEY (add to DYNAMIC_EXPANSIONS): ${line}`);
  failed = true;
}

const unused = flatten(packs.en).filter((k) => !usedKeys.has(k));
if (unused.length) {
  console.error(`UNUSED locale keys (${unused.length}):\n  ${unused.join('\n  ')}`);
  failed = true;
}

if (failed) {
  console.error('\ncheck:locales FAILED');
  process.exit(1);
}
console.log(`check:locales OK (${usedKeys.size} keys, ${Object.keys(packs).length} locales)`);
