import { redirect } from "next/navigation";
import { StoreHotbar, StoreShell } from "@/components/layout";
import { CartProvider } from "@/lib/cart/CartProvider";
import { defaultLocale, getDictionary, isLocale } from "@/lib/i18n/config";

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!isLocale(lang)) redirect(`/${defaultLocale}`);
  const dict = await getDictionary(lang);

  return (
    <CartProvider>
      <StoreShell lang={lang} dict={dict}>
        <>
          <StoreHotbar lang={lang} dict={dict} />
          {children}
        </>
      </StoreShell>
    </CartProvider>
  );
}
