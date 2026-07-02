import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from "@/lib/utils";

const labelVariants = cva(
    [
        'text-sm font-bold tracking-wide leading-none',
        'peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
    ],
    {
        variants: {
            variant: {
                default: 'text-brutal-fg',
                error: 'text-brutal-destructive',
                success: 'text-brutal-success',
                muted: 'text-gray-500 dark:text-gray-400',
            },
        },
        defaultVariants: {
            variant: 'default',
        },
    }
);

export interface LabelProps
    extends React.LabelHTMLAttributes<HTMLLabelElement>,
        VariantProps<typeof labelVariants> {}

const Label = React.forwardRef<HTMLLabelElement, LabelProps>(
    ({ className, variant, ...props }, ref) => (
        <label ref={ref} className={cn(labelVariants({ variant, className }))} {...props} />
    )
);
Label.displayName = 'Label';

export { Label, labelVariants };
