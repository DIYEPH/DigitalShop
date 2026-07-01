"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { useLanguage } from "@/lib/i18n/use-language";
import { getActiveShopId } from "@/lib/shop-context";
import { emptyProductForm, toCategoryName } from "./products.constants";
import { productsService } from "./products.service";
import type { Category, Product, ProductForm } from "./products.types";

export function useProducts() {
  const token = useAdminToken();
  const { t } = useLanguage();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<ProductForm>(emptyProductForm);

  const loadProducts = async () => {
    if (!token) return;
    const p = await productsService.list(token);
    setItems(p.data);
  };

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      const shopId = getActiveShopId();
      if (!shopId) {
        setError(t("settings.chooseShop"));
        setLoading(false);
        return;
      }
      Promise.all([
        productsService.list(token),
        productsService.listCategories(token, shopId),
      ])
        .then(([p, c]) => {
          setItems(p.data);
          setCats(
            c.categories
              .filter((category) => category.is_selected)
              .map((category) => ({
                id: category.id,
                name: toCategoryName(category),
                slug: category.slug,
              })),
          );
        })
        .catch((e: unknown) =>
          setError(e instanceof ApiError ? e.message : t("products.errLoad")),
        )
        .finally(() => setLoading(false));
    });
  }, [token]);

  const rows = useMemo(() => items, [items]);

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (form.categoryId === "") throw new Error(t("products.errNoCategory"));
      await productsService.create(token, {
        name_en: form.nameEn,
        name_vi: form.nameVi,
        description_en: form.descriptionEn,
        description_vi: form.descriptionVi,
        image_url: form.imageUrl || null,
        category_id: form.categoryId,
      });
      await loadProducts();
      setForm(emptyProductForm);
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("products.errCreate"));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!token) return;
    if (!confirm(t("products.confirmDelete"))) return;
    setError(null);
    try {
      await productsService.remove(token, id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("products.errDelete"));
    }
  };

  return {
    // state
    loading,
    saving,
    error,
    cats,
    showForm,
    form,
    // derived
    rows,
    // setters
    setForm,
    setShowForm,
    // actions
    onCreate,
    onDelete,
  };
}
