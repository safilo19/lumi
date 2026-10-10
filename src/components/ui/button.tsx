import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-full font-display font-semibold whitespace-nowrap transition-[transform,box-shadow,background-color,filter] duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-paper disabled:pointer-events-none disabled:opacity-50 select-none",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-ink shadow-[0_5px_0_var(--accent-deep)] hover:bg-accent-hover active:translate-y-[3px] active:shadow-[0_2px_0_var(--accent-deep)]",
        lime: "bg-lime text-lime-ink shadow-[0_5px_0_var(--lime-deep)] hover:brightness-[0.98] active:translate-y-[3px] active:shadow-[0_2px_0_var(--lime-deep)]",
        coral:
          "bg-coral text-coral-ink shadow-[0_5px_0_var(--coral-deep)] hover:brightness-[1.03] active:translate-y-[3px] active:shadow-[0_2px_0_var(--coral-deep)]",
        secondary:
          "bg-surface text-ink border-2 border-line-strong shadow-[0_4px_0_var(--line-strong)] hover:bg-surface-2 active:translate-y-[3px] active:shadow-[0_1px_0_var(--line-strong)]",
        soft: "bg-accent-weak text-accent-weak-ink hover:brightness-[0.98] active:translate-y-px",
        ghost: "text-ink hover:bg-surface-2 active:translate-y-px",
      },
      size: {
        sm: "h-10 px-5 text-sm",
        md: "h-12 px-6 text-[15px]",
        lg: "h-14 px-8 text-lg",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
