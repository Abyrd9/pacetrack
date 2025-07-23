import * as RadixAlertDialog from "@radix-ui/react-alert-dialog";
import { cx } from "~/utils/helpers/cx";
import type { ButtonProps } from "./button";

type AlertDialogRootProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Root
>;
type AlertDialogTriggerProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Trigger
>;
type AlertDialogPortalProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Portal
>;
type AlertDialogOverlayProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Overlay
>;
type AlertDialogContentProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Content
>;
type AlertDialogTitleProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Title
>;
type AlertDialogDescriptionProps = React.ComponentPropsWithRef<
  typeof RadixAlertDialog.Description
>;
type AlertDialogActionProps = ButtonProps;
type AlertDialogCancelProps = ButtonProps;

const AlertDialogRoot = ({ ...props }: AlertDialogRootProps) => (
  <RadixAlertDialog.Root {...props} />
);

const AlertDialogTrigger = ({ ref, ...props }: AlertDialogTriggerProps) => (
  <RadixAlertDialog.Trigger ref={ref} {...props} />
);

const AlertDialogPortal = ({ children, ...props }: AlertDialogPortalProps) => {
  return (
    <RadixAlertDialog.Portal {...props}>{children}</RadixAlertDialog.Portal>
  );
};

const AlertDialogOverlay = ({
  className,
  ref,
  ...props
}: AlertDialogOverlayProps) => (
  <RadixAlertDialog.Overlay
    ref={ref}
    className={cx(
      "fixed inset-0 flex min-h-dvh items-center justify-center bg-black/5 p-6 backdrop-blur-xs transition-all data-[state=closed]:animate-overlay-out data-[state=open]:animate-overlay-in",
      className
    )}
    {...props}
  />
);

const AlertDialogContent = ({
  className,
  ref,
  ...props
}: AlertDialogContentProps) => (
  <RadixAlertDialog.Content
    ref={ref}
    className={cx(
      "relative w-full max-w-md rounded-lg bg-background-offset dark:bg-background-100 p-6 shadow-modal shadow-black/10 data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in border border-background-100 dark:border-background-300 outline-hidden border-none",
      className
    )}
    {...props}
  />
);

const AlertDialogTitle = ({
  className,
  ref,
  ...props
}: AlertDialogTitleProps) => (
  <RadixAlertDialog.Title
    ref={ref}
    className={cx("text-lg font-semibold", className)}
    {...props}
  />
);

const AlertDialogDescription = ({
  className,
  ref,
  ...props
}: AlertDialogDescriptionProps) => (
  <RadixAlertDialog.Description
    ref={ref}
    className={cx("text-sm text-muted-foreground", className)}
    {...props}
  />
);

const AlertDialogAction = ({ ...props }: AlertDialogActionProps) => (
  <RadixAlertDialog.Action asChild {...props} />
);

const AlertDialogCancel = ({ ...props }: AlertDialogCancelProps) => (
  <RadixAlertDialog.Cancel asChild {...props} />
);

export const AlertDialog = Object.assign(AlertDialogRoot, {
  Trigger: AlertDialogTrigger,
  Portal: AlertDialogPortal,
  Overlay: AlertDialogOverlay,
  Content: AlertDialogContent,
  Title: AlertDialogTitle,
  Description: AlertDialogDescription,
  Action: AlertDialogAction,
  Cancel: AlertDialogCancel,
});
