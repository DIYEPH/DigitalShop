import Link from "next/link";
import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import type { Category } from "@/types/category";
import { routePath } from "@/lib/i18n/routes";
import { cn } from "@/lib/utils/cn";
import type { CategoryChipsProps } from "./category-chips.types";

const PALETTE = ["", "store-pill-blue", "store-pill-pink", "store-pill-green"];

export function CategoryChips({ lang, dict, categories, selectedSlug }: CategoryChipsProps) {
  return (
    <div className="grid grid-cols-2 gap-stack-comfortable sm:grid-cols-4">
      <Link href={`/${lang}/products`} className={cn("store-pill", !selectedSlug && "store-pill-active")}>
        {dict.categories.all}
      </Link>
      {categories.map((cat, idx) => (
        <Link
          key={cat.id}
          href={routePath(lang, "category", cat.slug)}
          className={cn("store-pill", PALETTE[(idx + 1) % PALETTE.length], cat.slug === selectedSlug && "store-pill-active")}
        >
          {cat.name}
        </Link>
      ))}
    </div>
  );
}
