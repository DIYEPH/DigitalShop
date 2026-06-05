"use client";

import Link, { type LinkProps } from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import styles from "./button.module.scss";

export type ButtonVariant = "primary" | "secondary" | "outline" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

type Base = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  image?: boolean;
  leftImage?: ReactNode;
  rightImage?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
};

type Btn = Base & ComponentPropsWithoutRef<"button">;

type LinkBtn = Base &
  LinkProps & {
    href: string;
  };

export type ButtonProps = Btn | LinkBtn;

const VARIANTS: Record<ButtonVariant, string> = {
  primary: styles.primary,
  secondary: styles.secondary,
  outline: styles.outline,
  ghost: styles.ghost,
  danger: styles.danger,
};

const SIZES: Record<ButtonSize, string> = {
  sm: styles.sm,
  md: styles.md,
  lg: styles.lg,
};

const Side = ({ children, leftImage, rightImage }: Base) =>
  !leftImage && !rightImage ? (
    children
  ) : (
    <>
      {leftImage && <span className={styles.sideIcon}>{leftImage}</span>}
      {children && <span className={styles.label}>{children}</span>}
      {rightImage && <span className={cn(styles.sideIcon, styles.right)}>{rightImage}</span>}
    </>
  );

export function Button(props: ButtonProps) {
  const {
    variant = "primary",
    size = "md",
    className,
    image,
    leftImage,
    rightImage,
    children,
    ...rest
  } = props;

  const isLink = "href" in props;
  const isDisabled = "disabled" in props && Boolean(props.disabled);

  const cls = cn(
    styles.root,
    !image && VARIANTS[variant],
    !image && SIZES[size],
    image && styles.image,
    (leftImage || rightImage) && styles.withIcons,
    isDisabled && styles.disabled,
    className,
  );

  if (isLink) {
    return (
      <Link
        {...(rest as LinkBtn)}
        className={cls}
        aria-disabled={isDisabled || undefined}
        tabIndex={isDisabled ? -1 : undefined}
        onClick={
          isDisabled
            ? (event) => {
                event.preventDefault();
              }
            : (rest as LinkBtn).onClick
        }
      >
        <Side {...{ children, leftImage, rightImage }} />
      </Link>
    );
  }

  return (
    <button {...(rest as Btn)} className={cls} disabled={isDisabled}>
      <Side {...{ children, leftImage, rightImage }} />
    </button>
  );
}
