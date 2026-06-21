"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  FieldHint,
  Input,
  Label,
  Select,
} from "@/components/ui";
import { ApiError } from "@/lib/api/client";
import {
  adminListVolumeTiers,
  adminReplaceVolumeTiers,
  type AdminVolumeTier,
} from "@/lib/api/admin";
import { cn } from "@/lib/cn";

type Props = {
  token: string;
  variantId: number;
  variantLabel: string;
  onSaved?: (tiers: AdminVolumeTier[]) => void;
};

type Row = {
  min_quantity: number | "";
  discount_bps: number | "";
  is_active: boolean;
};

const MIN_QTY = 2;
const MIN_BPS = 1;
const MAX_BPS = 9000;

function fromApi(tiers: AdminVolumeTier[]): Row[] {
  return [...tiers]
    .sort((a, b) => Number(a.min_quantity) - Number(b.min_quantity))
    .map((t) => ({
      min_quantity: Number(t.min_quantity),
      discount_bps: Number(t.discount_bps),
      is_active: t.is_active ?? true,
    }));
}

function bpsToPercent(bps: number | "" | null | undefined): string {
  if (typeof bps !== "number" || !Number.isFinite(bps)) return "";
  return (bps / 100).toFixed(bps % 100 === 0 ? 0 : 2);
}

type RowIssue = { mq?: string; bps?: string; dup?: boolean };

function validateRows(rows: Row[]): { issues: RowIssue[]; hasError: boolean } {
  const issues: RowIssue[] = rows.map(() => ({}));
  const counts = new Map<number, number>();
  rows.forEach((r) => {
    if (
      typeof r.min_quantity === "number" &&
      Number.isInteger(r.min_quantity)
    ) {
      counts.set(r.min_quantity, (counts.get(r.min_quantity) ?? 0) + 1);
    }
  });
  rows.forEach((r, i) => {
    const issue = issues[i];
    if (r.min_quantity === "") issue.mq = "Bắt buộc.";
    else if (
      !Number.isInteger(Number(r.min_quantity)) ||
      Number(r.min_quantity) < MIN_QTY
    ) {
      issue.mq = `Phải là số nguyên ≥ ${MIN_QTY}.`;
    } else if ((counts.get(Number(r.min_quantity)) ?? 0) > 1) {
      issue.dup = true;
      issue.mq = "Trùng số lượng tối thiểu.";
    }
    if (r.discount_bps === "") issue.bps = "Bắt buộc.";
    else if (
      !Number.isInteger(Number(r.discount_bps)) ||
      Number(r.discount_bps) < MIN_BPS ||
      Number(r.discount_bps) > MAX_BPS
    ) {
      issue.bps = `${MIN_BPS}–${MAX_BPS}.`;
    }
  });
  const hasError = issues.some((x) => x.mq || x.bps);
  return { issues, hasError };
}

export default function VolumeTierEditor({
  token,
  variantId,
  variantLabel,
  onSaved,
}: Props) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminListVolumeTiers(token, variantId)
      .then((data) => {
        if (cancelled) return;
        setRows(fromApi(data));
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(
          e instanceof ApiError ? e.message : "Không tải được bậc khối lượng.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token, variantId]);

  const { issues, hasError } = useMemo(() => validateRows(rows), [rows]);
  const dupCount = useMemo(() => issues.filter((x) => x.dup).length, [issues]);

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      { min_quantity: "", discount_bps: "", is_active: true },
    ]);
  const removeRow = (idx: number) =>
    setRows((prev) => prev.filter((_, i) => i !== idx));
  const sortRows = () =>
    setRows((prev) =>
      [...prev].sort((a, b) => {
        const aq =
          typeof a.min_quantity === "number"
            ? a.min_quantity
            : Number.POSITIVE_INFINITY;
        const bq =
          typeof b.min_quantity === "number"
            ? b.min_quantity
            : Number.POSITIVE_INFINITY;
        return aq - bq;
      }),
    );

  const onSave = async () => {
    setError(null);
    setInfo(null);
    if (hasError) {
      setError("Sửa các dòng lỗi trước khi lưu.");
      return;
    }
    setSaving(true);
    try {
      const cleaned: AdminVolumeTier[] = rows
        .filter((r) => r.min_quantity !== "" && r.discount_bps !== "")
        .map((r) => ({
          min_quantity: Number(r.min_quantity),
          discount_bps: Number(r.discount_bps),
          is_active: r.is_active,
        }));
      const saved = await adminReplaceVolumeTiers(token, variantId, cleaned);
      setRows(fromApi(saved));
      setInfo(`Đã lưu ${saved.length} bậc.`);
      onSaved?.(saved);
    } catch (e: unknown) {
      setError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Lưu bậc thất bại.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-border-subtle bg-muted/30">
      <div className="mb-2 flex items-center justify-between">
        <div className="grid">
          <span className="text-xs font-semibold text-foreground">
            Bậc theo khối lượng · biến thể #{variantId}
          </span>
          <FieldHint>{variantLabel}</FieldHint>
        </div>
        <div className="flex gap-1">
          <Button
            uiSize="sm"
            variant="ghost"
            type="button"
            onClick={sortRows}
            disabled={loading || rows.length < 2}
          >
            Sắp xếp
          </Button>
          <Button
            uiSize="sm"
            variant="ghost"
            type="button"
            onClick={addRow}
            disabled={loading}
          >
            + Bậc
          </Button>
          <Button
            uiSize="sm"
            type="button"
            onClick={onSave}
            disabled={loading || saving || hasError}
          >
            {saving ? "Đang lưu…" : "Lưu bậc"}
          </Button>
        </div>
      </div>

      {error ? (
        <Alert tone="error" className="mb-2" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {info ? (
        <Alert tone="success" className="mb-2" onDismiss={() => setInfo(null)}>
          {info}
        </Alert>
      ) : null}
      {dupCount > 0 ? (
        <Alert tone="warning" className="mb-2">
          Trùng min_quantity: {dupCount}
        </Alert>
      ) : null}

      {loading ? (
        <FieldHint>Đang tải…</FieldHint>
      ) : rows.length === 0 ? (
        <FieldHint>Chưa có bậc khối lượng.</FieldHint>
      ) : (
        <div className="grid gap-1">
          {rows.map((r, idx) => {
            const iss = issues[idx] || {};
            return (
              <div
                key={idx}
                className={cn(
                  "flex flex-wrap items-end gap-2 rounded-lg border bg-surface px-3 py-2",
                  iss.dup
                    ? "border-warning"
                    : iss.mq || iss.bps
                      ? "border-danger/40"
                      : "border-border",
                )}
              >
                <label className="grid gap-0.5">
                  <Label>SL tối thiểu</Label>
                  <Input
                    uiSize="sm"
                    type="number"
                    min={MIN_QTY}
                    className={cn("w-20", iss.mq && "border-danger")}
                    value={r.min_quantity}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                min_quantity:
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                              }
                            : x,
                        ),
                      )
                    }
                  />
                  {iss.mq ? (
                    <span className="text-[10px] font-semibold text-danger">
                      {iss.mq}
                    </span>
                  ) : null}
                </label>
                <label className="grid gap-0.5">
                  <Label>Chiết khấu (bps)</Label>
                  <Input
                    uiSize="sm"
                    type="number"
                    min={MIN_BPS}
                    max={MAX_BPS}
                    className={cn("w-24", iss.bps && "border-danger")}
                    value={r.discount_bps}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? {
                                ...x,
                                discount_bps:
                                  e.target.value === ""
                                    ? ""
                                    : Number(e.target.value),
                              }
                            : x,
                        ),
                      )
                    }
                    placeholder="e.g. 1000"
                  />
                  {iss.bps ? (
                    <span className="text-[10px] font-semibold text-danger">
                      {iss.bps}
                    </span>
                  ) : null}
                </label>
                <FieldHint className="pb-1.5 font-semibold">
                  ≈ {bpsToPercent(r.discount_bps)}%
                </FieldHint>
                <label className="inline-flex items-center gap-1 pb-1.5">
                  <Label>Hiển thị</Label>
                  <Select
                    uiSize="sm"
                    className="w-24"
                    value={String(r.is_active)}
                    onChange={(e) =>
                      setRows((prev) =>
                        prev.map((x, i) =>
                          i === idx
                            ? { ...x, is_active: e.target.value === "true" }
                            : x,
                        ),
                      )
                    }
                  >
                    <option value="true">Có</option>
                    <option value="false">Không</option>
                  </Select>
                </label>
                <div className="ml-auto pb-1.5">
                  <Button
                    uiSize="sm"
                    variant="ghost"
                    type="button"
                    onClick={() => removeRow(idx)}
                  >
                    Xóa
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
