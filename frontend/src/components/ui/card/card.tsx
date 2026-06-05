import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./card.module.scss";

type CardProps<T extends ElementType = "div"> = {
  as?: T;
  padded?: boolean;
  className?: string;
  children?: ReactNode;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function Card<T extends ElementType = "div">({
  as,
  padded = true,
  className,
  children,
  ...rest
}: CardProps<T>) {
  const Tag = (as ?? "div") as ElementType;
  return (
    <Tag className={cn(styles.card, padded && styles.padded, className)} {...rest}>
      {children}
    </Tag>
  );
}
