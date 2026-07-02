"use client";

import Link from "next/link";
import {
  Alert,
  Button,
  Field,
  FieldHint,
  Input,
  RichEditor,
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
import { useLanguage } from "@/lib/i18n/use-language";
import { formatUsdt, formatVnd } from "@/lib/format-price";
import { useProducts } from "./products.hooks";

export default function AdminProductsPage() {
  const { t } = useLanguage();
  const {
    loading,
    saving,
    error,
    cats,
    showForm,
    form,
    rows,
    setForm,
    setShowForm,
    onCreate,
    onDelete,
  } = useProducts();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brutal-fg">{t("nav.products")}</h1>
        <p className="text-sm text-gray-600">{t("products.subtitle")}</p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <>
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm">
          <div className="text-xs font-semibold text-gray-600">
            {loading
              ? t("common.loading")
              : `${rows.length} ${t("products.countUnit")}`}
          </div>
          <Button
            variant={showForm ? "ghost" : "primary"}
            size="sm"
            onClick={() => setShowForm(!showForm)}
          >
            {showForm ? t("common.cancel") : `+ ${t("common.new")}`}
          </Button>
        </div>

        {showForm && (
          <form onSubmit={onCreate} className="border-b-3 border-brutal bg-brutal-muted p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Field label={t("products.nameEn")}>
                <Input
                  size="sm"
                  value={form.nameEn}
                  onChange={(e) => setForm((p) => ({ ...p, nameEn: e.target.value }))}
                />
              </Field>
              <Field label={t("products.nameVi")}>
                <Input
                  size="sm"
                  value={form.nameVi}
                  onChange={(e) => setForm((p) => ({ ...p, nameVi: e.target.value }))}
                />
              </Field>
            </div>
            <Field label={t("products.descEn")} className="mt-4">
              <RichEditor
                value={form.descriptionEn}
                onChange={(value) => setForm((p) => ({ ...p, descriptionEn: value }))}
                placeholder={t("products.descEnPlaceholder")}
              />
            </Field>
            <Field label={t("products.descVi")} className="mt-4">
              <RichEditor
                value={form.descriptionVi}
                onChange={(value) => setForm((p) => ({ ...p, descriptionVi: value }))}
                placeholder={t("products.descViPlaceholder")}
              />
            </Field>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-3">
              <Field label={t("products.imageUrl")}>
                <Input
                  size="sm"
                  value={form.imageUrl}
                  onChange={(e) => setForm((p) => ({ ...p, imageUrl: e.target.value }))}
                  placeholder="https://..."
                />
              </Field>
              <Field label={t("products.category")}>
                <Select
                  value={form.categoryId === "" ? "__none" : String(form.categoryId)}
                  onValueChange={(value) =>
                    setForm((p) => ({
                      ...p,
                      categoryId: value === "__none" ? "" : Number(value),
                    }))
                  }
                >
                  <SelectTrigger className="h-9 px-3 py-1 text-sm">
                    <SelectValue placeholder={t("common.select")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">{t("common.select")}</SelectItem>
                    {cats.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)}>
                        {c.id} — {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? t("common.creating") : t("common.create")}
                </Button>
              </div>
            </div>
            <FieldHint className="mt-4">{t("products.paymentHint")}</FieldHint>
          </form>
        )}

        <Table>
          <TableHeader>
            <TableRow className="border-t-0">
              <TableHead>{t("products.colId")}</TableHead>
              <TableHead>{t("products.colName")}</TableHead>
              <TableHead>{t("products.colPrice")}</TableHead>
              <TableHead>{t("products.colCategory")}</TableHead>
              <TableHead className="text-right">{t("common.actions")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono text-[11px] text-gray-600">{p.id}</TableCell>
                <TableCell>
                  <Link
                    href={`/admin/products/${p.id}`}
                    className="font-semibold text-brutal-fg transition-colors hover:text-brutal-primary"
                  >
                    <span className="block">{p.name_en}</span>
                    <span className="block text-[11px] font-normal text-gray-600">{p.name_vi}</span>
                  </Link>
                </TableCell>
                <TableCell>
                  <div className="grid gap-0.5 text-xs">
                    <span>{formatUsdt(p.price_usdt ?? p.price)}</span>
                    <span className="text-gray-600">{formatVnd(p.price_vnd)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-gray-600">{p.category?.name ?? "—"}</TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/admin/products/${p.id}`}>
                        {t("common.manage")}
                      </Link>
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => onDelete(p.id)}>
                      {t("common.delete")}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {!loading && rows.length === 0 && (
              <TableRow>
                <TableCell className="text-gray-600" colSpan={5}>
                  {t("products.empty")}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </>
    </div>
  );
}
