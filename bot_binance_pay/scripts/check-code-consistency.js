#!/usr/bin/env node
/**
 * Fails CI/dev if forbidden "dual path" patterns exist in bot src.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'src');

const RULES = [
  {
    name: 'parallel-string-alias',
    pattern: /===\s*['"][^'"]+['"]\s*\|\|\s*===\s*['"]/,
  },
  {
    name: 'api-error-message-chain',
    pattern: /apiError\?\.(message|code)\s*\|\|/,
  },
  {
    name: 'mapped-error-chain',
    pattern: /map\w+Error\([^)]+\)\s*\|\|\s*apiError/,
  },
  {
    name: 'coin-display-alias',
    pattern: /['"]Coin['"]/,
  },
  {
    name: 'xu-locale-hardcode',
    pattern: /\b[xX]u\b|\bXU\s+FREE\b/,
  },
  {
    name: 'format-price-point',
    pattern: /formatPrice\([^)]+,\s*['"]Point['"]\)/,
  },
  {
    name: 'boolean-not-false',
    pattern: /!==\s*false/,
  },
];

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full, files);
    } else if (name.endsWith('.js')) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

for (const file of walk(SRC)) {
  const rel = path.relative(path.join(__dirname, '..'), file);
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        violations.push({ file: rel, line: idx + 1, rule: rule.name, text: line.trim() });
      }
    }
  });
}

if (violations.length) {
  console.error('check:consistency FAILED\n');
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

console.log('check:consistency OK');
