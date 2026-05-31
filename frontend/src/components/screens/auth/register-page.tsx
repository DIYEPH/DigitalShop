import type { Dictionary } from "@/lib/i18n/types";
import type { Locale } from "@/lib/i18n/config";
import authStyles from "@/components/domain/auth/auth-pages.module.scss";
import { RegisterForm } from "./register-form";

type RegisterPageProps = {
  lang: Locale;
  dict: Dictionary;
};

export function RegisterPage({ lang, dict }: RegisterPageProps) {
  return (
    <div className={authStyles.pageShell}>
      <section className={authStyles.copyPanel}>
        <p className={authStyles.kicker}>{dict.auth.registerTitle}</p>
        <h1 className={authStyles.heroTitle}>{dict.brand}</h1>
        <p className={authStyles.heroText}>{dict.tagline}</p>
      </section>
      <RegisterForm lang={lang} dict={dict} />
    </div>
  );
}
