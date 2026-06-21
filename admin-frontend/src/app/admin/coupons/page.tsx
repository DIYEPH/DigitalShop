"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  adminCreateCoupon,
  adminGetProduct,
  adminGrantCouponToUser,
  adminListCoupons,
  adminListProducts,
  adminUpdateCoupon,
  type AdminCoupon,
  type AdminCreateCouponInput,
  type AdminProduct,
  type AdminProductDetail,
} from "@/lib/api/admin";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import {
  Alert,
  Button,
  Input,
  Label,
  Select,
  Table,
  TableHeader,
  TableWrap,
} from "@/components/ui";

const emptyForm: AdminCreateCouponInput = {
  code: "",
  discount_type: "PERCENT",
  percent_bps: 2000,
  cost_point: 0,
  visibility: "PUBLIC",
  requires_ownership: false,
};

function toDatetimeLocal(value?: string | null): string | undefined {
  if (!value) return undefined;
  // Accept already-in datetime-local format
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) return value;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return undefined;
  const pad = (n: number) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

export default function AdminCouponsPage() {
  const token = useAdminToken();
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
  const [grant, setGrant] = useState<{
    user_ids: string;
    code: string;
    quantity: string;
  }>({ user_ids: "", code: "", quantity: "1" });
  const [tab, setTab] = useState<"promo" | "public" | "voucher" | "shop">(
    "promo",
  );
  const [voucherMode, setVoucherMode] = useState<"create" | "grant">("create");

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
    Promise.all([
      adminListCoupons(token),
      adminListProducts(token, { page: 1, limit: 100 }),
    ])
      .then(([c, p]) => {
        setCoupons(c.coupons);
        setProducts(p.data);
      })
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError ? e.message : "Không tải được mã / sản phẩm.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token || !productId) return;
    adminGetProduct(token, productId)
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
    () =>
      form.discount_type === "PERCENT" ? (form.percent_bps ?? 0) / 100 : 0,
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
          throw new ApiError("Mã giảm phải áp cho một biến thể.", 400);
        }
      }

      if (editingId) {
        const updated = await adminUpdateCoupon(token, editingId, forced);
        setCoupons((prev) =>
          prev.map((c) => (c.id === updated.id ? { ...c, ...updated } : c)),
        );
      } else {
        const created = await adminCreateCoupon(token, forced);
        setCoupons((prev) => [created, ...prev]);
      }
      setForm(emptyForm);
      setShowForm(false);
      setEditingId(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Lưu mã thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const onToggleActive = async (c: AdminCoupon, next: boolean) => {
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await adminUpdateCoupon(token, c.id, { is_active: next });
      setCoupons((prev) =>
        prev.map((x) => (x.id === updated.id ? { ...x, ...updated } : x)),
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cập nhật mã thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (c: AdminCoupon) => {
    const nextTab: typeof tab = c.requires_ownership
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
      await adminGrantCouponToUser(token, {
        user_ids: grant.user_ids,
        code: grant.code,
        quantity: grant.quantity ? Number(grant.quantity) : undefined,
      });
      setGrant({ user_ids: "", code: "", quantity: "1" });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Cấp mã thất bại.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid gap-2">
      {error ? (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <TableWrap>
        <TableHeader>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              uiSize="sm"
              variant={tab === "promo" ? "primary" : "ghost"}
              onClick={() => {
                if (editingId) cancelEdit();
                setTab("promo");
              }}
            >
              Promo (theo biến thể)
            </Button>
            <Button
              type="button"
              uiSize="sm"
              variant={tab === "voucher" ? "primary" : "ghost"}
              onClick={() => {
                if (editingId) cancelEdit();
                setTab("voucher");
                setVoucherMode("create");
              }}
            >
              Voucher (cấp người dùng)
            </Button>
            <Button
              type="button"
              uiSize="sm"
              variant={tab === "public" ? "primary" : "ghost"}
              onClick={() => {
                if (editingId) cancelEdit();
                setTab("public");
              }}
            >
              Coupon công khai
            </Button>
            <Button
              type="button"
              uiSize="sm"
              variant={tab === "shop" ? "primary" : "ghost"}
              onClick={() => {
                if (editingId) cancelEdit();
                setTab("shop");
              }}
            >
              Cửa hàng (đổi điểm)
            </Button>
            <div className="ml-2 text-xs font-bold text-muted-foreground">
              {loading ? "Đang tải…" : `${rows.length} mục`}
            </div>
          </div>
          <Button
            uiSize="sm"
            onClick={() => {
              if (showForm) return cancelEdit();
              setEditingId(null);
              setForm(emptyForm);
              setProductId(null);
              setShowForm(true);
            }}
          >
            {showForm ? "Hủy" : "+ Mới"}
          </Button>
        </TableHeader>

        {showForm && (tab !== "voucher" || voucherMode === "create") && (
          <form
            onSubmit={onCreate}
            className="border-b border-border bg-muted/40 p-3"
          >
            <div className="mb-2 text-[11px] font-black text-foreground">
              {editingId
                ? `Sửa mã #${editingId}`
                : tab === "promo"
                  ? "Tạo mã khuyến (theo biến thể)"
                  : tab === "public"
                    ? "Tạo mã công khai"
                    : tab === "voucher"
                      ? "Tạo voucher (cấp tay)"
                      : "Tạo mã đổi điểm"}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label className="grid gap-0.5">
                <Label>Mã</Label>
                <Input
                  uiSize="sm"
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="SUMMER10"
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Loại</Label>
                <Select
                  uiSize="sm"
                  value={form.discount_type}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      discount_type: e.target.value as "PERCENT" | "FIXED",
                    }))
                  }
                >
                  <option value="PERCENT">PERCENT</option>
                  <option value="FIXED">FIXED</option>
                </Select>
              </label>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
              <label className="grid gap-0.5">
                <Label>Phần trăm (%)</Label>
                <Input
                  uiSize="sm"
                  type="number"
                  value={percentUi}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      percent_bps: Number(e.target.value) * 100,
                    }))
                  }
                  disabled={form.discount_type !== "PERCENT"}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>USDT</Label>
                <Input
                  uiSize="sm"
                  type="number"
                  value={form.amount_usdt ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      amount_usdt:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                  disabled={form.discount_type !== "FIXED"}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>VND</Label>
                <Input
                  uiSize="sm"
                  type="number"
                  value={form.amount_vnd ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      amount_vnd:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                  disabled={form.discount_type !== "FIXED"}
                />
              </label>
              {tab === "shop" ? (
                <label className="grid gap-0.5">
                  <Label>Giá (điểm)</Label>
                  <Input
                    uiSize="sm"
                    type="number"
                    value={form.cost_point ?? 0}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        cost_point: Number(e.target.value),
                      }))
                    }
                  />
                </label>
              ) : null}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
              <label className="grid gap-0.5">
                <Label>Tối đa / người</Label>
                <Input
                  uiSize="sm"
                  type="number"
                  value={form.per_user_limit ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      per_user_limit:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tối đa toàn hệ</Label>
                <Input
                  uiSize="sm"
                  type="number"
                  value={form.max_redemptions ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      max_redemptions:
                        e.target.value === ""
                          ? undefined
                          : Number(e.target.value),
                    }))
                  }
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Kích hoạt</Label>
                <Select
                  uiSize="sm"
                  value={String(form.is_active ?? true)}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      is_active: e.target.value === "true",
                    }))
                  }
                >
                  <option value="true">có</option>
                  <option value="false">không</option>
                </Select>
              </label>
              {tab !== "public" ? (
                <label className="grid gap-0.5">
                  <Label>Hiển thị</Label>
                  <Select
                    uiSize="sm"
                    value={form.visibility ?? "PUBLIC"}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        visibility: e.target.value as "PUBLIC" | "PRIVATE",
                      }))
                    }
                  >
                    <option value="PUBLIC">PUBLIC</option>
                    <option value="PRIVATE">PRIVATE</option>
                  </Select>
                </label>
              ) : null}
              <label className="grid gap-0.5">
                <Label>Bắt đầu</Label>
                <Input
                  uiSize="sm"
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      starts_at: e.target.value || undefined,
                    }))
                  }
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Kết thúc</Label>
                <Input
                  uiSize="sm"
                  type="datetime-local"
                  value={form.ends_at ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ends_at: e.target.value || undefined,
                    }))
                  }
                />
              </label>
            </div>

            {tab === "promo" || tab === "public" || tab === "shop" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <label className="grid gap-0.5">
                  <Label>Sản phẩm</Label>
                  <Select
                    uiSize="sm"
                    value={productId ? String(productId) : ""}
                    onChange={(e) => {
                      const v = e.target.value ? Number(e.target.value) : null;
                      setProductId(v);
                      setForm((p) => ({ ...p, variant_id: undefined }));
                    }}
                  >
                    <option value="">Chọn sản phẩm…</option>
                    {products.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </label>

                <label className="grid gap-0.5">
                  <Label>Biến thể</Label>
                  <Select
                    uiSize="sm"
                    value={form.variant_id ? String(form.variant_id) : ""}
                    disabled={!productDetail}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        variant_id: e.target.value
                          ? Number(e.target.value)
                          : undefined,
                      }))
                    }
                  >
                    <option value="">Chọn biến thể…</option>
                    {(productDetail?.variants ?? []).map((v) => {
                      const planLabel = v.plan?.name || v.plan?.slug || "";
                      const variantLabel = v.name || "";
                      return (
                        <option key={v.id} value={String(v.id)}>
                          #{v.id}{" "}
                          {planLabel
                            ? `${planLabel} · ${variantLabel}`
                            : variantLabel}
                        </option>
                      );
                    })}
                  </Select>
                </label>
              </div>
            ) : null}
            <div className="flex justify-end mt-2">
              <Button type="submit" uiSize="sm" disabled={saving}>
                {saving ? "Đang lưu…" : editingId ? "Lưu" : "Tạo"}
              </Button>
            </div>
          </form>
        )}

        {tab === "voucher" ? (
          <div className="border-b border-border bg-surface px-3 pt-3">
            <div className="inline-flex gap-1 rounded-md border border-border p-0.5">
              <Button
                type="button"
                uiSize="sm"
                variant={voucherMode === "create" ? "primary" : "ghost"}
                onClick={() => setVoucherMode("create")}
              >
                Tạo voucher
              </Button>
              <Button
                type="button"
                uiSize="sm"
                variant={voucherMode === "grant" ? "primary" : "ghost"}
                onClick={() => {
                  setVoucherMode("grant");
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                Cấp cho user
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "voucher" && voucherMode === "grant" ? (
          <form
            onSubmit={onGrant}
            className="border-b border-border bg-surface p-3"
          >
            <div className="text-xs font-black text-foreground">
              Cấp mã cho người dùng
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              <label className="grid gap-0.5">
                <Label>ID user (cách nhau bởi dấu phẩy)</Label>
                <Input
                  uiSize="sm"
                  value={grant.user_ids}
                  onChange={(e) =>
                    setGrant((p) => ({ ...p, user_ids: e.target.value }))
                  }
                  placeholder="123,124,125"
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Mã voucher</Label>
                <Select
                  uiSize="sm"
                  value={grant.code}
                  onChange={(e) =>
                    setGrant((p) => ({ ...p, code: e.target.value }))
                  }
                >
                  <option value="">Chọn mã…</option>
                  {rows.map((c) => (
                    <option key={c.id} value={c.code}>
                      {c.code}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="grid gap-0.5">
                <Label>Số lượng</Label>
                <Input
                  uiSize="sm"
                  value={grant.quantity}
                  onChange={(e) =>
                    setGrant((p) => ({ ...p, quantity: e.target.value }))
                  }
                  placeholder="1"
                />
              </label>
            </div>
            <div className="flex justify-end mt-2">
              <Button type="submit" uiSize="sm" disabled={saving}>
                Cấp
              </Button>
            </div>
          </form>
        ) : null}

        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-1.5 font-bold">Mã</th>
              {tab === "promo" || tab === "public" || tab === "shop" ? (
                <th className="text-left px-3 py-1.5 font-bold">Phạm vi</th>
              ) : null}
              <th className="text-left px-3 py-1.5 font-bold">Loại</th>
              <th className="text-left px-3 py-1.5 font-bold">Giảm</th>
              {tab === "shop" ? (
                <th className="text-left px-3 py-1.5 font-bold">ĐIỂM</th>
              ) : null}
              {tab === "voucher" ? (
                <th className="text-left px-3 py-1.5 font-bold">
                  Tối đa/người
                </th>
              ) : null}
              {tab === "voucher" ? (
                <th className="text-left px-3 py-1.5 font-bold">Tối đa</th>
              ) : null}
              {tab === "promo" || tab === "public" ? (
                <th className="text-left px-3 py-1.5 font-bold">Bắt đầu</th>
              ) : null}
              {tab === "promo" || tab === "public" ? (
                <th className="text-left px-3 py-1.5 font-bold">Kết thúc</th>
              ) : null}
              <th className="text-left px-3 py-1.5 font-bold">Bật</th>
              <th className="text-left px-3 py-1.5 font-bold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border-subtle hover:bg-muted/40"
              >
                <td className="px-3 py-1.5 font-bold text-foreground">
                  {c.code}
                </td>
                {tab === "promo" || tab === "public" || tab === "shop" ? (
                  <td className="px-3 py-1.5 text-foreground">
                    <div className="text-[11px] font-bold text-foreground">
                      {c.variant_label || `Biến thể: ${c.variant_id}`}
                    </div>
                  </td>
                ) : null}
                <td className="px-3 py-1.5 text-foreground">
                  {c.discount_type}
                </td>
                <td className="px-3 py-1.5 text-foreground">
                  {c.discount_type === "PERCENT"
                    ? `${(c.percent_bps ?? 0) / 100}%`
                    : `${c.amount_usdt ?? "—"} USDT / ${c.amount_vnd ?? "—"} VND`}
                </td>
                {tab === "shop" ? (
                  <td className="px-3 py-1.5 font-bold text-foreground">
                    {c.cost_point}
                  </td>
                ) : null}
                {tab === "voucher" ? (
                  <td className="px-3 py-1.5 text-foreground">
                    {c.per_user_limit ?? "—"}
                  </td>
                ) : null}
                {tab === "voucher" ? (
                  <td className="px-3 py-1.5 text-foreground">
                    {c.max_redemptions ?? "—"}
                  </td>
                ) : null}
                {tab === "promo" || tab === "public" ? (
                  <td className="px-3 py-1.5 text-foreground">
                    {c.starts_at ? toDatetimeLocal(c.starts_at) : "—"}
                  </td>
                ) : null}
                {tab === "promo" || tab === "public" ? (
                  <td className="px-3 py-1.5 text-foreground">
                    {c.ends_at ? toDatetimeLocal(c.ends_at) : "—"}
                  </td>
                ) : null}
                <td className="px-3 py-1.5">
                  <Select
                    uiSize="sm"
                    value={String(Boolean(c.is_active))}
                    disabled={saving}
                    onChange={(e) =>
                      onToggleActive(c, e.target.value === "true")
                    }
                  >
                    <option value="true">bật</option>
                    <option value="false">tắt</option>
                  </Select>
                </td>
                <td className="px-3 py-1.5">
                  <Button
                    uiSize="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => startEdit(c)}
                  >
                    Sửa
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td
                  className="px-3 py-3 text-muted-foreground"
                  colSpan={
                    tab === "promo" || tab === "public"
                      ? 7
                      : tab === "voucher"
                        ? 7
                        : 6
                  }
                >
                  Chưa có mã.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
