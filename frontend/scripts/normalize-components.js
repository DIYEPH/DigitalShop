const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "../src/components");

function walk(dir, fn) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, fn);
    else fn(p);
  }
}

// 1) .constant.ts -> .constants.ts
walk(root, (p) => {
  if (!p.endsWith(".constant.ts")) return;
  fs.renameSync(p, p.replace(".constant.ts", ".constants.ts"));
});

walk(root, (p) => {
  if (!/\.(ts|tsx)$/.test(p)) return;
  let s = fs.readFileSync(p, "utf8");
  const n = s.replace(/\.constant"/g, '.constants"').replace(/\.constant'/g, ".constants'");
  if (n !== s) fs.writeFileSync(p, n);
});

// 2) remove redundant export default useX at end of hooks
walk(root, (p) => {
  if (!p.endsWith(".hooks.ts")) return;
  let s = fs.readFileSync(p, "utf8");
  const n = s.replace(/\nexport default use[A-Za-z0-9_]+;\s*$/u, "\n");
  if (n !== s) fs.writeFileSync(p, n);
});

// 3) export default function -> export function
walk(root, (p) => {
  if (!p.endsWith(".tsx")) return;
  let s = fs.readFileSync(p, "utf8");
  const n = s.replace(/export default function /g, "export function ");
  if (n !== s) fs.writeFileSync(p, n);
});

// 4) I*Props in layout + events
const layoutDirs = [path.join(root, "layout"), path.join(root, "domain/events")];
for (const dir of layoutDirs) {
  if (!fs.existsSync(dir)) continue;
  walk(dir, (p) => {
    if (!/\.(ts|tsx)$/.test(p)) return;
    let s = fs.readFileSync(p, "utf8");
    let n = s.replace(/interface I([A-Z][A-Za-z0-9]*Props)/g, "interface $1");
    n = n.replace(/\bI(StoreFooter|StoreHeader|StoreShell|StoreTabs|AccountMenu|AuthButton|BalanceWidget|LangSwitcher|ThemeToggle|EventCarouselModal)Props\b/g, "$1Props");
    if (n !== s) fs.writeFileSync(p, n);
  });
}

// 5) index.ts: export { default as X } -> export { X }; export { default } -> named from folder
walk(root, (p) => {
  if (path.basename(p) !== "index.ts") return;
  let s = fs.readFileSync(p, "utf8");
  let n = s.replace(/export \{ default as ([A-Za-z0-9_]+) \}/g, "export { $1 }");
  const folder = path.basename(path.dirname(p));
  const pascal = folder
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join("");
  n = n.replace(/export \{ default \} from "\.\/([^"]+)"/g, (_, file) => {
    const base = file.split("/").pop();
    const name = base
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join("");
    return `export { ${name} } from "./${file}"`;
  });
  if (n !== s) fs.writeFileSync(p, n);
});

// 6) import Default from component paths -> named
const srcRoot = path.join(__dirname, "../src");
walk(srcRoot, (p) => {
  if (!/\.(ts|tsx)$/.test(p)) return;
  let s = fs.readFileSync(p, "utf8");
  const n = s.replace(
    /import ([A-Z][A-Za-z0-9]*) from "((?:\.\.?\/|@\/components\/)[^"]+)"/g,
    'import { $1 } from "$2"',
  );
  if (n !== s) fs.writeFileSync(p, n);
});

console.log("normalize-components done");
