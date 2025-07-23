import * as RadixTooltip from "@radix-ui/react-tooltip";
import { cx } from "~/utils/helpers/cx";

const TooltipRoot = RadixTooltip.Root;
const TooltipProvider = RadixTooltip.Provider;

type TooltipTriggerProps = React.ComponentPropsWithRef<
  typeof RadixTooltip.Trigger
>;
type TooltipPortalProps = React.ComponentPropsWithRef<
  typeof RadixTooltip.Portal
>;
type TooltipContentProps = React.ComponentPropsWithRef<
  typeof RadixTooltip.Content
>;
type TooltipArrowProps = React.ComponentPropsWithRef<typeof RadixTooltip.Arrow>;

const TooltipTrigger = ({
  className,
  children,
  ref,
  ...props
}: TooltipTriggerProps) => (
  <RadixTooltip.Trigger
    ref={ref}
    className={cx("inline-block touch-none text-xs", className)}
    {...props}
  >
    {children}
  </RadixTooltip.Trigger>
);

const TooltipPortal = ({ children, ...props }: TooltipPortalProps) => (
  <RadixTooltip.Portal {...props}>{children}</RadixTooltip.Portal>
);

const TooltipContent = ({
  className,
  children,
  ref,
  ...props
}: TooltipContentProps) => (
  <RadixTooltip.Content
    ref={ref}
    className={cx(
      "relative rounded-sm bg-background-500 shadow-modal shadow-black/10 origin-rdx-tooltip rdx-state-delayed-open:animate-[fade-up_100ms_cubic-bezier(0.33,1,0.68,1)] rdx-state-instant-open:animate-[fade-up_100ms_cubic-bezier(0.33,1,0.68,1)]",
      className
    )}
    {...props}
  >
    {children}
  </RadixTooltip.Content>
);

const TooltipArrow = ({ className, ref, ...props }: TooltipArrowProps) => (
  <RadixTooltip.Arrow
    ref={ref}
    className={cx("fill-background-500", className)}
    {...props}
  />
);

export const Tooltip = Object.assign(TooltipRoot, {
  Provider: TooltipProvider,
  Trigger: TooltipTrigger,
  Portal: TooltipPortal,
  Content: TooltipContent,
  Arrow: TooltipArrow,
});
