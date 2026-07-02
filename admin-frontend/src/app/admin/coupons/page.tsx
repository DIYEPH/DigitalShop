"use client";

import { useLanguage } from "@/lib/i18n/use-language";
import {
  Alert,
  Button,
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui";
import { toDatetimeLocal } from "./coupons.constants";
import { useCoupons } from "./coupons.hooks";

export default function AdminCouponsPage() {
  const { t } = useLanguage();
  const {
    loading,
    saving,
    error,
    products,
    productDetail,
    productId,
    form,
    grant,
    tab,
    voucherMode,
    showForm,
    editingId,
    rows,
    percentUi,
    setForm,
    setGrant,
    setProductId,
    setVoucherMode,
    setShowForm,
    setEditingId,
    cancelEdit,
    onCreate,
    onToggleActive,
    startEdit,
    onGrant,
    openCreate,
    selectTab,
  } = useCoupons();

  return (
    <div className="grid gap-2">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brutal-fg">
          {t("nav.coupons")}
        </h1>
        <p className="text-sm text-gray-600">{t("coupons.subtitle")}</p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={tab === "promo" ? "primary" : "ghost"}
              onClick={() => selectTab("promo")}
            >
              {t("coupons.tabPromo")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "voucher" ? "primary" : "ghost"}
              onClick={() => selectTab("voucher")}
            >
              {t("coupons.tabVoucher")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "public" ? "primary" : "ghost"}
              onClick={() => selectTab("public")}
            >
              {t("coupons.tabPublic")}
            </Button>
            <Button
              type="button"
              size="sm"
              variant={tab === "shop" ? "primary" : "ghost"}
              onClick={() => selectTab("shop")}
            >
              {t("coupons.tabShop")}
            </Button>
            <div className="ml-2 text-xs font-bold text-gray-600">
              {loading
                ? t("common.loading")
                : `${rows.length} ${t("coupons.itemsUnit")}`}
            </div>
          </div>
          <Button
            variant={showForm ? "ghost" : "primary"}
            size="sm"
            onClick={() => (showForm ? cancelEdit() : openCreate())}
          >
            {showForm ? t("common.cancel") : `+ ${t("common.new")}`}
          </Button>
        </div>

        {showForm && (tab !== "voucher" || voucherMode === "create") && (
          <form
            onSubmit={onCreate}
            className="border-b-3 border-brutal bg-brutal-muted p-3"
          >
            <div className="mb-2 text-[11px] font-black text-brutal-fg">
              {editingId
                ? `${t("coupons.editTitle")} #${editingId}`
                : tab === "promo"
                  ? t("coupons.createPromo")
                  : tab === "public"
                    ? t("coupons.createPublic")
                    : tab === "voucher"
                      ? t("coupons.createVoucher")
                      : t("coupons.createShop")}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <Field label={t("coupons.code")}>
                <Input
                  size="sm"
                  value={form.code}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, code: e.target.value }))
                  }
                  placeholder="SUMMER10"
                />
              </Field>
              <Field label={t("coupons.type")}>
                <Select
                  value={form.discount_type}
                  onValueChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      discount_type: value as "PERCENT" | "FIXED",
                    }))
                  }
                >
                  <SelectTrigger className="h-9 px-3 py-1 text-sm">
                    <SelectValue placeholder={t("coupons.type")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PERCENT">PERCENT</SelectItem>
                    <SelectItem value="FIXED">FIXED</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
              <Field label={t("coupons.percent")}>
                <Input
                  size="sm"
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
              </Field>
              <Field label="USDT">
                <Input
                  size="sm"
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
              </Field>
              <Field label="VND">
                <Input
                  size="sm"
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
              </Field>
              {tab === "shop" ? (
                <Field label={t("coupons.costPoint")}>
                  <Input
                    size="sm"
                    type="number"
                    value={form.cost_point ?? 0}
                    onChange={(e) =>
                      setForm((p) => ({
                        ...p,
                        cost_point: Number(e.target.value),
                      }))
                    }
                  />
                </Field>
              ) : null}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
              <Field label={t("coupons.perUser")}>
                <Input
                  size="sm"
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
              </Field>
              <Field label={t("coupons.maxTotal")}>
                <Input
                  size="sm"
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
              </Field>
              <Field label={t("coupons.active")}>
                <Select
                  value={String(form.is_active ?? true)}
                  onValueChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      is_active: value === "true",
                    }))
                  }
                >
                  <SelectTrigger className="h-9 px-3 py-1 text-sm">
                    <SelectValue placeholder={t("coupons.active")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{t("common.yes")}</SelectItem>
                    <SelectItem value="false">{t("common.no")}</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              {tab !== "public" ? (
                <Field label={t("coupons.visibility")}>
                  <Select
                    value={form.visibility ?? "PUBLIC"}
                    onValueChange={(value) =>
                      setForm((p) => ({
                        ...p,
                        visibility: value as "PUBLIC" | "PRIVATE",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder={t("coupons.visibility")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                      <SelectItem value="PRIVATE">PRIVATE</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              ) : null}
              <Field label={t("coupons.startAt")}>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={form.starts_at ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      starts_at: e.target.value || undefined,
                    }))
                  }
                />
              </Field>
              <Field label={t("coupons.endAt")}>
                <Input
                  size="sm"
                  type="datetime-local"
                  value={form.ends_at ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      ends_at: e.target.value || undefined,
                    }))
                  }
                />
              </Field>
            </div>

            {tab === "promo" || tab === "public" || tab === "shop" ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                <Field label={t("coupons.product")}>
                  <Select
                    value={productId ? String(productId) : "__none"}
                    onValueChange={(value) => {
                      const v = value === "__none" ? null : Number(value);
                      setProductId(v);
                      setForm((p) => ({ ...p, variant_id: undefined }));
                    }}
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder={t("coupons.chooseProduct")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">
                        {t("coupons.chooseProduct")}
                      </SelectItem>
                      {products.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field label={t("coupons.variant")}>
                  <Select
                    value={form.variant_id ? String(form.variant_id) : "__none"}
                    disabled={!productDetail}
                    onValueChange={(value) =>
                      setForm((p) => ({
                        ...p,
                        variant_id:
                          value !== "__none" ? Number(value) : undefined,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder={t("coupons.chooseVariant")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">
                        {t("coupons.chooseVariant")}
                      </SelectItem>
                      {(productDetail?.variants ?? []).map((v) => {
                        const planLabel = v.plan?.name || v.plan?.slug || "";
                        const variantLabel = v.name || "";
                        return (
                          <SelectItem key={v.id} value={String(v.id)}>
                            #{v.id}{" "}
                            {planLabel
                              ? `${planLabel} · ${variantLabel}`
                              : variantLabel}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            ) : null}
            <div className="flex justify-end mt-2">
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {saving
                  ? t("common.saving")
                  : editingId
                    ? t("common.save")
                    : t("common.create")}
              </Button>
            </div>
          </form>
        )}

        {tab === "voucher" ? (
          <div className="border-b-3 border-brutal bg-brutal-bg px-3 pt-3">
            <div className="inline-flex gap-1 rounded-brutal border-3 border-brutal p-0.5">
              <Button
                type="button"
                size="sm"
                variant={voucherMode === "create" ? "primary" : "ghost"}
                onClick={() => setVoucherMode("create")}
              >
                {t("coupons.voucherCreate")}
              </Button>
              <Button
                type="button"
                size="sm"
                variant={voucherMode === "grant" ? "primary" : "ghost"}
                onClick={() => {
                  setVoucherMode("grant");
                  setShowForm(false);
                  setEditingId(null);
                }}
              >
                {t("coupons.voucherGrant")}
              </Button>
            </div>
          </div>
        ) : null}

        {tab === "voucher" && voucherMode === "grant" ? (
          <form
            onSubmit={onGrant}
            className="border-b-3 border-brutal bg-brutal-bg p-3"
          >
            <div className="text-xs font-black text-brutal-fg">
              {t("coupons.grantTitle")}
            </div>
            <div className="grid grid-cols-1 gap-2 mt-2 sm:grid-cols-3">
              <Field label={t("coupons.userIds")}>
                <Input
                  size="sm"
                  value={grant.user_ids}
                  onChange={(e) =>
                    setGrant((p) => ({ ...p, user_ids: e.target.value }))
                  }
                  placeholder="123,124,125"
                />
              </Field>
              <Field label={t("coupons.voucherCode")}>
                <Select
                  value={grant.code || "__none"}
                  onValueChange={(value) =>
                    setGrant((p) => ({
                      ...p,
                      code: value === "__none" ? "" : value,
                    }))
                  }
                >
                  <SelectTrigger className="h-9 px-3 py-1 text-sm">
                    <SelectValue placeholder={t("coupons.chooseCode")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">
                      {t("coupons.chooseCode")}
                    </SelectItem>
                    {rows.map((c) => (
                      <SelectItem key={c.id} value={c.code}>
                        {c.code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label={t("coupons.quantity")}>
                <Input
                  size="sm"
                  value={grant.quantity}
                  onChange={(e) =>
                    setGrant((p) => ({ ...p, quantity: e.target.value }))
                  }
                  placeholder="1"
                />
              </Field>
            </div>
            <div className="flex justify-end mt-2">
              <Button type="submit" variant="primary" size="sm" disabled={saving}>
                {t("coupons.grant")}
              </Button>
            </div>
          </form>
        ) : null}

        <Table>
          <TableHeader>
            <TableRow className="border-t-0">
              <TableHead>{t("coupons.code")}</TableHead>
              {tab === "promo" || tab === "public" || tab === "shop" ? (
                <TableHead>{t("coupons.scope")}</TableHead>
              ) : null}
              <TableHead>{t("coupons.type")}</TableHead>
              <TableHead>{t("coupons.discount")}</TableHead>
              {tab === "shop" ? (
                <TableHead>{t("coupons.points")}</TableHead>
              ) : null}
              {tab === "voucher" ? (
                <TableHead>{t("coupons.perUser")}</TableHead>
              ) : null}
              {tab === "voucher" ? (
                <TableHead>{t("coupons.max")}</TableHead>
              ) : null}
              {tab === "promo" || tab === "public" ? (
                <TableHead>{t("coupons.startAt")}</TableHead>
              ) : null}
              {tab === "promo" || tab === "public" ? (
                <TableHead>{t("coupons.endAt")}</TableHead>
              ) : null}
              <TableHead>{t("coupons.enabled")}</TableHead>
              <TableHead>{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-semibold">{c.code}</TableCell>
                {tab === "promo" || tab === "public" || tab === "shop" ? (
                  <TableCell>
                    {c.variant_label ||
                      `${t("coupons.variantLabel")}: ${c.variant_id}`}
                  </TableCell>
                ) : null}
                <TableCell>{c.discount_type}</TableCell>
                <TableCell>
                  {c.discount_type === "PERCENT"
                    ? `${(c.percent_bps ?? 0) / 100}%`
                    : `${c.amount_usdt ?? "—"} USDT / ${c.amount_vnd ?? "—"} VND`}
                </TableCell>
                {tab === "shop" ? <TableCell>{c.cost_point}</TableCell> : null}
                {tab === "voucher" ? (
                  <TableCell>{c.per_user_limit ?? "—"}</TableCell>
                ) : null}
                {tab === "voucher" ? (
                  <TableCell>{c.max_redemptions ?? "—"}</TableCell>
                ) : null}
                {tab === "promo" || tab === "public" ? (
                  <TableCell>
                    {c.starts_at ? toDatetimeLocal(c.starts_at) : "—"}
                  </TableCell>
                ) : null}
                {tab === "promo" || tab === "public" ? (
                  <TableCell>
                    {c.ends_at ? toDatetimeLocal(c.ends_at) : "—"}
                  </TableCell>
                ) : null}
                <TableCell>
                  <Select
                    value={String(Boolean(c.is_active))}
                    disabled={saving}
                    onValueChange={(value) => onToggleActive(c, value === "true")}
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder={t("coupons.enabled")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">{t("common.on")}</SelectItem>
                      <SelectItem value="false">{t("common.off")}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Button
                    size="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => startEdit(c)}
                  >
                    {t("common.edit")}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell
                  className="text-gray-600"
                  colSpan={
                    tab === "promo" || tab === "public"
                      ? 7
                      : tab === "voucher"
                        ? 7
                        : 6
                  }
                >
                  {t("coupons.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </>
    </div>
  );
}
