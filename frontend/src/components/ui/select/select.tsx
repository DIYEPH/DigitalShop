import { cn } from "@/lib/utils/cn";
import styles from "./select.module.scss";

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  const { className, children, ...rest } = props;
  return (
    <select {...rest} className={cn(styles.select, className)}>
      {children}
    </select>
  );
}
