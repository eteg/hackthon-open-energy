import * as React from "react";
import { Slot } from "radix-ui";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md font-sans transition-colors disabled:pointer-events-none disabled:bg-[#e7e0d1] disabled:text-[#5a6068] disabled:border-transparent [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none aria-invalid:ring-destructive/20 aria-invalid:border-destructive cursor-pointer",
  {
    variants: {
      variant: {
        // Um botão primário (cobre) por tela.
        default: "bg-primary text-primary-foreground hover:bg-cobre-escuro",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20",
        outline: "border border-input bg-card text-foreground hover:bg-secondary",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/70",
        ghost: "text-foreground hover:bg-secondary",
        link: "min-h-0 px-0 text-primary underline underline-offset-4 hover:text-cobre-escuro",
      },
      size: {
        // alvos de toque >= 44px (guia: mobile first)
        default: "min-h-11 px-4 text-sm font-semibold has-[>svg]:px-3.5",
        sm: "min-h-9 gap-1.5 px-3 text-sm font-semibold has-[>svg]:px-2.5",
        lg: "min-h-13 w-full px-5 text-base font-semibold",
        icon: "size-11",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  }
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return <Comp data-slot="button" className={cn(buttonVariants({ variant, size, className }))} {...props} />;
}

export { Button, buttonVariants };
