import type { VariantPaymentMethod } from "@/components/admin/payment-method-picker";
import type { AdminVariant } from "@/lib/api/admin";
import type { TABS } from "./product-detail.constants";

export type {
  AdminPlan,
  AdminProductDetail,
  AdminStockItem,
  AdminVariant,
} from "@/lib/api/admin";

export type Category = { id: number; name: string; slug: string };

export type Tab = (typeof TABS)[number];

export type EditableVariant = Partial<AdminVariant> & {
  preorder_limit?: number | null;
  preorder_delivery_hours?: number | null;
  warranty_value?: number | null;
  warranty_unit?: "HOUR" | "DAY" | "MONTH" | "YEAR" | null;
  payment_methods?: VariantPaymentMethod[];
};
