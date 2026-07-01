export const TABS = ["Thông tin", "Gói", "Biến thể", "Kho"] as const;

export function toCategoryName(category: { name_en: string; name_vi: string }) {
  return category.name_en || category.name_vi;
}

export function stockStatusVariant(status: string) {
  if (status === "AVAILABLE") return "success";
  if (status === "RESERVED") return "accent";
  return "secondary";
}
