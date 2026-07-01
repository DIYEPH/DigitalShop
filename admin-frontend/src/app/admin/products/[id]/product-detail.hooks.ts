"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
  PAYMENT_METHOD_OPTIONS,
  type VariantPaymentMethod,
} from "@/components/admin/payment-method-picker";
import { ApiError } from "@/lib/api/client";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { getActiveShopId } from "@/lib/shop-context";
import {
  buildVariantPricesPayload,
  pricesFromVariantList,
} from "@/lib/format-price";
import { toCategoryName } from "./product-detail.constants";
import { productDetailService } from "./product-detail.service";
import type {
  AdminPlan,
  AdminProductDetail,
  AdminStockItem,
  AdminVariant,
  Category,
  EditableVariant,
  Tab,
} from "./product-detail.types";

export function useProductDetail() {
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
    const shopId = getActiveShopId();
    if (!shopId) {
      queueMicrotask(() => {
        setError("Create or select a shop first.");
        setLoading(false);
      });
      return;
    }
    Promise.all([
      productDetailService.get(token, productId),
      productDetailService.listCategories(token, shopId),
    ])
      .then(([p, c]) => {
        setData(p);
        setCats(
          c.categories
            .filter((category) => category.is_selected)
            .map((category) => ({
              id: category.id,
              name: toCategoryName(category),
              slug: category.slug,
            })),
        );
        setProductNameEn(p.name_en);
        setProductNameVi(p.name_vi);
        setProductDescEn(p.description_en);
        setProductDescVi(p.description_vi);
        setProductImageUrl(p.image_url ?? "");
        setProductCategoryId(p.category_id);
        if (p.plans[0]?.id) setVariantPlanId(p.plans[0].id);
      })
      .catch((e: unknown) =>
        setError(e instanceof ApiError ? e.message : "Không tải được sản phẩm."),
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
      await productDetailService.updateProduct(token, data.id, {
        name_en: productNameEn,
        name_vi: productNameVi,
        description_en: productDescEn,
        description_vi: productDescVi,
        image_url: productImageUrl || null,
        category_id: productCategoryId,
      });
      const refreshed = await productDetailService.get(token, data.id);
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
      const created = await productDetailService.createPlan(token, data.id, {
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
      const updated = await productDetailService.updatePlan(token, data.id, p.id, {
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
      setError(err instanceof ApiError ? err.message : "Cập nhật gói thất bại.");
    }
  };

  const onDeletePlan = async (p: AdminPlan) => {
    if (!token || !data) return;
    if (!confirm("Xóa gói? Các biến thể sẽ bị gỡ khỏi gói.")) return;
    setError(null);
    try {
      await productDetailService.deletePlan(token, data.id, p.id);
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
      const created = await productDetailService.createVariant(token, data.id, {
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
      setError(err instanceof ApiError ? err.message : "Tạo biến thể thất bại.");
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
      const updated = await productDetailService.updateVariant(
        token,
        editingVariantId,
        {
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
        },
      );
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
      await productDetailService.deleteVariant(token, v.id);
      setData((prev) =>
        prev
          ? { ...prev, variants: prev.variants.filter((x) => x.id !== v.id) }
          : prev,
      );
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa biến thể thất bại.");
    }
  };

  // -- Stock --
  const loadStock = async (showLoading = true) => {
    if (!token) return;
    if (showLoading) setStockLoading(true);
    try {
      const r = await productDetailService.listStock(token, {
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
      productDetailService
        .listStock(token, {
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
      const r = await productDetailService.addStock(token, {
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
      await productDetailService.deleteStock(token, stockId);
      setStockItems((prev) => prev.filter((s) => s.id !== stockId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa kho thất bại.");
    }
  };

  return {
    token,
    data,
    setData,
    cats,
    loading,
    error,
    tab,
    setTab,
    // product fields
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
    // plan fields
    planSlug,
    setPlanSlug,
    planNameEn,
    setPlanNameEn,
    planNameVi,
    setPlanNameVi,
    onCreatePlan,
    onSavePlan,
    onDeletePlan,
    // variant create fields
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
    // edit variant
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
    // volume tiers
    tierVariantId,
    setTierVariantId,
    // stock
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
    // derived
    plans,
    variants,
    inStockVariants,
    stockOnNonInStockVariants,
  };
}
