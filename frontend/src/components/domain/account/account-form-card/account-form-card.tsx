import type { FormEvent, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./account-form-card.module.scss";

type AccountFormCardProps = {
  title: string;
  description: string;
  children: ReactNode;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
};

export function AccountFormCard({ title, description, children, onSubmit }: AccountFormCardProps) {
  return (
    <form onSubmit={onSubmit} className={cn("store-card", styles.form)}>
      <header>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.description}>{description}</p>
      </header>
      {children}
    </form>
  );
}
