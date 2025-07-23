import * as RadixToggle from "@radix-ui/react-toggle";
import type { ComponentPropsWithRef } from "react";
import { type VariantProps, tv } from "tailwind-variants";

type ToggleVariants = VariantProps<typeof toggle>;
type ToggleProps = ComponentPropsWithRef<typeof RadixToggle.Root> &
  ToggleVariants;

const toggle = tv({
  base: "relative flex items-center justify-center overflow-hidden rounded-lg border border-black/[8%] bg-white text-muted-foreground/80 shadow-button shadow-black/5 ring-foreground ring-offset-1 transition-colors after:pointer-events-none after:absolute after:-inset-y-[0.25px] after:h-[calc(100%_+_4px)] after:w-full after:rounded-lg hover:bg-gray-50 hover:text-muted-foreground/100 focus-visible:ring-2 active:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none rdx-state-on:bg-gray-100 rdx-state-on:text-foreground dark:bg-background-offset dark:shadow-black/10 dark:after:shadow-highlight dark:after:shadow-white/[2%] dark:hover:bg-background-offset/75 dark:active:bg-background-offset/75 dark:rdx-state-on:bg-background-offset/50 dark:rdx-state-on:text-muted-foreground",
  variants: {
    size: {
      default: "size-8 p-1 text-base",
      sm: "size-7 p-1 text-sm",
      lg: "size-9 p-1 text-lg",
    },
  },
});

export const Toggle = ({
  className,
  size = "default",
  ref,
  ...props
}: ToggleProps) => (
  <RadixToggle.Root
    ref={ref}
    className={toggle({ size, className })}
    {...props}
  />
);
