import * as RadixPopover from "@radix-ui/react-popover";
import { cx } from "~/utils/helpers/cx";

type PopoverRootProps = React.ComponentPropsWithRef<typeof RadixPopover.Root>;
type PopoverTriggerProps = React.ComponentPropsWithRef<
  typeof RadixPopover.Trigger
>;
type PopoverAnchorProps = React.ComponentPropsWithRef<
  typeof RadixPopover.Anchor
>;
type PopoverPortalProps = React.ComponentPropsWithRef<
  typeof RadixPopover.Portal
>;
type PopoverContentProps = React.ComponentPropsWithRef<
  typeof RadixPopover.Content
>;
type PopoverArrowProps = React.ComponentPropsWithRef<typeof RadixPopover.Arrow>;
type PopoverCloseProps = React.ComponentPropsWithRef<typeof RadixPopover.Close>;

const PopoverRoot = ({ ...props }: PopoverRootProps) => (
  <RadixPopover.Root {...props} />
);

const PopoverTrigger = ({
  className,
  ref,
  children,
  ...props
}: PopoverTriggerProps) => (
  <RadixPopover.Trigger
    ref={ref}
    className={cx("inline-block", className)}
    {...props}
    style={{ touchAction: "none" }}
  >
    {children}
  </RadixPopover.Trigger>
);

const PopoverAnchor = ({
  className,
  ref,
  children,
  ...props
}: PopoverAnchorProps) => (
  <RadixPopover.Anchor ref={ref} className={cx("", className)} {...props}>
    {children}
  </RadixPopover.Anchor>
);

const PopoverPortal = ({ children, ...props }: PopoverPortalProps) => (
  <RadixPopover.Portal {...props}>{children}</RadixPopover.Portal>
);

const PopoverContent = ({
  className,
  ref,
  children,
  ...props
}: PopoverContentProps) => (
  <RadixPopover.Content
    ref={ref}
    className={cx(
      "relative overflow-hidden rounded-sm bg-background-offset dark:bg-background-100 shadow-modal shadow-black/10 duration-100 origin-[var(--radix-popover-content-transform-origin)] data-[state=closed]:animate-[dialog-out_150ms_cubic-bezier(0.33,1,0.68,1)] data-[state=open]:animate-[dialog-in_150ms_cubic-bezier(0.33,1,0.68,1)] dark:border dark:border-background-offset",
      className
    )}
    {...props}
  >
    {children}
  </RadixPopover.Content>
);

const PopoverArrow = ({
  className,
  ref,
  children,
  ...props
}: PopoverArrowProps) => (
  <RadixPopover.Arrow ref={ref} className={cx("", className)} {...props}>
    {children}
  </RadixPopover.Arrow>
);

const PopoverClose = ({
  className,
  ref,
  children,
  ...props
}: PopoverCloseProps) => (
  <RadixPopover.Close ref={ref} className={cx("", className)} {...props}>
    {children}
  </RadixPopover.Close>
);

export const Popover = Object.assign(PopoverRoot, {
  Trigger: PopoverTrigger,
  Anchor: PopoverAnchor,
  Portal: PopoverPortal,
  Content: PopoverContent,
  Arrow: PopoverArrow,
  Close: PopoverClose,
});
