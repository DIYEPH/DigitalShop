"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
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
  Table,
  TableHeader,
  TableWrap,
  Textarea,
  stockBadgeTone,
} from "@/components/ui";
import {
  PaymentMethodPicker,
  PAYMENT_METHOD_OPTIONS,
  type VariantPaymentMethod,
} from "@/components/admin/payment-method-picker";
import { ApiError } from "@/lib/api/client";
import { cn } from "@/lib/cn";
import {
  adminAddStock,
  adminCreatePlan,
  adminCreateVariant,
  adminDeletePlan,
  adminDeleteStock,
  adminDeleteVariant,
  adminGetProduct,
  adminListCategoriesFlat,
  adminListStock,
  adminUpdateProduct,
  adminUpdatePlan,
  adminUpdateVariant,
  type AdminPlan,
  type AdminProductDetail,
  type AdminStockItem,
  type AdminVariant,
} from "@/lib/api/admin";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import {
  buildVariantPricesPayload,
  formatUsdt,
  formatVnd,
  pricesFromVariantList,
} from "@/lib/format-price";
import VolumeTierEditor from "@/components/admin/volume-tier-editor";

type Category = { id: number; name: string; slug: string };
type EditableVariant = Partial<AdminVariant> & {
  preorder_limit?: number | null;
  preorder_delivery_hours?: number | null;
  warranty_value?: number | null;
  warranty_unit?: "HOUR" | "DAY" | "MONTH" | "YEAR" | null;
  payment_methods?: VariantPaymentMethod[];
};

const TABS = ["Thông tin", "Gói", "Biến thể", "Kho"] as const;
type Tab = (typeof TABS)[number];

export default function AdminProductDetailPage() {
  const token = useAdminToken();
  const params = useParams<{ id: string }>();
  const productId = Number(params.id);

  const [data, setData] = useState<AdminProductDetail | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("Thông tin");

  // -- Product fields --
  const [savingProduct, setSavingProduct] = useState(false);
  const [productNameEn, setProductNameEn] = useState("");
  const [productNameVi, setProductNameVi] = useState("");
  const [productDescEn, setProductDescEn] = useState("");
  const [productDescVi, setProductDescVi] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productCategoryId, setProductCategoryId] = useState<number | "">("");

  // -- Plan fields --
  const [planSlug, setPlanSlug] = useState("plus");
  const [planNameEn, setPlanNameEn] = useState("Plus");
  const [planNameVi, setPlanNameVi] = useState("Gói Plus");

  // -- Variant fields --
  const [variantPlanId, setVariantPlanId] = useState<number | "">("");
  const [variantNameEn, setVariantNameEn] = useState("");
  const [variantNameVi, setVariantNameVi] = useState("");
  const [variantSku, setVariantSku] = useState("");
  const [fulfillmentType, setFulfillmentType] = useState<
    "IN_STOCK" | "PREORDER"
  >("PREORDER");
  const [preorderLimit, setPreorderLimit] = useState<number | "">("");
  const [preorderDeliveryHours, setPreorderDeliveryHours] = useState<
    number | ""
  >("");
  const [warrantyType, setWarrantyType] = useState<"LOGIN" | "CUSTOM" | "NONE">(
    "NONE",
  );
  const [warrantyValue, setWarrantyValue] = useState<number>(24);
  const [warrantyUnit, setWarrantyUnit] = useState<
    "HOUR" | "DAY" | "MONTH" | "YEAR"
  >("HOUR");
  const [priceUsdt, setPriceUsdt] = useState<number>(0);
  const [priceVnd, setPriceVnd] = useState<number>(0);
  const [variantPaymentMethods, setVariantPaymentMethods] = useState<
    VariantPaymentMethod[]
  >(["USDT", "BINANCE", "BALANCE"]);

  // -- Edit variant --
  const [editingVariantId, setEditingVariantId] = useState<number | null>(null);
  const [editVariant, setEditVariant] = useState<EditableVariant>({});
  const [editPriceUsdt, setEditPriceUsdt] = useState<number>(0);
  const [editPriceVnd, setEditPriceVnd] = useState<number>(0);

  // -- Volume tier editor target (per-variant) --
  const [tierVariantId, setTierVariantId] = useState<number | null>(null);

  // -- Stock --
  const [stockItems, setStockItems] = useState<AdminStockItem[]>([]);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockVariantId, setStockVariantId] = useState<number | "">("");
  const [stockStatus, setStockStatus] = useState<string>("");
  const [addStockVariantId, setAddStockVariantId] = useState<number | "">("");
  const [addStockPayloads, setAddStockPayloads] = useState("");
  const [addStockNote, setAddStockNote] = useState("");
  const [addingStock, setAddingStock] = useState(false);

  useEffect(() => {
    if (!token) return;
    if (!Number.isInteger(productId) || productId <= 0) return;
    Promise.all([
      adminGetProduct(token, productId),
      adminListCategoriesFlat(token),
    ])
      .then(([p, c]) => {
        setData(p);
        setCats(c as unknown as Category[]);
        setProductNameEn(p.name_en);
        setProductNameVi(p.name_vi);
        setProductDescEn(p.description_en);
        setProductDescVi(p.description_vi);
        setProductImageUrl(p.image_url ?? "");
        setProductCategoryId(p.category_id);
        if (p.plans[0]?.id) setVariantPlanId(p.plans[0].id);
      })
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError ? e.message : "Không tải được sản phẩm.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token, productId]);

  // -- Product save --
  const onSaveProduct = async () => {
    if (!token || !data) return;
    setSavingProduct(true);
    setError(null);
    try {
      if (productCategoryId === "") throw new Error("Chưa chọn danh mục");
      await adminUpdateProduct(token, data.id, {
        name_en: productNameEn,
        name_vi: productNameVi,
        description_en: productDescEn,
        description_vi: productDescVi,
        image_url: productImageUrl || null,
        category_id: productCategoryId,
      });
      const refreshed = await adminGetProduct(token, data.id);
      setData(refreshed);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Cập nhật sản phẩm thất bại.",
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const plans = useMemo(() => data?.plans ?? [], [data]);
  const variants = useMemo(() => data?.variants ?? [], [data]);
  const inStockVariants = useMemo(
    () => variants.filter((v) => v.fulfillment_type === "IN_STOCK"),
    [variants],
  );
  const inStockVariantIds = useMemo(
    () => new Set(inStockVariants.map((v) => v.id)),
    [inStockVariants],
  );
  const stockOnNonInStockVariants = useMemo(
    () => stockItems.filter((s) => !inStockVariantIds.has(s.variant_id)),
    [stockItems, inStockVariantIds],
  );
  const editingVariantStockCount = useMemo(() => {
    if (!editingVariantId) return 0;
    const fromList = variants.find(
      (v) => v.id === editingVariantId,
    )?.stock_item_count;
    return fromList ?? editVariant.stock_item_count ?? 0;
  }, [editingVariantId, variants, editVariant.stock_item_count]);

  // -- Plan CRUD --
  const onCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data) return;
    setError(null);
    try {
      const created = await adminCreatePlan(token, data.id, {
        slug: planSlug,
        name_en: planNameEn,
        name_vi: planNameVi,
      });
      setData((prev) =>
        prev ? { ...prev, plans: [...prev.plans, created] } : prev,
      );
      setVariantPlanId(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo gói thất bại.");
    }
  };

  const onSavePlan = async (p: AdminPlan) => {
    if (!token || !data) return;
    setError(null);
    try {
      const updated = await adminUpdatePlan(token, data.id, p.id, {
        name_en: p.name_en,
        name_vi: p.name_vi,
        sort_order: p.sort_order,
        is_active: p.is_active,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              plans: prev.plans.map((x) => (x.id === updated.id ? updated : x)),
            }
          : prev,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Cập nhật gói thất bại.",
      );
    }
  };

  const onDeletePlan = async (p: AdminPlan) => {
    if (!token || !data) return;
    if (!confirm("Xóa gói? Các biến thể sẽ bị gỡ khỏi gói.")) return;
    setError(null);
    try {
      await adminDeletePlan(token, data.id, p.id);
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          plans: prev.plans.filter((x) => x.id !== p.id),
          variants: prev.variants.map((v) =>
            v.plan_id === p.id ? { ...v, plan_id: null, plan: null } : v,
          ),
        };
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa gói thất bại.");
    }
  };

  // -- Variant CRUD --
  const onCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !data) return;
    setError(null);
    try {
      if (variantPaymentMethods.length === 0)
        throw new Error("Chọn ít nhất một phương thức thanh toán.");
      const created = await adminCreateVariant(token, data.id, {
        plan_id: variantPlanId === "" ? null : variantPlanId,
        name_en: variantNameEn,
        name_vi: variantNameVi,
        sku: variantSku || null,
        fulfillment_type: fulfillmentType,
        preorder_limit:
          fulfillmentType === "PREORDER"
            ? preorderLimit === ""
              ? null
              : preorderLimit
            : null,
        preorder_delivery_hours:
          fulfillmentType === "PREORDER"
            ? preorderDeliveryHours === ""
              ? null
              : preorderDeliveryHours
            : null,
        warranty_type: warrantyType,
        ...(warrantyType === "CUSTOM"
          ? { warranty_value: warrantyValue, warranty_unit: warrantyUnit }
          : {}),
        prices: buildVariantPricesPayload(priceUsdt, priceVnd),
        payment_methods: variantPaymentMethods,
      });
      setData((prev) =>
        prev ? { ...prev, variants: [...prev.variants, created] } : prev,
      );
      setVariantNameEn("");
      setVariantNameVi("");
      setVariantSku("");
      setFulfillmentType("PREORDER");
      setPreorderLimit("");
      setPreorderDeliveryHours("");
      setPriceUsdt(0);
      setPriceVnd(0);
      setWarrantyType("NONE");
      setVariantPaymentMethods(["USDT", "BINANCE", "BALANCE"]);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Tạo biến thể thất bại.",
      );
    }
  };

  const startEditVariant = (v: AdminVariant) => {
    setEditingVariantId(v.id);
    const methods = (v.payment_methods ?? []).filter(
      (m): m is VariantPaymentMethod =>
        PAYMENT_METHOD_OPTIONS.includes(m as VariantPaymentMethod),
    );
    setEditVariant({ ...v, payment_methods: methods });
    const { usdt, vnd } = pricesFromVariantList(v.prices);
    setEditPriceUsdt(usdt ? Number(usdt) : 0);
    setEditPriceVnd(vnd ? Number(vnd) : 0);
  };

  const cancelEditVariant = () => {
    setEditingVariantId(null);
    setEditVariant({});
    setEditPriceUsdt(0);
    setEditPriceVnd(0);
  };

  const onSaveVariant = async () => {
    if (!token || !data || !editingVariantId) return;
    setError(null);
    try {
      const methods = (editVariant.payment_methods ?? []).filter(
        (m): m is VariantPaymentMethod =>
          PAYMENT_METHOD_OPTIONS.includes(m as VariantPaymentMethod),
      );
      if (methods.length === 0)
        throw new Error("Chọn ít nhất một phương thức thanh toán.");
      const updated = await adminUpdateVariant(token, editingVariantId, {
        plan_id: editVariant.plan_id,
        name_en: editVariant.name_en,
        name_vi: editVariant.name_vi,
        sku: editVariant.sku,
        fulfillment_type: editVariant.fulfillment_type ?? undefined,
        preorder_limit:
          editVariant.fulfillment_type === "PREORDER"
            ? (editVariant.preorder_limit ?? null)
            : null,
        preorder_delivery_hours:
          editVariant.fulfillment_type === "PREORDER"
            ? (editVariant.preorder_delivery_hours ?? null)
            : null,
        warranty_type: editVariant.warranty_type,
        warranty_value: editVariant.warranty_value,
        warranty_unit: editVariant.warranty_unit,
        prices: buildVariantPricesPayload(editPriceUsdt, editPriceVnd),
        sort_order: editVariant.sort_order,
        is_active: editVariant.is_active,
        payment_methods: methods,
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              variants: prev.variants.map((x) =>
                x.id === updated.id ? updated : x,
              ),
            }
          : prev,
      );
      cancelEditVariant();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Cập nhật biến thể thất bại.",
      );
    }
  };

  const onDeleteVariant = async (v: AdminVariant) => {
    if (!token) return;
    if (!confirm("Xóa biến thể này?")) return;
    setError(null);
    try {
      await adminDeleteVariant(token, v.id);
      setData((prev) =>
        prev
          ? { ...prev, variants: prev.variants.filter((x) => x.id !== v.id) }
          : prev,
      );
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Xóa biến thể thất bại.",
      );
    }
  };

  // -- Stock --
  const loadStock = async (showLoading = true) => {
    if (!token) return;
    if (showLoading) setStockLoading(true);
    try {
      const r = await adminListStock(token, {
        product_id: productId,
        variant_id: stockVariantId === "" ? undefined : stockVariantId,
        status: stockStatus || undefined,
      });
      setStockItems(r.items);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được kho.");
    } finally {
      if (showLoading) setStockLoading(false);
    }
  };

  useEffect(() => {
    if (tab === "Kho" && token) {
      adminListStock(token, {
        product_id: productId,
        variant_id: stockVariantId === "" ? undefined : stockVariantId,
        status: stockStatus || undefined,
      })
        .then((r) => setStockItems(r.items))
        .catch((e: unknown) =>
          setError(e instanceof ApiError ? e.message : "Không tải được kho."),
        );
    }
  }, [tab, token, productId, stockVariantId, stockStatus]);

  useEffect(() => {
    if (tab !== "Kho" || inStockVariants.length === 0) return;
    if (
      addStockVariantId === "" ||
      !inStockVariantIds.has(addStockVariantId as number)
    ) {
      queueMicrotask(() => setAddStockVariantId(inStockVariants[0]!.id));
    }
  }, [tab, inStockVariants, inStockVariantIds, addStockVariantId]);

  const onAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || addStockVariantId === "") {
      setError("Chọn biến thể IN_STOCK trước.");
      return;
    }
    if (!inStockVariantIds.has(addStockVariantId as number)) {
      setError("Chỉ biến thể «Giao từ kho» (IN_STOCK) mới được nhập kho.");
      return;
    }
    setAddingStock(true);
    setError(null);
    try {
      const r = await adminAddStock(token, {
        variant_id: addStockVariantId as number,
        payloads: addStockPayloads,
        note: addStockNote || undefined,
      });
      setAddStockPayloads("");
      await loadStock();
      setError(`Added ${r.created} stock items.`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Thêm kho thất bại.");
    } finally {
      setAddingStock(false);
    }
  };

  const onDeleteStock = async (stockId: number) => {
    if (!token) return;
    if (!confirm("Xóa dòng kho này?")) return;
    setError(null);
    try {
      await adminDeleteStock(token, stockId);
      setStockItems((prev) => prev.filter((s) => s.id !== stockId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa kho thất bại.");
    }
  };

  if (loading) return <Card className="animate-pulse">Đang tải sản phẩm…</Card>;
  if (!data) return <Card>Không có dữ liệu.</Card>;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          href="/admin/products"
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Về sản phẩm
        </Link>
        <span className="text-xs text-muted-foreground">/</span>
        <span className="text-xs font-semibold text-foreground">
          #{data.id} {data.name_en}
          <span className="font-normal text-muted-foreground">
            {" "}
            / {data.name_vi}
          </span>
        </span>
      </div>

      {error ? (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <div className="flex w-fit gap-0.5 rounded-lg bg-muted p-0.5">
        {TABS.map((t) => (
          <Button
            key={t}
            type="button"
            uiSize="sm"
            variant={tab === t ? "primary" : "ghost"}
            onClick={() => setTab(t)}
            className={cn(
              "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150",
              tab !== t && "text-muted-foreground hover:text-foreground",
            )}
          >
            {t}
            {t === "Biến thể" && (
              <span className="ml-1 text-[10px] text-muted-foreground">
                ({variants.length})
              </span>
            )}
            {t === "Gói" && (
              <span className="ml-1 text-[10px] text-muted-foreground">
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
                  uiSize="sm"
                  value={productNameEn}
                  onChange={(e) => setProductNameEn(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tên (VI)</Label>
                <Input
                  uiSize="sm"
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
                  uiSize="sm"
                  value={productImageUrl}
                  onChange={(e) => setProductImageUrl(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Danh mục</Label>
                <Select
                  uiSize="sm"
                  value={productCategoryId}
                  onChange={(e) =>
                    setProductCategoryId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                >
                  <option value="">Chọn…</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.name}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                uiSize="sm"
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
                  uiSize="sm"
                  className="w-28"
                  value={planSlug}
                  onChange={(e) => setPlanSlug(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tên (EN)</Label>
                <Input
                  uiSize="sm"
                  className="w-28"
                  value={planNameEn}
                  onChange={(e) => setPlanNameEn(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Tên (VI)</Label>
                <Input
                  uiSize="sm"
                  className="w-28"
                  value={planNameVi}
                  onChange={(e) => setPlanNameVi(e.target.value)}
                />
              </label>
              <Button type="submit" uiSize="sm">
                + Gói
              </Button>
            </form>
          </Card>

          {plans.length === 0 ? (
            <div className="text-xs text-muted-foreground px-1">
              Chưa có gói.
            </div>
          ) : (
            <div className="grid gap-1">
              {plans.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border border-border bg-surface px-3 py-2"
                >
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="w-16 shrink-0 text-xs font-semibold text-foreground">
                      {p.slug}
                    </span>
                    <Input
                      uiSize="sm"
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
                      uiSize="sm"
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
                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      Thứ tự
                      <Input
                        uiSize="sm"
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
                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                      Hiển thị
                      <Select
                        uiSize="sm"
                        className="w-24"
                        value={String(p.is_active)}
                        onChange={(e) =>
                          setData((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  plans: prev.plans.map((x) =>
                                    x.id === p.id
                                      ? {
                                          ...x,
                                          is_active: e.target.value === "true",
                                        }
                                      : x,
                                  ),
                                }
                              : prev,
                          )
                        }
                      >
                        <option value="true">Có</option>
                        <option value="false">Không</option>
                      </Select>
                    </label>
                    <div className="ml-auto flex gap-1">
                      <Button
                        variant="ghost"
                        uiSize="sm"
                        type="button"
                        onClick={() => onSavePlan(p)}
                      >
                        Lưu
                      </Button>
                      <Button
                        variant="ghost"
                        uiSize="sm"
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
                    uiSize="sm"
                    value={variantPlanId}
                    onChange={(e) =>
                      setVariantPlanId(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">(không có)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.slug}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (EN)</Label>
                  <Input
                    uiSize="sm"
                    value={variantNameEn}
                    onChange={(e) => setVariantNameEn(e.target.value)}
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (VI)</Label>
                  <Input
                    uiSize="sm"
                    value={variantNameVi}
                    onChange={(e) => setVariantNameVi(e.target.value)}
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>SKU</Label>
                  <Input
                    uiSize="sm"
                    value={variantSku}
                    onChange={(e) => setVariantSku(e.target.value)}
                    placeholder="CHATGPT-PLUS-1M"
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>Cách giao</Label>
                  <Select
                    uiSize="sm"
                    value={fulfillmentType}
                    onChange={(e) =>
                      setFulfillmentType(
                        e.target.value as "IN_STOCK" | "PREORDER",
                      )
                    }
                  >
                    <option value="IN_STOCK">Giao từ kho (IN_STOCK)</option>
                    <option value="PREORDER">Đặt trước (PREORDER)</option>
                  </Select>
                </label>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                {fulfillmentType === "PREORDER" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giới hạn pre-order</Label>
                      <Input
                        uiSize="sm"
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
                        uiSize="sm"
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
                    uiSize="sm"
                    value={warrantyType}
                    onChange={(e) =>
                      setWarrantyType(
                        e.target.value as "LOGIN" | "CUSTOM" | "NONE",
                      )
                    }
                  >
                    <option value="NONE">NONE</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </Select>
                </label>
                {warrantyType === "CUSTOM" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giá trị BH</Label>
                      <Input
                        uiSize="sm"
                        type="number"
                        min={1}
                        value={warrantyValue}
                        onChange={(e) =>
                          setWarrantyValue(Number(e.target.value))
                        }
                      />
                    </label>
                    <label className="grid gap-0.5">
                      <Label>Đơn vị BH</Label>
                      <Select
                        uiSize="sm"
                        value={warrantyUnit}
                        onChange={(e) =>
                          setWarrantyUnit(
                            e.target.value as "HOUR" | "DAY" | "MONTH" | "YEAR",
                          )
                        }
                      >
                        <option value="HOUR">HOUR</option>
                        <option value="DAY">DAY</option>
                        <option value="MONTH">MONTH</option>
                        <option value="YEAR">YEAR</option>
                      </Select>
                    </label>
                  </>
                )}
                <label className="grid gap-0.5">
                  <Label>Giá USDT</Label>
                  <Input
                    uiSize="sm"
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
                    uiSize="sm"
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
                <Button type="submit" uiSize="sm">
                  + Biến thể
                </Button>
              </div>
            </form>
          </Card>

          {/* Variants Table */}
          <TableWrap>
            <Table>
              <thead className="bg-muted text-muted-foreground">
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
                    className="border-t border-border-subtle hover:bg-muted/50"
                  >
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {v.id}
                    </td>
                    <td className="px-3 py-1.5 font-semibold text-foreground">
                      {v.plan?.slug ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">
                      <span className="block text-xs font-semibold">
                        {v.name_en}
                      </span>
                      <span className="block text-[10px] text-muted-foreground">
                        {v.name_vi}
                      </span>
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {v.sku ?? "—"}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge
                        tone={
                          v.fulfillment_type === "IN_STOCK"
                            ? "success"
                            : "warning"
                        }
                      >
                        {v.fulfillment_type ?? "—"}
                      </Badge>
                      {v.fulfillment_type === "PREORDER" ? (
                        <div className="mt-0.5 text-[10px] text-muted-foreground">
                          {v.preorder_delivery_hours
                            ? `${v.preorder_delivery_hours}h`
                            : "chưa rõ SLA"}{" "}
                          / {v.preorder_limit ?? "không giới hạn"}
                        </div>
                      ) : null}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">
                      {v.warranty_type}
                      {v.warranty_type === "CUSTOM" &&
                      typeof v.warranty_value === "number"
                        ? ` (${v.warranty_value}${v.warranty_unit ?? ""})`
                        : ""}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">
                      {(() => {
                        const { usdt, vnd } = pricesFromVariantList(v.prices);
                        return (
                          <div className="grid gap-0.5 text-xs">
                            <span>{formatUsdt(usdt)}</span>
                            <span className="text-muted-foreground">
                              {formatVnd(vnd)}
                            </span>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-3 py-1.5 text-muted-foreground text-[10px]">
                      {(v.payment_methods ?? []).join(", ") || "—"}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      <div className="inline-flex gap-1">
                        <Button
                          variant="ghost"
                          uiSize="sm"
                          onClick={() => startEditVariant(v)}
                        >
                          Sửa
                        </Button>
                        <Button
                          variant="ghost"
                          uiSize="sm"
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
                          variant="ghost"
                          uiSize="sm"
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
                    <td className="px-3 py-3 text-muted-foreground" colSpan={9}>
                      Chưa có biến thể.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableWrap>

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
            <Card className="border-border bg-accent-muted/40">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-foreground">
                  Sửa biến thể #{editingVariantId}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    uiSize="sm"
                    onClick={cancelEditVariant}
                  >
                    Hủy
                  </Button>
                  <Button uiSize="sm" onClick={onSaveVariant}>
                    Lưu
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <label className="grid gap-0.5">
                  <Label>Gói</Label>
                  <Select
                    uiSize="sm"
                    value={editVariant.plan_id ?? ""}
                    onChange={(e) =>
                      setEditVariant((p) => ({
                        ...p,
                        plan_id:
                          e.target.value === "" ? null : Number(e.target.value),
                      }))
                    }
                  >
                    <option value="">(không có)</option>
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.slug}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-0.5">
                  <Label>Tên (EN)</Label>
                  <Input
                    uiSize="sm"
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
                    uiSize="sm"
                    value={editVariant.name_vi ?? ""}
                    onChange={(e) =>
                      setEditVariant((p) => ({ ...p, name_vi: e.target.value }))
                    }
                  />
                </label>
                <label className="grid gap-0.5">
                  <Label>SKU</Label>
                  <Input
                    uiSize="sm"
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
                    uiSize="sm"
                    value={editVariant.fulfillment_type ?? "PREORDER"}
                    onChange={(e) =>
                      setEditVariant((p) => ({
                        ...p,
                        fulfillment_type: e.target.value as
                          | "IN_STOCK"
                          | "PREORDER",
                        preorder_limit:
                          e.target.value === "PREORDER"
                            ? (p.preorder_limit ?? null)
                            : null,
                        preorder_delivery_hours:
                          e.target.value === "PREORDER"
                            ? (p.preorder_delivery_hours ?? null)
                            : null,
                      }))
                    }
                  >
                    <option value="IN_STOCK">Giao từ kho (IN_STOCK)</option>
                    <option
                      value="PREORDER"
                      disabled={editingVariantStockCount > 0}
                    >
                      Đặt trước (PREORDER)
                    </option>
                  </Select>
                  {editingVariantStockCount > 0 ? (
                    <p className="text-[10px] text-muted-foreground">
                      Biến thể đang có {editingVariantStockCount} dòng kho —
                      không thể chuyển sang PREORDER. Xóa hết kho (tab Kho)
                      trước.
                    </p>
                  ) : null}
                </label>
                {editVariant.fulfillment_type === "PREORDER" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giới hạn pre-order</Label>
                      <Input
                        uiSize="sm"
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
                        uiSize="sm"
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
                    uiSize="sm"
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
                    uiSize="sm"
                    value={editVariant.warranty_type ?? "NONE"}
                    onChange={(e) =>
                      setEditVariant((p) => ({
                        ...p,
                        warranty_type: e.target.value as
                          | "LOGIN"
                          | "CUSTOM"
                          | "NONE",
                      }))
                    }
                  >
                    <option value="NONE">NONE</option>
                    <option value="LOGIN">LOGIN</option>
                    <option value="CUSTOM">CUSTOM</option>
                  </Select>
                </label>
                {editVariant.warranty_type === "CUSTOM" && (
                  <>
                    <label className="grid gap-0.5">
                      <Label>Giá trị BH</Label>
                      <Input
                        uiSize="sm"
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
                        uiSize="sm"
                        value={editVariant.warranty_unit ?? "HOUR"}
                        onChange={(e) =>
                          setEditVariant((p) => ({
                            ...p,
                            warranty_unit: e.target.value as
                              | "HOUR"
                              | "DAY"
                              | "MONTH"
                              | "YEAR",
                          }))
                        }
                      >
                        <option value="HOUR">HOUR</option>
                        <option value="DAY">DAY</option>
                        <option value="MONTH">MONTH</option>
                        <option value="YEAR">YEAR</option>
                      </Select>
                    </label>
                  </>
                )}
                <label className="grid gap-0.5">
                  <Label>Đang bán</Label>
                  <Select
                    uiSize="sm"
                    value={String(editVariant.is_active ?? true)}
                    onChange={(e) =>
                      setEditVariant((p) => ({
                        ...p,
                        is_active: e.target.value === "true",
                      }))
                    }
                  >
                    <option value="true">có</option>
                    <option value="false">không</option>
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
                    uiSize="sm"
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
                    uiSize="sm"
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
                <Alert tone="warning">
                  Chưa có biến thể «Giao từ kho» (IN_STOCK). Tạo hoặc sửa biến
                  thể ở tab Biến thể, chọn cách giao IN_STOCK, rồi quay lại nhập
                  kho.
                </Alert>
              ) : null}
              {stockOnNonInStockVariants.length > 0 ? (
                <Alert tone="warning">
                  Có {stockOnNonInStockVariants.length} dòng kho thuộc biến thể
                  không còn IN_STOCK. Biến thể đã có kho không được đổi sang
                  PREORDER — xóa kho (tab này) hoặc giữ IN_STOCK.
                </Alert>
              ) : null}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <label className="grid gap-0.5">
                  <Label>Biến thể (Giao từ kho)</Label>
                  <Select
                    uiSize="sm"
                    value={addStockVariantId}
                    disabled={inStockVariants.length === 0}
                    onChange={(e) =>
                      setAddStockVariantId(
                        e.target.value === "" ? "" : Number(e.target.value),
                      )
                    }
                  >
                    <option value="">Chọn…</option>
                    {inStockVariants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.id} — {v.name_en}
                      </option>
                    ))}
                  </Select>
                </label>
                <label className="grid gap-0.5">
                  <Label>Ghi chú (tuỳ chọn)</Label>
                  <Input
                    uiSize="sm"
                    value={addStockNote}
                    onChange={(e) => setAddStockNote(e.target.value)}
                    placeholder="đợt, nguồn…"
                  />
                </label>
                <div className="flex items-end">
                  <Button
                    type="submit"
                    uiSize="sm"
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
          <TableWrap>
            <TableHeader>
              <div className="flex items-center gap-2 flex-wrap">
                <Select
                  uiSize="sm"
                  className="w-32"
                  value={stockVariantId}
                  onChange={(e) => {
                    setStockVariantId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    );
                  }}
                >
                  <option value="">Mọi biến thể IN_STOCK</option>
                  {inStockVariants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.id} — {v.name_en}
                    </option>
                  ))}
                </Select>
                <Select
                  uiSize="sm"
                  className="w-28"
                  value={stockStatus}
                  onChange={(e) => setStockStatus(e.target.value)}
                >
                  <option value="">(mọi trạng thái)</option>
                  <option value="AVAILABLE">AVAILABLE</option>
                  <option value="RESERVED">RESERVED</option>
                  <option value="DELIVERED">DELIVERED</option>
                </Select>
                <Button
                  variant="ghost"
                  uiSize="sm"
                  onClick={() => void loadStock()}
                >
                  Làm mới
                </Button>
              </div>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {stockLoading ? "Đang tải…" : `${stockItems.length} dòng kho`}
              </span>
            </TableHeader>
            <Table>
              <thead className="bg-muted text-muted-foreground">
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
                    className="border-t border-border-subtle hover:bg-muted/50"
                  >
                    <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                      {s.id}
                    </td>
                    <td className="px-3 py-1.5 text-foreground">
                      {s.variant_id}
                    </td>
                    <td className="px-3 py-1.5">
                      <Badge tone={stockBadgeTone(s.status)}>{s.status}</Badge>
                    </td>
                    <td className="px-3 py-1.5 text-foreground">
                      {s.order_id ?? "—"}
                    </td>
                    <td className="px-3 py-1.5 font-mono text-[10px] whitespace-pre-wrap break-all max-w-[400px]">
                      {s.payload}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {s.status === "AVAILABLE" && (
                        <Button
                          variant="ghost"
                          uiSize="sm"
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
                    <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                      Chưa có dòng kho.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </TableWrap>
        </div>
      )}
    </div>
  );
}
