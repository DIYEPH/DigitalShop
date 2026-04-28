import { OrderDetails } from "@/components/domain/orders";
import { parseIdParam, parseLocaleParam } from "@/lib/i18n/params";
import { getOrderDetailsPageData } from "@/lib/pages/order-details";

type OrderDetailsPageParams = { lang: string; id: string };

export default async function OrderDetailsPage({ params }: { params: Promise<OrderDetailsPageParams> }) {
  const { lang, id } = await params;
  const locale = parseLocaleParam(lang);
  const orderId = parseIdParam(id);
  if (!locale || !orderId) return null;

  const { dict } = await getOrderDetailsPageData(locale, orderId);

  return <OrderDetails lang={locale} dict={dict} id={orderId} />;
}
