"use client";

import Link from "next/link";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Label,
  RichEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  Textarea,
} from "@/components/ui";
import {
  PaymentMethodPicker,
  type VariantPaymentMethod,
} from "@/components/admin/payment-method-picker";
import { cn } from "@/lib/cn";
import { formatUsdt, formatVnd, pricesFromVariantList } from "@/lib/format-price";
import VolumeTierEditor from "@/components/admin/volume-tier-editor";
import { TABS, stockStatusVariant } from "./product-detail.constants";
import { useProductDetail } from "./product-detail.hooks";

export default function AdminProductDetailPage() {
  const {
    token,
    data,
    setData,
    cats,
    loading,
    error,
    tab,
    setTab,
    savingProduct,
    productNameEn,
    setProductNameEn,
    productNameVi,
    setProductNameVi,
    productDescEn,
    setProductDescEn,
    productDescVi,
    setProductDescVi,
    productImageUrl,
    setProductImageUrl,
    productCategoryId,
    setProductCategoryId,
    onSaveProduct,
    planSlug,
    setPlanSlug,
    planNameEn,
    setPlanNameEn,
    planNameVi,
    setPlanNameVi,
    onCreatePlan,
    onSavePlan,
    onDeletePlan,
    variantPlanId,
    setVariantPlanId,
    variantNameEn,
    setVariantNameEn,
    variantNameVi,
    setVariantNameVi,
    variantSku,
    setVariantSku,
    fulfillmentType,
    setFulfillmentType,
    preorderLimit,
    setPreorderLimit,
    preorderDeliveryHours,
    setPreorderDeliveryHours,
    warrantyType,
    setWarrantyType,
    warrantyValue,
    setWarrantyValue,
    warrantyUnit,
    setWarrantyUnit,
    priceUsdt,
    setPriceUsdt,
    priceVnd,
    setPriceVnd,
    variantPaymentMethods,
    setVariantPaymentMethods,
    onCreateVariant,
    editingVariantId,
    editVariant,
    setEditVariant,
    editPriceUsdt,
    setEditPriceUsdt,
    editPriceVnd,
    setEditPriceVnd,
    startEditVariant,
    cancelEditVariant,
    onSaveVariant,
    onDeleteVariant,
    editingVariantStockCount,
    tierVariantId,
    setTierVariantId,
    stockItems,
    stockLoading,
    stockVariantId,
    setStockVariantId,
    stockStatus,
    setStockStatus,
    addStockVariantId,
    setAddStockVariantId,
    addStockPayloads,
    setAddStockPayloads,
    addStockNote,
    setAddStockNote,
    addingStock,
    loadStock,
    onAddStock,
    onDeleteStock,
    plans,
    variants,
    inStockVariants,
    stockOnNonInStockVariants,
  } = useProductDetail();

  if (loading) return <Card className="animate-pulse">Đang tải sản phẩm…</Card>;
  if (!data) return <Card>Không có dữ liệu.</Card>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/products"
          className="text-xs text-gray-600 hover:text-brutal-fg transition-colors"
        >
          Về sản phẩm
        </Link>
        <span className="text-xs text-gray-600">/</span>
        <span className="text-xs font-semibold text-brutal-fg">
          #{data.id} {data.name_en}
          <span className="font-normal text-gray-600"> / {data.name_vi}</span>
        </span>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="flex w-fit gap-0.5 rounded-brutal bg-brutal-muted p-0.5">
        {TABS.map((t) => (
          <Button
            key={t}
            type="button"
            size="sm"
            variant={tab === t ? "primary" : "ghost"}
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
              tab !== t && "text-gray-600 hover:text-brutal-fg",
            )}
          >
            {t}
            {t === "Biến thể" && (
              <span className="ml-1 text-[10px] text-gray-600">
                ({variants.length})
              </span>
            )}
            {t === "Gói" && (
              <span className="ml-1 text-[10px] text-gray-600">
                ({plans.length})
              </span>
            )}
          </Button>
        ))}
      </div>

      {/* ===== INFO TAB ===== */}
      {tab === "Thông tin" && (
        <Card>
          <div className="grid gap-2">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
              <label className="grid gap-0.5">
                <Label>Tên (EN)</Label>
                <Input
                  size="sm"
                  value={productNameEn}
                  onChange={(e) => setProductNameEn(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tên (VI)</Label>
                <Input
                  size="sm"
                  value={productNameVi}
                  onChange={(e) => setProductNameVi(e.target.value)}
                />
              </label>
            </div>
            <label className="grid gap-0.5">
              <Label>Mô tả (EN)</Label>
              <RichEditor
                value={productDescEn}
                onChange={setProductDescEn}
                placeholder="Mô tả tiếng Anh…"
              />
            </label>
            <label className="grid gap-0.5">
              <Label>Mô tả (VI)</Label>
              <RichEditor
                value={productDescVi}
                onChange={setProductDescVi}
                placeholder="Mô tả tiếng Việt…"
              />
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="grid gap-0.5">
                <Label>URL ảnh</Label>
                <Input
                  size="sm"
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Danh mục</Label>
                <Select
                  value={
                    productCategoryId === ""
                      ? "__none"
                      : String(productCategoryId)
                  }
                  onValueChange={(value) =>
                    setProductCategoryId(value === "__none" ? "" : Number(value))
                  }
                >
                  <SelectTrigger className="h-9 px-3 py-1 text-sm">
                    <SelectValue placeholder="Chọn…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Chọn…</SelectItem>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.id} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                variant="primary"
                size="sm"
                disabled={savingProduct}
                onClick={onSaveProduct}
              >
                {savingProduct ? "Đang lưu…" : "Lưu sản phẩm"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* ===== PLANS TAB ===== */}
      {tab === "Gói" && (
        <div className="grid gap-2">
          <Card>
            <form
              onSubmit={onCreatePlan}
              className="flex flex-wrap items-end gap-2"
            >
              <label className="grid gap-0.5">
                <Label>Mã gói (slug)</Label>
                <Input
                  size="sm"
                  className="w-28"
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tên (EN)</Label>
                <Input
                  size="sm"
                  className="w-28"
                  value={planNameEn}
                  onChange={(e) => setPlanNameEn(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tên (VI)</Label>
                <Input
                  size="sm"
                  className="w-28"
                  value={planNameVi}
                  onChange={(e) => setPlanNameVi(e.target.value)}
                />
              </label>
              <Button type="submit" variant="primary" size="sm">
                + Gói
              </Button>
            </form>
          </Card>

          {plans.length === 0 ? (
            <div className="text-xs text-gray-600 px-1">Chưa có gói.</div>
          ) : (
            <div className="grid gap-1">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-brutal border-3 border-brutal bg-brutal-bg px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-16 shrink-0 text-xs font-semibold text-brutal-fg">
                      {p.slug}
                    </span>
                    <Input
                      size="sm"
                      className="w-24"
                      value={p.name_en}
                      onChange={(e) =>
                        setData((prev) =>
                          prev
                            ? {
                                ...prev,
                                plans: prev.plans.map((x) =>
                                  x.id === p.id
                                    ? {
                                        ...x,
                                        name_en: e.target.value,
                                        name: e.target.value,
                                      }
                                    : x,
                                ),
                              }
                            : prev,
                        )
                      }
                      placeholder="EN"
                    />
                    <Input
                      size="sm"
                      className="w-24"
                      value={p.name_vi}
                      onChange={(e) =>
                        setData((prev) =>
                          prev
                            ? {
                                ...prev,
                                plans: prev.plans.map((x) =>
                                  x.id === p.id
                                    ? { ...x, name_vi: e.target.value }
                                    : x,
                                ),
                              }
                            : prev,
                        )
                      }
                      placeholder="VI"
                    />
                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                      Thứ tự
                      <Input
                        size="sm"
                        type="number"
                        className="w-14"
                        value={p.sort_order}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  plans: prev.plans.map((x) =>
                                    x.id === p.id
                                      ? {
                                          ...x,
                                          sort_order: Number(e.target.value),
                                        }
                                      : x,
                                  ),
                                }
                              : prev,
                          )
                        }
                      />
                    </label>
                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600">
                      Hiển thị
                      <Select
                        value={String(p.is_active)}
                        onValueChange={(value) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  plans: prev.plans.map((x) =>
                                    x.id === p.id
                                      ? { ...x, is_active: value === "true" }
                                      : x,
                                  ),
                                }
                              : prev,
                          )
                        }
                      >
                        <SelectTrigger className="h-9 w-24 px-3 py-1 text-sm">
                          <SelectValue placeholder="Hiển thị" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="true">Có</SelectItem>
                          <SelectItem value="false">Không</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="primary"
                        size="sm"
                        type="button"
                        onClick={() => onSavePlan(p)}
                      >
                        Lưu
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        type="button"
                        onClick={() => onDeletePlan(p)}
                      >
                        Xóa
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== VARIANTS TAB ===== */}
      {tab === "Biến thể" && (
        <div className="grid gap-2">
          {/* Create Variant Form */}
          <Card>
            <form onSubmit={onCreateVariant} className="grid gap-2">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                <label className="grid gap-0.5">
                  <Label>Gói</Label>
                  <Select
                    value={variantPlanId === "" ? "__none" : String(variantPlanId)}
                    onValueChange={(value) =>
                      setVariantPlanId(value === "__none" ? "" : Number(value))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="(không có)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">(không có)</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (EN)</Label>
                  <Input
                    size="sm"
                    value={variantNameEn}
                    onChange={(e) => setVariantNameEn(e.target.value)}
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (VI)</Label>
                  <Input
                    size="sm"
                    value={variantNameVi}
                    onChange={(e) => setVariantNameVi(e.target.value)}
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>SKU</Label>
                  <Input
                    size="sm"
                    value={variantSku}
                    onChange={(e) => setVariantSku(e.target.value)}
                    placeholder="CHATGPT-PLUS-1M"
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Cách giao</Label>
                  <Select
                    value={fulfillmentType}
                    onValueChange={(value) =>
                      setFulfillmentType(value as "IN_STOCK" | "PREORDER")
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="Cách giao" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_STOCK">
                        Giao từ kho (IN_STOCK)
                      </SelectItem>
                      <SelectItem value="PREORDER">
                        Đặt trước (PREORDER)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {fulfillmentType === "PREORDER" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giới hạn pre-order</Label>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={preorderLimit}
                        onChange={(e) =>
                          setPreorderLimit(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="để trống = không giới hạn"
                      />
                    </label>
                    <label className="grid gap-0.5">
                      <Label>Giờ giao (PREORDER)</Label>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={preorderDeliveryHours}
                        onChange={(e) =>
                          setPreorderDeliveryHours(
                            e.target.value === "" ? "" : Number(e.target.value),
                          )
                        }
                        placeholder="24"
                      />
                    </label>
                  </>
                )}
                <label className="grid gap-0.5">
                  <Label>Bảo hành</Label>
                  <Select
                    value={warrantyType}
                    onValueChange={(value) =>
                      setWarrantyType(value as "LOGIN" | "CUSTOM" | "NONE")
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="Bảo hành" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">NONE</SelectItem>
                      <SelectItem value="LOGIN">LOGIN</SelectItem>
                      <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {warrantyType === "CUSTOM" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giá trị BH</Label>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={warrantyValue}
                        onChange={(e) => setWarrantyValue(Number(e.target.value))}
                      />
                    </label>
                    <label className="grid gap-0.5">
                      <Label>Đơn vị BH</Label>
                      <Select
                        value={warrantyUnit}
                        onValueChange={(value) =>
                          setWarrantyUnit(
                            value as "HOUR" | "DAY" | "MONTH" | "YEAR",
                          )
                        }
                      >
                        <SelectTrigger className="h-9 px-3 py-1 text-sm">
                          <SelectValue placeholder="Đơn vị" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOUR">HOUR</SelectItem>
                          <SelectItem value="DAY">DAY</SelectItem>
                          <SelectItem value="MONTH">MONTH</SelectItem>
                          <SelectItem value="YEAR">YEAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </>
                )}
                <label className="grid gap-0.5">
                  <Label>Giá USDT</Label>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={priceUsdt}
                    onChange={(e) => setPriceUsdt(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Giá VND</Label>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    step={1}
                    value={priceVnd}
                    onChange={(e) => setPriceVnd(Number(e.target.value))}
                  />
                </label>
              </div>
              <PaymentMethodPicker
                value={variantPaymentMethods}
                onChange={setVariantPaymentMethods}
              />
              <div className="flex justify-end">
                <Button type="submit" variant="primary" size="sm">
                  + Biến thể
                </Button>
              </div>
            </form>
          </Card>

          {/* Variants Table */}
          <>
            <Table>
              <thead className="bg-brutal-muted text-gray-600">
                <tr>
                  <th className="text-left px-3 py-1.5 font-semibold">ID</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Gói</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Tên</th>
                  <th className="text-left px-3 py-1.5 font-semibold">SKU</th>
                  <th className="text-left px-3 py-1.5 font-semibold">Loại</th>
                  <th className="text-left px-3 py-1.5 font-semibold">
                    Bảo hành
                  </th>
                  <th className="text-left px-3 py-1.5 font-semibold">Giá</th>
                  <th className="text-left px-3 py-1.5 font-semibold">
                    Thanh toán
                  </th>
                  <th className="text-right px-3 py-1.5 font-semibold">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr
                    key={v.id}
                    className="border-t-3 border-brutal hover:bg-brutal-muted"
                  >
                    <td className="px-3 py-1.5 font-mono text-[10px] text-gray-600">
                      {v.id}
                    </td>
                    <td className="px-3 py-1.5 font-semibold text-brutal-fg">
                      {v.plan?.slug ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-brutal-fg">
                      <span className="block text-xs font-semibold">
                        {v.name_en}
                      </span>
                      <span className="block text-[10px] text-gray-600">
                        {v.name_vi}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-gray-600">
                      {v.sku ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge
                        variant={
                          v.fulfillment_type === "IN_STOCK"
                            ? "success"
                            : "accent"
                        }
                      >
                        {v.fulfillment_type ?? "—"}
                      </Badge>
                      {v.fulfillment_type === "PREORDER" ? (
                        <div className="mt-0.5 text-[10px] text-gray-600">
                          {v.preorder_delivery_hours
                            ? `${v.preorder_delivery_hours}h`
                            : "chưa rõ SLA"}{" "}
                          / {v.preorder_limit ?? "không giới hạn"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5 text-brutal-fg">
                      {v.warranty_type}
                      {v.warranty_type === "CUSTOM" &&
                      typeof v.warranty_value === "number"
                        ? ` (${v.warranty_value}${v.warranty_unit ?? ""})`
                        : ""}
                    </td>
                    <td className="px-3 py-1.5 text-brutal-fg">
                      {(() => {
                        const { usdt, vnd } = pricesFromVariantList(v.prices);
                        return (
                          <div className="grid gap-0.5 text-xs">
                            <span>{formatUsdt(usdt)}</span>
                            <span className="text-gray-600">
                              {formatVnd(vnd)}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-1.5 text-gray-600 text-[10px]">
                      {(v.payment_methods ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => startEditVariant(v)}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setTierVariantId(
                              tierVariantId === v.id ? null : v.id,
                            )
                          }
                        >
                          Bậc KL
                          {Array.isArray(v.volume_tiers) &&
                          v.volume_tiers.length > 0
                            ? ` (${v.volume_tiers.length})`
                            : ""}
                        </Button>
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteVariant(v)}
                        >
                          Xóa
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {variants.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-gray-600" colSpan={9}>
                      Chưa có biến thể.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </>

          {/* Volume tiers editor */}
          {tierVariantId &&
            token &&
            (() => {
              const v = variants.find((x) => x.id === tierVariantId);
              if (!v) return null;
              return (
                <VolumeTierEditor
                  key={tierVariantId}
                  token={token}
                  variantId={tierVariantId}
                  variantLabel={`${v.plan?.slug ? `${v.plan.slug} / ` : ""}${v.name_en} / ${v.name_vi}`}
                  onSaved={(tiers) => {
                    setData((prev) =>
                      prev
                        ? {
                            ...prev,
                            variants: prev.variants.map((x) =>
                              x.id === tierVariantId
                                ? { ...x, volume_tiers: tiers }
                                : x,
                            ),
                          }
                        : prev,
                    );
                  }}
                />
              );
            })()}

          {/* Edit Variant Modal-like Section */}
          {editingVariantId && (
            <Card className="border-brutal bg-brutal-muted">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-brutal-fg">
                  Sửa biến thể #{editingVariantId}
                </span>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={cancelEditVariant}>
                    Hủy
                  </Button>
                  <Button variant="primary" size="sm" onClick={onSaveVariant}>
                    Lưu
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="grid gap-0.5">
                  <Label>Gói</Label>
                  <Select
                    value={
                      editVariant.plan_id == null
                        ? "__none"
                        : String(editVariant.plan_id)
                    }
                    onValueChange={(value) =>
                      setEditVariant((p) => ({
                        ...p,
                        plan_id: value === "__none" ? null : Number(value),
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="(không có)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">(không có)</SelectItem>
                      {plans.map((p) => (
                        <SelectItem key={p.id} value={String(p.id)}>
                          {p.slug}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (EN)</Label>
                  <Input
                    size="sm"
                    value={editVariant.name_en ?? ""}
                    onChange={(e) =>
                      setEditVariant((p) => ({
                        ...p,
                        name_en: e.target.value,
                        name: e.target.value,
                      }))
                    }
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (VI)</Label>
                  <Input
                    size="sm"
                    value={editVariant.name_vi ?? ""}
                    onChange={(e) =>
                      setEditVariant((p) => ({ ...p, name_vi: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>SKU</Label>
                  <Input
                    size="sm"
                    value={editVariant.sku ?? ""}
                    onChange={(e) =>
                      setEditVariant((p) => ({ ...p, sku: e.target.value }))
                    }
                  />
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mt-2">
                <label className="grid gap-0.5">
                  <Label>Cách giao</Label>
                  <Select
                    value={editVariant.fulfillment_type ?? "PREORDER"}
                    onValueChange={(value) =>
                      setEditVariant((p) => ({
                        ...p,
                        fulfillment_type: value as "IN_STOCK" | "PREORDER",
                        preorder_limit:
                          value === "PREORDER" ? (p.preorder_limit ?? null) : null,
                        preorder_delivery_hours:
                          value === "PREORDER"
                            ? (p.preorder_delivery_hours ?? null)
                            : null,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="Cách giao" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="IN_STOCK">
                        Giao từ kho (IN_STOCK)
                      </SelectItem>
                      <SelectItem
                        value="PREORDER"
                        disabled={editingVariantStockCount > 0}
                      >
                        Đặt trước (PREORDER)
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  {editingVariantStockCount > 0 ? (
                    <p className="text-[10px] text-gray-600">
                      Biến thể đang có {editingVariantStockCount} dòng kho — không
                      thể chuyển sang PREORDER. Xóa hết kho (tab Kho) trước.
                    </p>
                  ) : null}
                </label>
                {editVariant.fulfillment_type === "PREORDER" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giới hạn pre-order</Label>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={editVariant.preorder_limit ?? ""}
                        onChange={(e) =>
                          setEditVariant((p) => ({
                            ...p,
                            preorder_limit:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-0.5">
                      <Label>Giờ giao (PREORDER)</Label>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={editVariant.preorder_delivery_hours ?? ""}
                        onChange={(e) =>
                          setEditVariant((p) => ({
                            ...p,
                            preorder_delivery_hours:
                              e.target.value === ""
                                ? null
                                : Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                  </>
                )}
                <label className="grid gap-0.5">
                  <Label>Thứ tự</Label>
                  <Input
                    size="sm"
                    type="number"
                    value={editVariant.sort_order ?? 0}
                    onChange={(e) =>
                      setEditVariant((p) => ({
                        ...p,
                        sort_order: Number(e.target.value),
                      }))
                    }
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Bảo hành</Label>
                  <Select
                    value={editVariant.warranty_type ?? "NONE"}
                    onValueChange={(value) =>
                      setEditVariant((p) => ({
                        ...p,
                        warranty_type: value as "LOGIN" | "CUSTOM" | "NONE",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="Bảo hành" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">NONE</SelectItem>
                      <SelectItem value="LOGIN">LOGIN</SelectItem>
                      <SelectItem value="CUSTOM">CUSTOM</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
                {editVariant.warranty_type === "CUSTOM" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giá trị BH</Label>
                      <Input
                        size="sm"
                        type="number"
                        min={1}
                        value={editVariant.warranty_value ?? 24}
                        onChange={(e) =>
                          setEditVariant((p) => ({
                            ...p,
                            warranty_value: Number(e.target.value),
                          }))
                        }
                      />
                    </label>
                    <label className="grid gap-0.5">
                      <Label>Đơn vị BH</Label>
                      <Select
                        value={editVariant.warranty_unit ?? "HOUR"}
                        onValueChange={(value) =>
                          setEditVariant((p) => ({
                            ...p,
                            warranty_unit: value as
                              | "HOUR"
                              | "DAY"
                              | "MONTH"
                              | "YEAR",
                          }))
                        }
                      >
                        <SelectTrigger className="h-9 px-3 py-1 text-sm">
                          <SelectValue placeholder="Đơn vị" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="HOUR">HOUR</SelectItem>
                          <SelectItem value="DAY">DAY</SelectItem>
                          <SelectItem value="MONTH">MONTH</SelectItem>
                          <SelectItem value="YEAR">YEAR</SelectItem>
                        </SelectContent>
                      </Select>
                    </label>
                  </>
                )}
                <label className="grid gap-0.5">
                  <Label>Đang bán</Label>
                  <Select
                    value={String(editVariant.is_active ?? true)}
                    onValueChange={(value) =>
                      setEditVariant((p) => ({
                        ...p,
                        is_active: value === "true",
                      }))
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="Đang bán" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">có</SelectItem>
                      <SelectItem value="false">không</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              </div>
              <PaymentMethodPicker
                value={
                  (editVariant.payment_methods ?? []) as VariantPaymentMethod[]
                }
                onChange={(next) =>
                  setEditVariant((p) => ({ ...p, payment_methods: next }))
                }
              />
              <div className="grid grid-cols-2 gap-2 mt-2">
                <label className="grid gap-0.5">
                  <Label>Giá USDT</Label>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    step="0.01"
                    value={editPriceUsdt}
                    onChange={(e) => setEditPriceUsdt(Number(e.target.value))}
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Giá VND</Label>
                  <Input
                    size="sm"
                    type="number"
                    min={0}
                    step={1}
                    value={editPriceVnd}
                    onChange={(e) => setEditPriceVnd(Number(e.target.value))}
                  />
                </label>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* ===== STOCK TAB ===== */}
      {tab === "Kho" && (
        <div className="grid gap-2">
          {/* Add stock form */}
          <Card>
            <form onSubmit={onAddStock} className="grid gap-2">
              {inStockVariants.length === 0 ? (
                <Alert variant="warning">
                  Chưa có biến thể «Giao từ kho» (IN_STOCK). Tạo hoặc sửa biến
                  thể ở tab Biến thể, chọn cách giao IN_STOCK, rồi quay lại nhập
                  kho.
                </Alert>
              ) : null}
              {stockOnNonInStockVariants.length > 0 ? (
                <Alert variant="warning">
                  Có {stockOnNonInStockVariants.length} dòng kho thuộc biến thể
                  không còn IN_STOCK. Biến thể đã có kho không được đổi sang
                  PREORDER — xóa kho (tab này) hoặc giữ IN_STOCK.
                </Alert>
              ) : null}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="grid gap-0.5">
                  <Label>Biến thể (Giao từ kho)</Label>
                  <Select
                    value={
                      addStockVariantId === ""
                        ? "__none"
                        : String(addStockVariantId)
                    }
                    disabled={inStockVariants.length === 0}
                    onValueChange={(value) =>
                      setAddStockVariantId(
                        value === "__none" ? "" : Number(value),
                      )
                    }
                  >
                    <SelectTrigger className="h-9 px-3 py-1 text-sm">
                      <SelectValue placeholder="Chọn…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">Chọn…</SelectItem>
                      {inStockVariants.map((v) => (
                        <SelectItem key={v.id} value={String(v.id)}>
                          {v.id} — {v.name_en}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </label>
                <label className="grid gap-0.5">
                  <Label>Ghi chú (tuỳ chọn)</Label>
                  <Input
                    size="sm"
                    value={addStockNote}
                    onChange={(e) => setAddStockNote(e.target.value)}
                    placeholder="đợt, nguồn…"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={
                      addingStock ||
                      inStockVariants.length === 0 ||
                      addStockVariantId === ""
                    }
                    className="w-full"
                  >
                    {addingStock ? "Đang thêm…" : "Thêm kho"}
                  </Button>
                </div>
              </div>
              <label className="grid gap-0.5">
                <Label>Nội dung (mỗi dòng một mặt hàng)</Label>
                <Textarea
                  className="min-h-20"
                  value={addStockPayloads}
                  disabled={inStockVariants.length === 0}
                  onChange={(e) => setAddStockPayloads(e.target.value)}
                  placeholder={"email|password|2fa...\nkey:XXXXX\n..."}
                />
              </label>
            </form>
          </Card>

          {/* Stock filters + table */}
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm">
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  value={
                    stockVariantId === "" ? "__all" : String(stockVariantId)
                  }
                  onValueChange={(value) => {
                    setStockVariantId(value === "__all" ? "" : Number(value));
                  }}
                >
                  <SelectTrigger className="h-9 w-32 px-3 py-1 text-sm">
                    <SelectValue placeholder="Mọi biến thể IN_STOCK" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">Mọi biến thể IN_STOCK</SelectItem>
                    {inStockVariants.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>
                        {v.id} — {v.name_en}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select
                  value={stockStatus || "__all"}
                  onValueChange={(value) =>
                    setStockStatus(value === "__all" ? "" : value)
                  }
                >
                  <SelectTrigger className="h-9 w-28 px-3 py-1 text-sm">
                    <SelectValue placeholder="Trạng thái" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all">(mọi trạng thái)</SelectItem>
                    <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                    <SelectItem value="RESERVED">RESERVED</SelectItem>
                    <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="ghost" size="sm" onClick={() => void loadStock()}>
                  Làm mới
                </Button>
              </div>
              <span className="text-[11px] font-semibold text-gray-600">
                {stockLoading ? "Đang tải…" : `${stockItems.length} dòng kho`}
              </span>
            </div>
            <Table>
              <thead className="bg-brutal-muted text-gray-600">
                <tr>
                  <th className="text-left px-3 py-1.5 font-semibold">ID</th>
                  <th className="text-left px-3 py-1.5 font-semibold">
                    Biến thể
                  </th>
                  <th className="text-left px-3 py-1.5 font-semibold">
                    Trạng thái
                  </th>
                  <th className="text-left px-3 py-1.5 font-semibold">
                    Đơn hàng
                  </th>
                  <th className="text-left px-3 py-1.5 font-semibold">
                    Nội dung
                  </th>
                  <th className="text-right px-3 py-1.5 font-semibold"></th>
                </tr>
              </thead>
              <tbody>
                {stockItems.map((s) => (
                  <tr
                    key={s.id}
                    className="border-t-3 border-brutal hover:bg-brutal-muted"
                  >
                    <td className="px-3 py-1.5 font-mono text-[10px] text-gray-600">
                      {s.id}
                    </td>
                    <td className="px-3 py-1.5 text-brutal-fg">
                      {s.variant_id}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge variant={stockStatusVariant(s.status)}>
                        {s.status}
                      </Badge>
                    </td>
                    <td className="px-3 py-1.5 text-brutal-fg">
                      {s.order_id ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] whitespace-pre-wrap break-all max-w-[400px]">
                      {s.payload}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {s.status === "AVAILABLE" && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => onDeleteStock(s.id)}
                        >
                          Xóa
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {!stockLoading && stockItems.length === 0 && (
                  <tr>
                    <td className="px-3 py-3 text-gray-600" colSpan={6}>
                      Chưa có dòng kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </>
        </div>
      )}
    </div>
  );
}
