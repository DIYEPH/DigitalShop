"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { useLanguage } from "@/lib/i18n/use-language";
import { emptyForm, emptyGrant, toDatetimeLocal } from "./coupons.constants";
import { couponsService } from "./coupons.service";
import type {
  AdminCoupon,
  AdminCreateCouponInput,
  AdminProduct,
  AdminProductDetail,
  CouponTab,
  GrantForm,
  VoucherMode,
} from "./coupons.types";

export function useCoupons() {
  const token = useAdminToken();
  const { t } = useLanguage();
  const [coupons, setCoupons] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<AdminCreateCouponInput>(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [productId, setProductId] = useState<number | null>(null);
  const [productDetail, setProductDetail] = useState<AdminProductDetail | null>(
    null,
  );
  const [grant, setGrant] = useState<GrantForm>(emptyGrant);
  const [tab, setTab] = useState<CouponTab>("promo");
  const [voucherMode, setVoucherMode] = useState<VoucherMode>("create");

  const cancelEdit = () => {
    setEditingId(null);
    setShowForm(false);
    setForm(emptyForm);
    setProductId(null);
    setProductDetail(null);
    setError(null);
  };

  useEffect(() => {
    if (!token) return;
    Promise.all([couponsService.list(token), couponsService.listProducts(token)])
      .then(([c, p]) => {
        setCoupons(c.coupons);
        setProducts(p.data);
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : t("coupons.errLoad")),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !productId) return;
    couponsService
      .getProduct(token, productId)
      .then((p) => setProductDetail(p))
      .catch(() => setProductDetail(null));
  }, [token, productId]);

  const rows = useMemo(() => {
    if (tab === "promo")
      return coupons.filter(
        (c) => !c.requires_ownership && c.visibility !== "PUBLIC",
      );
    if (tab === "public")
      return coupons.filter(
        (c) => !c.requires_ownership && c.visibility === "PUBLIC",
      );
    if (tab === "voucher")
      return coupons.filter(
        (c) => Boolean(c.requires_ownership) && Number(c.cost_point || 0) === 0,
      );
    return coupons.filter(
      (c) => Boolean(c.requires_ownership) && Number(c.cost_point || 0) > 0,
    );
  }, [coupons, tab]);

  const percentUi = useMemo(
    () => (form.discount_type === "PERCENT" ? (form.percent_bps ?? 0) / 100 : 0),
    [form.discount_type, form.percent_bps],
  );

  const onCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      // Backend expects bps (10000=100%). UI input writes bps directly (value*100).
      const forced: AdminCreateCouponInput =
        tab === "promo"
          ? {
              ...form,
              requires_ownership: false,
              cost_point: 0,
              visibility: "PRIVATE",
            }
          : tab === "public"
            ? {
                ...form,
                requires_ownership: false,
                cost_point: 0,
                visibility: "PUBLIC",
              }
            : tab === "voucher"
              ? {
                  ...form,
                  requires_ownership: true,
                  cost_point: 0,
                  visibility: "PRIVATE",
                }
              : {
                  ...form,
                  requires_ownership: true,
                  cost_point: Number(form.cost_point ?? 0) || 0,
                };

      if (tab === "promo" || tab === "public" || tab === "shop") {
        if (!forced.variant_id) {
          throw new ApiError(t("coupons.errNeedVariant"), 400);
        }
      }

      if (editingId) {
        const updated = await couponsService.update(token, editingId, forced);
        setCoupons((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        );
      } else {
        const created = await couponsService.create(token, forced);
        setCoupons((prev) => [created, ...prev]);
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("coupons.errSave"));
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (c: AdminCoupon, next: boolean) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await couponsService.update(token, c.id, {
        is_active: next,
      });
      setCoupons((prev) =>
        prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("coupons.errUpdate"));
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: AdminCoupon) => {
    const nextTab: CouponTab = c.requires_ownership
      ? Number(c.cost_point || 0) > 0
        ? "shop"
        : "voucher"
      : c.visibility === "PUBLIC"
        ? "public"
        : "promo";
    setTab(nextTab);
    setEditingId(c.id);
    setShowForm(true);
    setForm({
      code: c.code,
      discount_type: c.discount_type,
      percent_bps: c.percent_bps ?? undefined,
      amount_usdt: c.amount_usdt ? Number(c.amount_usdt) : undefined,
      amount_vnd: c.amount_vnd ? Number(c.amount_vnd) : undefined,
      cost_point: c.cost_point,
      is_active: c.is_active,
      starts_at: toDatetimeLocal(c.starts_at) ?? undefined,
      ends_at: toDatetimeLocal(c.ends_at) ?? undefined,
      max_redemptions: c.max_redemptions ?? undefined,
      per_user_limit: c.per_user_limit ?? undefined,
      visibility: c.visibility,
      requires_ownership: c.requires_ownership,
      variant_id: c.variant_id,
    });
    setProductId(c.product_id);
  };

  const onGrant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      await couponsService.grant(token, {
        user_ids: grant.user_ids,
        code: grant.code,
        quantity: grant.quantity ? Number(grant.quantity) : undefined,
      });
      setGrant(emptyGrant);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("coupons.errGrant"));
    } finally {
      setSaving(false);
    }
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setProductId(null);
    setShowForm(true);
  };

  const selectTab = (next: CouponTab) => {
    if (editingId) cancelEdit();
    setTab(next);
    if (next === "voucher") setVoucherMode("create");
  };

  return {
    // state
    loading,
    saving,
    error,
    coupons,
    products,
    productDetail,
    productId,
    form,
    grant,
    tab,
    voucherMode,
    showForm,
    editingId,
    // derived
    rows,
    percentUi,
    // setters
    setForm,
    setGrant,
    setProductId,
    setVoucherMode,
    setShowForm,
    setEditingId,
    // actions
    cancelEdit,
    onCreate,
    onToggleActive,
    startEdit,
    onGrant,
    openCreate,
    selectTab,
  };
}
