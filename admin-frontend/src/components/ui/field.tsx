import * as React from "react";
import { cn } from "@/lib/utils";
import { Label } from "./label";
import { FieldHint } from "./field-hint";

export interface FieldProps extends React.HTMLAttributes<HTMLDivElement> {
    label: React.ReactNode;
    htmlFor?: string;
    hint?: React.ReactNode;
    labelClassName?: string;
    children: React.ReactNode;
}

const Field = React.forwardRef<HTMLDivElement, FieldProps>(
    ({ label, htmlFor, hint, labelClassName, className, children, ...props }, ref) => (
        <div ref={ref} className={cn("grid gap-1.5", className)} {...props}>
            <Label htmlFor={htmlFor} className={labelClassName}>
                {label}
            </Label>
            {children}
            {hint ? <FieldHint>{hint}</FieldHint> : null}
        </div>
    )
);
Field.displayName = "Field";

export { Field };
