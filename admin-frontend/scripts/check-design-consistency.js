#!/usr/bin/env node
/**
 * Fails if admin UI violates design rules (emoji, hardcoded colors, raw palettes).
 * Scope: every source file under src/.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SRC = path.join(ROOT, "src");
const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u;

const SCOPED = [SRC];
const ROUTER_REPLACE_PAGE_ALLOWLIST = new Set(["src/app/login/page.tsx"]);

const RULES = [
  {
    name: "hardcoded-hex-in-tsx",
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    files: [".tsx", ".ts"],
    skipBasenames: ["rich-editor-colors.ts"],
  },
  {
    name: "tailwind-zinc-palette",
    pattern: /\b(?:bg|text|border|ring|from|to|via)-zinc-\d+/,
    files: [".tsx"],
  },
  {
    name: "tailwind-gray-palette",
    pattern: /\b(?:bg|text|border)-gray-\d+/,
    files: [".tsx"],
  },
  {
    name: "tailwind-rose-palette",
    pattern: /\b(?:bg|text|border)-rose-\d+/,
    files: [".tsx"],
  },
  {
    name: "tailwind-red-palette",
    pattern: /\b(?:bg|text|border)-red-\d+/,
    files: [".tsx"],
  },
  {
    name: "tailwind-blue-palette",
    pattern: /\b(?:bg|text|border)-blue-\d+/,
    files: [".tsx"],
  },
  {
    name: "tailwind-white-palette",
    pattern: /\b(?:bg|text|border)-white\b/,
    files: [".tsx"],
  },
  {
    name: "tailwind-var-shadow-old-syntax",
    pattern: /\bshadow-\[var\(--/,
    files: [".tsx"],
  },
  {
    name: "tailwind-var-radius-old-syntax",
    pattern: /\brounded-\[var\(--radius-/,
    files: [".tsx", ".ts"],
  },
  {
    name: "tailwind-var-color-old-syntax",
    pattern: /\b(?:bg|border|fill|ring|stroke|text)-\[var\(--/,
    files: [".tsx", ".ts"],
  },
  {
    name: "tailwind-color-mix-arbitrary-class",
    pattern: /\b(?:bg|border|ring|text)-\[color-mix\(/,
    files: [".tsx", ".ts"],
  },
  {
    name: "tailwind-empty-arbitrary-variant",
    pattern: /\[&:empty\]:/,
    files: [".tsx", ".ts"],
  },
  {
    name: "raw-form-control-outside-ui",
    test: (line, file) =>
      !file.includes(`${path.sep}components${path.sep}ui${path.sep}`) &&
      /<\/?button\b|<input\b/.test(line),
    files: [".tsx"],
  },
  {
    name: "chat-emoji",
    test: (line) => EMOJI_RE.test(line),
    files: [".tsx"],
  },
];

function isScoped(file) {
  const normalized = path.normalize(file);
  return SCOPED.some((entry) => {
    if (entry.endsWith(".tsx")) return normalized === path.normalize(entry);
    return (
      normalized.startsWith(path.normalize(entry + path.sep)) ||
      normalized === path.normalize(entry)
    );
  });
}

function walk(dir, files = []) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    if (fs.statSync(full).isDirectory()) {
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

function toPosixPath(file) {
  return file.split(path.sep).join("/");
}

function isAppPage(file) {
  return (
    file.includes(`${path.sep}app${path.sep}`) &&
    path.basename(file) === "page.tsx"
  );
}

const violations = [];

for (const file of walk(SRC)) {
  if (!isScoped(file)) continue;
  if (file.includes(`${path.sep}app${path.sep}globals.css`)) continue;

  const ext = path.extname(file);
  const basename = path.basename(file);

  const rel = path.relative(ROOT, file);
  const relPosix = toPosixPath(rel);
  const content = fs.readFileSync(file, "utf8");
  const lines = content.split("\n");

  if (
    isAppPage(file) &&
    !ROUTER_REPLACE_PAGE_ALLOWLIST.has(relPosix) &&
    content.includes("router.replace(")
  ) {
    const line = lines.findIndex((item) => item.includes("router.replace("));
    violations.push({
      file: rel,
      line: line + 1,
      rule: "redirect-only-page",
      text: "Do not add redirect-only route pages. Link to the canonical route or use middleware/layout guards.",
    });
  }

  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      if (rule.files && !rule.files.includes(ext)) continue;
      if (rule.skipBasenames?.includes(basename)) continue;
      const hit = rule.test ? rule.test(line, file) : rule.pattern.test(line);
      if (hit) {
        violations.push({
          file: rel,
          line: idx + 1,
          rule: rule.name,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length) {
  console.error("check:design FAILED (scope: src/**/*.{ts,tsx})\n");
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.file}:${v.line}`);
    console.error(`    ${v.text}\n`);
  }
  process.exit(1);
}

console.log("check:design OK (scope: src/**/*.{ts,tsx})");
