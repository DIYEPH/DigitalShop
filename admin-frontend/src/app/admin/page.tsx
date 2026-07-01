"use client";

import Link from "next/link";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui";
import { useDashboard } from "./dashboard.hooks";

export default function AdminHome() {
  const { t, navItems } = useDashboard();

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{t("dashboard.title")}</CardTitle>
          <CardDescription>{t("dashboard.subtitle")}</CardDescription>
        </CardHeader>
      </Card>
      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group rounded-brutal border-3 border-brutal bg-brutal-bg p-4 shadow-brutal transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 hover:shadow-brutal-lg"
          >
            <div className="text-sm font-black uppercase text-brutal-fg">
              {item.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
