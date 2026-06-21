import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <Link
        className="rounded-xl bg-gradient-brand px-4 py-3 font-extrabold text-primary-foreground shadow-(--shadow-sm)"
        href="/login"
      >
        Vào đăng nhập quản trị
      </Link>
    </div>
  );
}
