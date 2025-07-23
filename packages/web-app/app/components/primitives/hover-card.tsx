import * as RadixHoverCard from "@radix-ui/react-hover-card";
import { cx } from "~/utils/helpers/cx";

type HoverCardRootProps = React.ComponentPropsWithRef<
  typeof RadixHoverCard.Root
>;
type HoverCardTriggerProps = React.ComponentPropsWithRef<
  typeof RadixHoverCard.Trigger
>;
type HoverCardPortalProps = React.ComponentPropsWithRef<
  typeof RadixHoverCard.Portal
>;
type HoverCardContentProps = React.ComponentPropsWithRef<
  typeof RadixHoverCard.Content
>;
type HoverCardArrowProps = React.ComponentPropsWithRef<
  typeof RadixHoverCard.Arrow
>;

const HoverCardRoot = ({ ...props }: HoverCardRootProps) => (
  <RadixHoverCard.Root {...props} />
);

const HoverCardTrigger = ({ ref, ...props }: HoverCardTriggerProps) => (
  <RadixHoverCard.Trigger ref={ref} {...props} />
);

const HoverCardPortal = ({ children, ...props }: HoverCardPortalProps) => (
  <RadixHoverCard.Portal {...props}>{children}</RadixHoverCard.Portal>
);

const HoverCardContent = ({
  className,
  align = "center",
  sideOffset = 4,
  ref,
  ...props
}: HoverCardContentProps) => (
  <RadixHoverCard.Content
    ref={ref}
    align={align}
    sideOffset={sideOffset}
    className={cx(
      "z-50 w-64 rounded-md bg-background-offset dark:bg-background-100 p-4 shadow-modal outline-hidden rdx-state-closed:animate-[fade-out_200ms_ease-in] rdx-state-open:animate-[fade-in_200ms_ease-out] border border-background-100 dark:border-background-300",
      className
    )}
    {...props}
  />
);

const HoverCardArrow = ({ className, ref, ...props }: HoverCardArrowProps) => (
  <RadixHoverCard.Arrow
    ref={ref}
    className={cx(
      "fill-background-offset dark:fill-background-100 ",
      className
    )}
    {...props}
  />
);

export const HoverCard = Object.assign(HoverCardRoot, {
  Trigger: HoverCardTrigger,
  Portal: HoverCardPortal,
  Content: HoverCardContent,
  Arrow: HoverCardArrow,
});
