import type { ReactNode } from "react";

export type RadioCardProps = {
  selected: boolean;
  onSelect: () => void;
  disabled?: boolean;
  /** Hidden radio input name (only required when grouped via radio semantics). */
  name?: string;
  /** Hidden radio input value. */
  value?: string;
  /** Show a real radio dot instead of just border highlight. */
  showRadio?: boolean;
  /** Main label text or node. */
  children: ReactNode;
  /** Trailing meta (e.g. currency code, percent badge). */
  trailing?: ReactNode;
  className?: string;
};
