"use client";

import { useEffect, useMemo, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  adminCreateCategory,
  adminDeleteCategory,
  adminListCategoriesFlat,
  adminUpdateCategory,
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

type Category = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  parent_id?: number | null;
};
type CategoryRow = Category & { level: number; hasChildren: boolean };

export default function AdminCategoriesPage() {
  const token = useAdminToken();
  const [items, setItems] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const [name, setName] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [parentId, setParentId] = useState<number | "">("");
  const [draftImg, setDraftImg] = useState<Record<number, string>>({});
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  useEffect(() => {
    if (!token) return;
    adminListCategoriesFlat(token)
      .then((r) => setItems(r))
      .catch((e: unknown) =>
        setError(
          e instanceof ApiError ? e.message : "Không tải được danh mục.",
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  const { rows, parentOptions } = useMemo(() => {
    const byParent = new Map<number | null, Category[]>();
    for (const c of items) {
      const key = c.parent_id ?? null;
      const arr = byParent.get(key) ?? [];
      arr.push(c);
      byParent.set(key, arr);
    }
    for (const arr of byParent.values()) {
      arr.sort((a, b) => a.name.localeCompare(b.name));
    }

    const out: CategoryRow[] = [];
    const opts: Array<{ id: number; label: string }> = [];
    const walk = (parent: number | null, level: number) => {
      const children = byParent.get(parent) ?? [];
      for (const c of children) {
        const hasChildren = (byParent.get(c.id)?.length ?? 0) > 0;
        out.push({ ...c, level, hasChildren });
        opts.push({ id: c.id, label: `${"— ".repeat(level)}${c.name}` });
        if (hasChildren && expanded[c.id] !== false) {
          walk(c.id, level + 1);
        }
      }
    };
    walk(null, 0);
    return { rows: out, parentOptions: opts };
  }, [items, expanded]);

  const resetForm = () => {
    setName("");
    setImageUrl("");
    setParentId("");
    setEditingId(null);
  };

  const onSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const updated = await adminUpdateCategory(token, editingId, {
          name,
          image_url: imageUrl || null,
          parent_id: parentId === "" ? null : parentId,
        });
        setItems((prev) =>
          prev.map((c) =>
            c.id === editingId ? (updated as unknown as Category) : c,
          ),
        );
        setDraftImg((prev) => ({
          ...prev,
          [editingId]: updated.image_url ?? "",
        }));
      } else {
        const created = await adminCreateCategory(token, {
          name,
          image_url: imageUrl || null,
          parent_id: parentId === "" ? undefined : parentId,
        });
        setItems((prev) => [...prev, created as unknown as Category]);
        setDraftImg((prev) => ({
          ...prev,
          [created.id]: created.image_url ?? "",
        }));
      }
      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Lưu danh mục thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  const onStartEdit = (row: CategoryRow) => {
    setEditingId(row.id);
    setName(row.name);
    setImageUrl(row.image_url ?? "");
    setParentId(row.parent_id ?? "");
    setShowForm(true);
  };

  const onSaveImage = async (id: number) => {
    if (!token) return;
    setUpdatingId(id);
    setError(null);
    try {
      const next = draftImg[id] ?? "";
      const updated = await adminUpdateCategory(token, id, {
        image_url: next || null,
      });
      setItems((prev) =>
        prev.map((c) => (c.id === id ? (updated as unknown as Category) : c)),
      );
      setDraftImg((prev) => ({ ...prev, [id]: updated.image_url ?? "" }));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Cập nhật ảnh thất bại.",
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const onDelete = async (id: number) => {
    if (!token) return;
    if (!confirm(`Xóa danh mục #${id}?`)) return;
    setUpdatingId(id);
    setError(null);
    try {
      await adminDeleteCategory(token, id);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Xóa danh mục thất bại.",
      );
    } finally {
      setUpdatingId(null);
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
          <div className="text-xs font-bold text-muted-foreground">
            {loading ? "Đang tải…" : `${rows.length} danh mục`}
          </div>
          <Button
            uiSize="sm"
            onClick={() => {
              if (showForm) {
                resetForm();
                setShowForm(false);
              } else {
                setShowForm(true);
              }
            }}
          >
            {showForm ? "Hủy" : "+ Mới"}
          </Button>
        </TableHeader>

        {showForm && (
          <form
            onSubmit={onSubmitForm}
            className="border-b border-border bg-muted/40 p-3"
          >
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <label className="grid gap-0.5">
                <Label>Tên</Label>
                <Input
                  uiSize="sm"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </label>
              <label className="grid gap-0.5">
                <Label>URL ảnh</Label>
                <Input
                  uiSize="sm"
                  value={imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="grid gap-0.5">
                <Label>Cha</Label>
                <Select
                  uiSize="sm"
                  value={parentId}
                  onChange={(e) =>
                    setParentId(
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                >
                  <option value="">(không có)</option>
                  {parentOptions.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.id} — {c.label}
                    </option>
                  ))}
                </Select>
              </label>
            </div>
            <div className="flex justify-end mt-2">
              <Button type="submit" uiSize="sm" disabled={saving}>
                {saving ? "Đang lưu…" : editingId ? "Lưu" : "Tạo"}
              </Button>
            </div>
          </form>
        )}

        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="text-left px-3 py-1.5 font-bold">ID</th>
              <th className="text-left px-3 py-1.5 font-bold">Tên</th>
              <th className="text-left px-3 py-1.5 font-bold">Slug</th>
              <th className="text-left px-3 py-1.5 font-bold">Ảnh</th>
              <th className="text-left px-3 py-1.5 font-bold">Cha</th>
              <th className="text-right px-3 py-1.5 font-bold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => (
              <tr
                key={c.id}
                className="border-t border-border-subtle hover:bg-muted/40"
              >
                <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {c.id}
                </td>
                <td className="px-3 py-1.5 font-bold text-foreground">
                  <div
                    className="flex items-center gap-1"
                    style={{ paddingLeft: `${c.level * 16}px` }}
                  >
                    {c.hasChildren ? (
                      <Button
                        type="button"
                        uiSize="sm"
                        variant="ghost"
                        className="h-6 px-1 text-[10px]"
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [c.id]: !(prev[c.id] !== false),
                          }))
                        }
                        aria-label={
                          expanded[c.id] !== false ? "Thu gọn" : "Mở rộng"
                        }
                      >
                        {expanded[c.id] !== false ? "Thu" : "Mở"}
                      </Button>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                    <span>{c.name}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                  {c.slug}
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    uiSize="sm"
                    className="w-48"
                    value={draftImg[c.id] ?? c.image_url ?? ""}
                    placeholder="https://..."
                    onChange={(e) =>
                      setDraftImg((prev) => ({
                        ...prev,
                        [c.id]: e.target.value,
                      }))
                    }
                  />
                </td>
                <td className="px-3 py-1.5 text-muted-foreground">
                  {c.parent_id ?? "—"}
                </td>
                <td className="px-3 py-1.5 text-right">
                  <Button
                    variant="ghost"
                    uiSize="sm"
                    type="button"
                    disabled={updatingId === c.id}
                    onClick={() => onStartEdit(c)}
                  >
                    Sửa
                  </Button>
                  <Button
                    variant="ghost"
                    uiSize="sm"
                    type="button"
                    disabled={updatingId === c.id}
                    onClick={() => onSaveImage(c.id)}
                  >
                    {updatingId === c.id ? "..." : "Lưu ảnh"}
                  </Button>
                  <Button
                    variant="ghost"
                    uiSize="sm"
                    type="button"
                    disabled={updatingId === c.id}
                    onClick={() => onDelete(c.id)}
                  >
                    Xóa
                  </Button>
                </td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-3 text-muted-foreground" colSpan={6}>
                  Chưa có danh mục.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrap>
    </div>
  );
}
