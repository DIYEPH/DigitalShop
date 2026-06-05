import { cn } from "@/lib/utils/cn";
import styles from "./input.module.scss";

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;
  return <input {...rest} className={cn(styles.input, className)} />;
}
