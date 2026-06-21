"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api/client";
import {
  adminListUsers,
  adminSetUserRole,
  adminSetUserStatus,
  type AdminUser,
} from "@/lib/api/admin";
import { useAdminToken } from "@/lib/auth/use-admin-token";
import {
  Alert,
  Badge,
  Button,
  Card,
  Input,
  Modal,
  Table,
  TableHeader,
  TableWrap,
  userRoleBadgeTone,
  userStatusBadgeTone,
} from "@/components/ui";

function formatAccountLine(u: AdminUser): string {
  const parts: string[] = [];
  if (u.username) parts.push(`@${u.username}`);
  parts.push(`Telegram ${u.telegram_id}`);
  return parts.join(" · ");
}

export default function AdminUsersPage() {
  const token = useAdminToken();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyUserId, setBusyUserId] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [promoteUser, setPromoteUser] = useState<AdminUser | null>(null);
  const [statusUser, setStatusUser] = useState<AdminUser | null>(null);

  const loadUsers = async (nextSearch = searchQuery) => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const r = await adminListUsers(token, {
        page: 1,
        limit: 50,
        search: nextSearch.trim() || undefined,
      });
      setUsers(r.data.users);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Không tải được danh sách.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    queueMicrotask(() => void loadUsers(""));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const confirmPromote = async () => {
    if (!token || !promoteUser) return;
    setBusyUserId(promoteUser.id);
    setError(null);
    try {
      const updated = await adminSetUserRole(token, promoteUser.id, "ADMIN");
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setPromoteUser(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không cấp được quyền quản trị.",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  const confirmStatusChange = async () => {
    if (!token || !statusUser) return;
    const nextStatus = statusUser.status === "ACTIVE" ? "BANNED" : "ACTIVE";
    setBusyUserId(statusUser.id);
    setError(null);
    try {
      const updated = await adminSetUserStatus(
        token,
        statusUser.id,
        nextStatus,
      );
      setUsers((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setStatusUser(null);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Không cập nhật được trạng thái.",
      );
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          Người dùng
        </h1>
        <p className="text-sm text-muted-foreground">
          Danh sách tài khoản và cấp quyền quản trị
        </p>
      </div>

      {error ? (
        <Alert tone="error" onDismiss={() => setError(null)}>
          {error}
        </Alert>
      ) : null}

      <TableWrap>
        <TableHeader>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="text-xs font-semibold text-muted-foreground">
              {loading ? "Đang tải…" : `${users.length} tài khoản`}
            </div>
            <form
              className="flex items-center gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void loadUsers();
              }}
            >
              <Input
                uiSize="sm"
                className="w-56"
                placeholder="Tìm email, username, Telegram"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled={!token}
              />
              <Button uiSize="sm" type="submit" disabled={loading || !token}>
                Tìm
              </Button>
              <Button
                uiSize="sm"
                type="button"
                variant="ghost"
                disabled={loading || !searchQuery || !token}
                onClick={() => {
                  setSearchQuery("");
                  void loadUsers("");
                }}
              >
                Xóa lọc
              </Button>
            </form>
          </div>
        </TableHeader>

        <Table>
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left font-semibold">ID</th>
              <th className="px-3 py-2 text-left font-semibold">Tài khoản</th>
              <th className="px-3 py-2 text-left font-semibold">Vai trò</th>
              <th className="px-3 py-2 text-left font-semibold">Trạng thái</th>
              <th className="px-3 py-2 text-right font-semibold">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr
                key={u.id}
                className="border-t border-border-subtle transition-colors duration-150 hover:bg-muted/40"
              >
                <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">
                  {u.id}
                </td>
                <td className="px-3 py-2">
                  <div className="font-semibold text-foreground">
                    {u.email ?? "—"}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {formatAccountLine(u)}
                  </div>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={userRoleBadgeTone(u.role)}>{u.role}</Badge>
                </td>
                <td className="px-3 py-2">
                  <Badge tone={userStatusBadgeTone(u.status)}>{u.status}</Badge>
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-2">
                    {u.role === "USER" ? (
                      <>
                        <Button
                          uiSize="sm"
                          variant="ghost"
                          disabled={busyUserId === u.id || !token}
                          onClick={() => setStatusUser(u)}
                        >
                          {u.status === "ACTIVE" ? "Khóa" : "Mở khóa"}
                        </Button>
                        {u.status === "ACTIVE" ? (
                          <Button
                            uiSize="sm"
                            disabled={busyUserId === u.id || !token}
                            onClick={() => setPromoteUser(u)}
                          >
                            Cấp quản trị
                          </Button>
                        ) : null}
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-muted-foreground" colSpan={5}>
                  Không có kết quả.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </TableWrap>

      {promoteUser ? (
        <Modal open onClose={() => setPromoteUser(null)}>
          <Card
            className="w-full max-w-md shadow-(--shadow-md)"
            title="Cấp quyền quản trị"
            subtitle={promoteUser.email ?? `Tài khoản #${promoteUser.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-foreground">
              Tài khoản này sẽ đăng nhập được trang quản trị, xử lý đơn hàng và
              dữ liệu sản phẩm.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatAccountLine(promoteUser)}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                uiSize="sm"
                type="button"
                onClick={() => setPromoteUser(null)}
              >
                Hủy
              </Button>
              <Button
                uiSize="sm"
                type="button"
                disabled={busyUserId === promoteUser.id}
                onClick={confirmPromote}
              >
                {busyUserId === promoteUser.id ? "Đang xử lý…" : "Xác nhận"}
              </Button>
            </div>
          </Card>
        </Modal>
      ) : null}

      {statusUser ? (
        <Modal open onClose={() => setStatusUser(null)}>
          <Card
            className="w-full max-w-md shadow-(--shadow-md)"
            title={
              statusUser.status === "ACTIVE"
                ? "Khóa người dùng"
                : "Mở khóa người dùng"
            }
            subtitle={statusUser.email ?? `Tài khoản #${statusUser.id}`}
            onClick={(e) => e.stopPropagation()}
          >
            <p className="text-sm text-foreground">
              {statusUser.status === "ACTIVE"
                ? "Tài khoản này sẽ không thể tiếp tục sử dụng hệ thống cho đến khi được mở khóa."
                : "Tài khoản này sẽ được kích hoạt lại và có thể sử dụng hệ thống."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatAccountLine(statusUser)}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="ghost"
                uiSize="sm"
                type="button"
                onClick={() => setStatusUser(null)}
              >
                Hủy
              </Button>
              <Button
                uiSize="sm"
                type="button"
                disabled={busyUserId === statusUser.id}
                onClick={confirmStatusChange}
              >
                {busyUserId === statusUser.id ? "Đang xử lý…" : "Xác nhận"}
              </Button>
            </div>
          </Card>
        </Modal>
      ) : null}
    </div>
  );
}
