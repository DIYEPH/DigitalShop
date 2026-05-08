import type { ProductPlan } from "@/types/product";

export type PlanPickerProps = {
  plans: ProductPlan[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  label: string;
};
