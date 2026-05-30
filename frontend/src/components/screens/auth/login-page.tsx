import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import authStyles from "@/components/domain/auth/auth-pages.module.scss";
import { LoginForm } from "./login-form";

type LoginPageProps = {
  lang: Locale;
  dict: Dictionary;
};

export function LoginPage({ lang, dict }: LoginPageProps) {
  return (
    <div className={authStyles.pageShell}>
      <section className={authStyles.copyPanel}>
        <p className={authStyles.kicker}>{dict.auth.loginTitle}</p>
        <h1 className={authStyles.heroTitle}>{dict.brand}</h1>
        <p className={authStyles.heroText}>{dict.tagline}</p>
      </section>
      <LoginForm lang={lang} dict={dict} />
    </div>
  );
}
