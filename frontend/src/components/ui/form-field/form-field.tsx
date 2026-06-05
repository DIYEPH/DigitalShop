import { cn } from "@/lib/utils/cn";
import styles from "./form-field.module.scss";

export function FormField({
  label,
  hint,
  htmlFor,
  className,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={cn("block", className)} htmlFor={htmlFor}>
      <span className={styles.label}>{label}</span>
      {hint ? <span className={styles.hint}>{hint}</span> : null}
      <div className={styles.control}>{children}</div>
    </label>
  );
}
