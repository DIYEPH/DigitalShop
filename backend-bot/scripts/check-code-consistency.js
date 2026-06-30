#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const SCOPES = [path.join(ROOT, 'src'), path.join(ROOT, 'docs')];
const EXTENSIONS = new Set(['.ts', '.md']);

const RULES = [
  {
    name: 'avoid-not-false-boolean',
    pattern: /!==\s*false/,
    message: 'Use explicit === true / === false checks instead of !== false.',
    allow: (line) => line.toLowerCase().includes('không '),
  },
  {
    name: 'point-terminology-xu',
    pattern: /(^|[^A-Za-zÀ-ỹ])xu([^A-Za-zÀ-ỹ]|$)/i,
    message: 'Use point terminology for balance_point/cost_point, not xu.',
    allow: (line) => line.toLowerCase().includes('không '),
  },
  {
    name: 'point-terminology-coin',
    pattern: /\bcoins?\b/i,
    message: 'Use point terminology for balance_point/cost_point, not Coin.',
    allow: (line) => line.toLowerCase().includes('không '),
  },
  {
    name: 'point-terminology-credits',
    pattern: /\bcredits\b/i,
    message: 'Use point terminology for balance_point/cost_point, not credits.',
    allow: (line) =>
      line.toLowerCase().includes('không ') || line.includes('creditsSpentCoin'),
  },
];

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
    } else if (EXTENSIONS.has(path.extname(full))) {
      files.push(full);
    }
  }
  return files;
}

const violations = [];

for (const scope of SCOPES) {
  for (const file of walk(scope)) {
    const rel = path.relative(ROOT, file);
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, index) => {
      for (const rule of RULES) {
        if (rule.allow?.(line, file)) continue;
        if (!rule.pattern.test(line)) continue;
        violations.push({
          file: rel,
          line: index + 1,
          rule: rule.name,
          message: rule.message,
          text: line.trim(),
        });
      }
    });
  }
}

if (violations.length > 0) {
  console.error('check:consistency FAILED\n');
  for (const violation of violations) {
    console.error(`  [${violation.rule}] ${violation.file}:${violation.line}`);
    console.error(`    ${violation.message}`);
    console.error(`    ${violation.text}\n`);
  }
  process.exit(1);
}

console.log('check:consistency OK');
