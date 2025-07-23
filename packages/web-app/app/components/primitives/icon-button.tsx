import { Slot } from "@radix-ui/react-slot";
import { colord } from "colord";
import { LoaderCircleIcon } from "lucide-react";
import { createContext, useContext } from "react";
import { cx } from "~/utils/helpers/cx";
import { iconButtonStyles, type ButtonProps } from "./button";

export type IconButtonProps = ButtonProps;

const IconButtonLoadingContext = createContext({ isLoading: false });

const IconButtonRoot = ({
  className,
  variant,
  color,
  size,
  asChild,
  isLoading,
  ref,
  ...props
}: Omit<IconButtonProps, "kind">) => {
  const Comp = asChild ? Slot : "button";

  const buttonStyle = color
    ? {
        ...props.style,
        "--btn-color": colord(color).toRgbString(),
        "--btn-text-color": colord(color).isDark()
          ? colord("#fff").toRgbString()
          : colord("#000").toRgbString(),
        "--btn-hover-color": colord(color).lighten(0.05).toRgbString(),
      }
    : props.style;

  return (
    <IconButtonLoadingContext.Provider
      value={{ isLoading: Boolean(isLoading) }}
    >
      <Comp
        {...props}
        className={iconButtonStyles({
          variant,
          size,
          disabled: props.disabled || isLoading,
          color: Boolean(color),
          className,
        })}
        style={buttonStyle}
        disabled={isLoading || props.disabled}
      />
    </IconButtonLoadingContext.Provider>
  );
};

type IconButtonLoaderProps = React.ComponentPropsWithRef<"div">;

const IconButtonLoader = ({
  className,
  children,
  ref,
  ...props
}: IconButtonLoaderProps) => {
  const { isLoading } = useContext(IconButtonLoadingContext);

  return (
    <>
      <div
        ref={ref}
        className={cx(
          "absolute inset-0 h-full w-full items-center justify-center overflow-hidden rounded-lg",
          isLoading ? "flex opacity-100" : "hidden opacity-0",
          className
        )}
        {...props}
      >
        <LoaderCircleIcon className="animate-spin" />
      </div>
      <div
        className={cx(
          isLoading ? "opacity-0" : "opacity-100",
          "flex items-center justify-center",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </>
  );
};

export const IconButton = Object.assign(IconButtonRoot, {
  Loader: IconButtonLoader,
});
