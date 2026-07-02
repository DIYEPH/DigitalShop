"use client";

import { Alert, Badge, Button, Input, Table } from "@/components/ui";
import { useCustomers } from "./customers.hooks";

function formatDate(value: string) {
  return new Date(value).toLocaleString();
}

export default function AdminCustomersPage() {
  const {
    customers,
    total,
    page,
    totalPages,
    search,
    setSearch,
    loading,
    error,
    busyUserId,
    load,
    setStatus,
  } = useCustomers();

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-brutal-fg">
          Khách hàng
        </h1>
        <p className="text-sm text-gray-600">
          Người mua của shop — theo dõi chi tiêu và chặn khi cần
        </p>
      </div>

      {error ? <Alert variant="danger">{error}</Alert> : null}

      <div className="rounded-brutal border-3 border-brutal bg-brutal-bg p-3 shadow-brutal-sm">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-semibold text-gray-600">
            {loading ? "Đang tải…" : `${total} khách`}
          </div>
          <form
            className="flex w-full flex-wrap items-center gap-1.5 sm:w-auto"
            onSubmit={(e) => {
              e.preventDefault();
              void load({ page: 1, search });
            }}
          >
            <Input
              size="sm"
              className="w-full min-w-0 flex-1 sm:w-64 sm:flex-none"
              placeholder="Tìm email / username / tên"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Button variant="primary" size="sm" type="submit" disabled={loading}>
              Tìm
            </Button>
            <Button
              size="sm"
              type="button"
              variant="ghost"
              disabled={loading || !search}
              onClick={() => {
                setSearch("");
                void load({ page: 1, search: "" });
              }}
            >
              Xóa lọc
            </Button>
          </form>
        </div>
      </div>

      <Table>
        <thead className="bg-brutal-muted text-gray-600">
          <tr>
            <th className="px-3 py-2 text-left font-semibold">User</th>
            <th className="px-3 py-2 text-left font-semibold">Liên hệ</th>
            <th className="px-3 py-2 text-right font-semibold">Đơn</th>
            <th className="px-3 py-2 text-right font-semibold">Đã chi (USDT)</th>
            <th className="px-3 py-2 text-left font-semibold">Khách từ</th>
            <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
            <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => {
            const banned = c.status === "BANNED";
            return (
              <tr
                key={c.user_id}
                className="border-t-3 border-brutal transition-colors duration-150 hover:bg-brutal-muted"
              >
                <td className="px-3 py-2">
                  <div className="font-semibold text-brutal-fg">
                    {c.full_name ?? c.username ?? `user #${c.user_id}`}
                  </div>
                  <div className="font-mono text-[11px] text-gray-600">
                    #{c.user_id}
                  </div>
                </td>
                <td className="px-3 py-2 text-xs text-brutal-fg">
                  <div>{c.email ?? "—"}</div>
                  {c.telegram_id ? (
                    <div className="text-gray-600">tg: {c.telegram_id}</div>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right text-brutal-fg">
                  {c.order_count}
                </td>
                <td className="px-3 py-2 text-right font-semibold text-brutal-fg">
                  {c.total_spent.toLocaleString("vi-VN")}
                </td>
                <td className="px-3 py-2 text-xs text-gray-600">
                  {formatDate(c.first_seen_at)}
                </td>
                <td className="px-3 py-2">
                  <Badge variant={banned ? "danger" : "success"} size="sm">
                    {banned ? "Đã chặn" : "Hoạt động"}
                  </Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <Button
                    size="sm"
                    variant={banned ? "outline" : "danger"}
                    disabled={busyUserId === c.user_id}
                    onClick={() =>
                      void setStatus(c.user_id, banned ? "ACTIVE" : "BANNED")
                    }
                  >
                    {banned ? "Bỏ chặn" : "Chặn mua"}
                  </Button>
                </td>
              </tr>
            );
          })}
          {!loading && customers.length === 0 && (
            <tr>
              <td className="px-3 py-4 text-gray-600" colSpan={7}>
                Chưa có khách hàng.
              </td>
            </tr>
          )}
        </tbody>
      </Table>

      {totalPages > 1 ? (
        <div className="flex items-center justify-end gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={loading || page <= 1}
            onClick={() => void load({ page: page - 1 })}
          >
            Trước
          </Button>
          <span className="text-xs font-semibold text-gray-600">
            {page}/{totalPages}
          </span>
          <Button
            size="sm"
            variant="outline"
            disabled={loading || page >= totalPages}
            onClick={() => void load({ page: page + 1 })}
          >
            Sau
          </Button>
        </div>
      ) : null}
    </div>
  );
}
