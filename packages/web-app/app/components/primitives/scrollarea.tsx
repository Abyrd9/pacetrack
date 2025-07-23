import * as RadixScrollArea from "@radix-ui/react-scroll-area";
import { cx } from "~/utils/helpers/cx";

type ScrollAreaRootProps = React.ComponentPropsWithRef<
  typeof RadixScrollArea.Root
>;
type ScrollAreaViewportProps = React.ComponentPropsWithRef<
  typeof RadixScrollArea.Viewport
>;
type ScrollAreaScrollbarProps = React.ComponentPropsWithRef<
  typeof RadixScrollArea.ScrollAreaScrollbar
>;
type ScrollAreaThumbProps = React.ComponentPropsWithRef<
  typeof RadixScrollArea.ScrollAreaThumb
>;
type ScrollAreaCornerProps = React.ComponentPropsWithRef<
  typeof RadixScrollArea.ScrollAreaCorner
>;

const ScrollAreaRoot = ({ ref, ...props }: ScrollAreaRootProps) => (
  <RadixScrollArea.Root ref={ref} {...props} />
);

const ScrollAreaViewport = ({
  className,
  ref,
  ...props
}: ScrollAreaViewportProps) => (
  <RadixScrollArea.Viewport
    ref={ref}
    className={cx("size-full", className)}
    {...props}
  />
);

const ScrollAreaScrollbar = ({
  className,
  orientation = "vertical",
  ref,
  ...props
}: ScrollAreaScrollbarProps) => (
  <RadixScrollArea.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cx(
      "flex touch-none select-none bg-background-200 transition-colors rounded-full",
      orientation === "vertical" && "w-2",
      orientation === "horizontal" && "h-2 flex-col",
      className
    )}
    {...props}
  />
);

const ScrollAreaThumb = ({
  className,
  ref,
  ...props
}: ScrollAreaThumbProps) => (
  <RadixScrollArea.ScrollAreaThumb
    ref={ref}
    className={cx("relative flex-1 rounded-full bg-background-300", className)}
    {...props}
  />
);

const ScrollAreaCorner = ({
  className,
  ref,
  ...props
}: ScrollAreaCornerProps) => (
  <RadixScrollArea.ScrollAreaCorner
    ref={ref}
    className={cx("absolute inset-0", className)}
    {...props}
  />
);

export const ScrollArea = Object.assign(ScrollAreaRoot, {
  Viewport: ScrollAreaViewport,
  Scrollbar: ScrollAreaScrollbar,
  Thumb: ScrollAreaThumb,
  Corner: ScrollAreaCorner,
});
