import { apiFetch } from "./client";
import type { Locale } from "../i18n/config";

export type CarouselEvent = {
  id: number;
  title: string;
  payload: string;
  image_url: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  start_at: string | null;
  end_at: string | null;
  updated_at: string;
};

export async function getActiveEvents(args: { lang?: Locale }) {
  const { lang } = args;
  return apiFetch<{ items: CarouselEvent[] }>("/api/events", {
    method: "GET",
    lang,
    cache: "no-store",
  });
}
