"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Button,
  FieldHint,
  Input,
  Label,
  RichEditor,
  Select,
  Table,
  TableHeader,
  TableWrap,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import { adminCreateProduct, adminDeleteProduct, adminListCategoriesFlat, adminListProducts } from "@/lib/api/admin";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import { formatUsdt, formatVnd } from "@/lib/format-price";

type Product = {
  id: number;
  name_en: string;
  name_vi: string;
  slug: string;
  price_usdt: number;
  price_vnd: number;
  name?: string;
  price?: number;
  currency?: string;
  image_url?: string | null;
  category?: { id: number; name: string; slug: string } | null;
};

type Category = { id: number; name: string; slug: string };

export default function AdminProductsPage() {
  const token = useAdminToken();
  const [items, setItems] = useState<Product[]>([]);
  const [cats, setCats] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [nameEn, setNameEn] = useState("");
  const [nameVi, setNameVi] = useState("");
  const [descriptionEn, setDescriptionEn] = useState("");
  const [descriptionVi, setDescriptionVi] = useState("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [categoryId, setCategoryId] = useState<number | "">("");

  const loadProducts = async () => {
    if (!token) return;
    const p = await adminListProducts(token, { page: 1, limit: 50 });
    setItems(p.data);
  };

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => {
      setLoading(true);
      setError(null);
      Promise.all([
        adminListProducts(token, { page: 1, limit: 50 }),
        adminListCategoriesFlat(token),
      ])
        .then(([p, c]) => {
          setItems(p.data);
          setCats(c as unknown as Category[]);
        })
        .catch((e: unknown) => setError(e instanceof ApiError ? e.message : "Không tải được danh sách sản phẩm."))
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
      if (categoryId === "") throw new Error("Chưa chọn danh mục");
      await adminCreateProduct(token, {
        name_en: nameEn,
        name_vi: nameVi,
        description_en: descriptionEn,
        description_vi: descriptionVi,
        image_url: imageUrl || null,
        category_id: categoryId,
      });
      await loadProducts();
      setNameEn("");
      setNameVi("");
      setDescriptionEn("");
      setDescriptionVi("");
      setImageUrl("");
      setCategoryId("");
      setShowForm(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Tạo sản phẩm thất bại.");
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: number) => {
    if (!token) return;
    if (!confirm("Xóa sản phẩm này?")) return;
    setError(null);
    try {
      await adminDeleteProduct(token, id);
      setItems((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Xóa thất bại.");
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Sản phẩm</h1>
        <p className="text-sm text-muted-foreground">Quản lý sản phẩm, gói và biến thể</p>
      </div>

      {error ? <Alert tone="error" onDismiss={() => setError(null)}>{error}</Alert> : null}

      <TableWrap>
        <TableHeader>
          <div className="text-xs font-semibold text-muted-foreground">
            {loading ? "Đang tải…" : `${rows.length} sản phẩm`}
          </div>
          <Button uiSize="sm" onClick={() => setShowForm(!showForm)}>
            {showForm ? "Hủy" : "+ Mới"}
          </Button>
        </TableHeader>

        {showForm && (
          <form onSubmit={onCreate} className="border-b border-border bg-muted/40 p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <label className="grid gap-1">
                <Label>Tên (EN)</Label>
                <Input uiSize="sm" value={nameEn} onChange={(e) => setNameEn(e.target.value)} />
              </label>
              <label className="grid gap-1">
                <Label>Tên (VI)</Label>
                <Input uiSize="sm" value={nameVi} onChange={(e) => setNameVi(e.target.value)} />
              </label>
            </div>
            <label className="mt-4 grid gap-1">
              <Label>Mô tả (EN)</Label>
              <RichEditor value={descriptionEn} onChange={setDescriptionEn} placeholder="Mô tả tiếng Anh…" />
            </label>
            <label className="mt-4 grid gap-1">
              <Label>Mô tả (VI)</Label>
              <RichEditor value={descriptionVi} onChange={setDescriptionVi} placeholder="Mô tả tiếng Việt…" />
            </label>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              <label className="grid gap-1">
                <Label>URL ảnh</Label>
                <Input
                  uiSize="sm"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="grid gap-1">
                <Label>Danh mục</Label>
                <Select
                  uiSize="sm"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value === "" ? "" : Number(e.target.value))}
                >
                  <option value="">Chọn…</option>
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.name}
                    </option>
                  ))}
                </Select>
              </label>
              <div className="flex items-end">
                <Button type="submit" uiSize="sm" disabled={saving} className="w-full">
                  {saving ? "Đang tạo…" : "Tạo"}
                </Button>
              </div>
            </div>
            <FieldHint className="mt-4">
              Phương thức thanh toán cấu hình ở từng <strong className="text-foreground">biến thể</strong> sau khi
              tạo sản phẩm.
            </FieldHint>
          </form>
        )}

        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">ID</th>
              <th className="px-3 py-2 text-left font-semibold">Tên</th>
              <th className="px-3 py-2 text-left font-semibold">Giá</th>
              <th className="px-3 py-2 text-left font-semibold">Danh mục</th>
              <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((p) => (
              <tr
                key={p.id}
                className="border-t border-border-subtle transition-colors duration-150 hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{p.id}</td>
                <td className="px-3 py-2">
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-semibold text-foreground transition-colors hover:text-primary"
                  >
                    <span className="block">{p.name_en}</span>
                    <span className="block text-[11px] font-normal text-muted-foreground">{p.name_vi}</span>
                  </Link>
                </td>
                <td className="px-3 py-2 text-foreground">
                  <div className="grid gap-0.5 text-xs">
                    <span>{formatUsdt(p.price_usdt ?? p.price)}</span>
                    <span className="text-muted-foreground">{formatVnd(p.price_vnd)}</span>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{p.category?.name ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  <div className="inline-flex gap-1">
                    <Link href={`/admin/products/${p.id}`}>
                      <Button variant="ghost" uiSize="sm">
                        Quản lý
                      </Button>
                    </Link>
                    <Button variant="ghost" uiSize="sm" onClick={() => onDelete(p.id)}>
                      Xóa
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                  Chưa có sản phẩm.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
