import Link from "next/link";
import { Card } from "@/components/ui";

export default function AdminHome() {
  return (
    <div className="grid gap-2">
      <Card>
        <p className="text-xs font-bold text-foreground">
          Chào mừng đến Quản trị DigitalShop
        </p>
        <p className="mt-0.5 text-[11px] text-muted-foreground">
          Quản lý sản phẩm, đơn hàng, danh mục, mã giảm giá và người dùng.
        </p>
      </Card>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {[
          {
            href: "/admin/products",
            label: "Sản phẩm",
            desc: "Gói, biến thể, kho",
          },
          {
            href: "/admin/orders",
            label: "Đơn hàng",
            desc: "Xác nhận, giao, chat",
          },
          {
            href: "/admin/categories",
            label: "Danh mục",
            desc: "Tạo và sắp xếp",
          },
          { href: "/admin/coupons", label: "Mã giảm giá", desc: "Khuyến mãi" },
          { href: "/admin/users", label: "Người dùng", desc: "Phân quyền" },
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-xl border border-border bg-surface p-3 transition-all hover:border-border-strong hover:shadow-(--shadow-sm)"
          >
            <div className="text-xs font-black text-foreground transition-colors group-hover:text-brand">
              {item.label}
            </div>
            <div className="mt-0.5 text-[11px] text-muted-foreground">
              {item.desc}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
