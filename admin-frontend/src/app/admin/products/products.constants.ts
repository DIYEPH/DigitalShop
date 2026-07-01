import type { ProductForm } from "./products.types";

export const emptyProductForm: ProductForm = {
  nameEn: "",
  nameVi: "",
  descriptionEn: "",
  descriptionVi: "",
  imageUrl: "",
  categoryId: "",
};

export function toCategoryName(category: { name_en: string; name_vi: string }) {
  return category.name_en || category.name_vi;
}
