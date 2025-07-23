import * as RadixAvatar from "@radix-ui/react-avatar";
import { cx } from "~/utils/helpers/cx";

type AvatarProps = React.ComponentPropsWithRef<typeof RadixAvatar.Root> & {
  size?: "xxs" | "xs" | "sm" | "base" | "lg" | "xl";
  square?: boolean;
};

type AvatarImageProps = React.ComponentPropsWithRef<typeof RadixAvatar.Image>;
type AvatarFallbackProps = React.ComponentPropsWithRef<
  typeof RadixAvatar.Fallback
>;

const AvatarRoot = ({
  className,
  size = "base",
  square,
  ref,
  ...props
}: AvatarProps) => (
  <RadixAvatar.Root
    ref={ref}
    data-size={size}
    className={cx(
      "inline-flex select-none items-center justify-center overflow-hidden rounded-full bg-muted align-middle group",
      {
        "h-5 w-5 min-w-5 min-h-5": size === "xxs",
        "h-6 w-6 min-w-6 min-h-6": size === "xs",
        "h-8 w-8 min-w-8 min-h-8": size === "sm",
        "h-10 w-10 min-w-10 min-h-10": size === "base",
        "h-12 w-12 min-w-12 min-h-12": size === "lg",
        "h-14 w-14 min-w-14 min-h-14": size === "xl",
        rounded: square,
      },
      className
    )}
    {...props}
  />
);

const AvatarImage = ({ className, ref, ...props }: AvatarImageProps) => (
  <RadixAvatar.Image
    ref={ref}
    className={cx("h-full w-full bg-muted object-cover", className)}
    {...props}
  />
);

const AvatarFallback = ({ className, ref, ...props }: AvatarFallbackProps) => (
  <RadixAvatar.Fallback
    ref={ref}
    className={cx(
      "flex h-full w-full items-center justify-center bg-background-100 border border-background-200 text-xs font-semibold text-foreground group-data-[size=xxs]:text-[10px] group-data-[size=xs]:text-xs group-data-[size=sm]:text-sm group-data-[size=base]:text-base group-data-[size=lg]:text-lg group-data-[size=xl]:text-xl group-data-[size=xxl]:text-2xl",
      className
    )}
    {...props}
  />
);

export const Avatar = Object.assign(AvatarRoot, {
  Image: AvatarImage,
  Fallback: AvatarFallback,
});
