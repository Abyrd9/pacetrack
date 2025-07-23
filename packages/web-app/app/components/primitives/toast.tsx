import * as RadixToast from "@radix-ui/react-toast";
import { cx } from "~/utils/helpers/cx";

type ToastRootProps = React.ComponentPropsWithRef<typeof RadixToast.Root> & {
  variant?: "default" | "destructive";
};

const ToastProvider = RadixToast.Provider;

const ToastViewport = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof RadixToast.Viewport>) => (
  <RadixToast.Viewport
    ref={ref}
    className={cx(
      "fixed top-0 z-100 flex max-h-screen w-full flex-col-reverse p-4 sm:bottom-0 sm:right-0 sm:top-auto sm:flex-col md:max-w-[420px]",
      className
    )}
    {...props}
  />
);

const Toast = ({
  className,
  ref,
  variant = "default",
  ...props
}: ToastRootProps) => (
  <RadixToast.Root
    ref={ref}
    className={cx(
      "group pointer-events-auto relative flex w-full items-center justify-between space-x-2 overflow-hidden rounded-md border p-4 pr-6 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-[slide-in_150ms_ease-out] data-[state=closed]:animate-[fade-out_100ms_ease-in] data-[swipe=end]:animate-[swipe-out_100ms_ease-out] data-[state=moved]:transition-none",
      variant === "default" && "border-border bg-background text-foreground",
      variant === "destructive" &&
        "destructive group border-destructive bg-destructive text-destructive-foreground",
      className
    )}
    {...props}
  />
);

const ToastAction = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof RadixToast.Action>) => (
  <RadixToast.Action
    ref={ref}
    className={cx(
      "inline-flex h-8 shrink-0 items-center justify-center rounded-md border bg-transparent px-3 text-sm font-medium transition-colors hover:bg-muted focus:outline-hidden focus:ring-1 focus:ring-ring disabled:pointer-events-none disabled:opacity-50 group-[.destructive]:border-muted/40 hover:group-[.destructive]:border-destructive/30 hover:group-[.destructive]:bg-destructive hover:group-[.destructive]:text-destructive-foreground focus:group-[.destructive]:ring-destructive",
      className
    )}
    {...props}
  />
);

const ToastClose = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof RadixToast.Close>) => (
  <RadixToast.Close
    ref={ref}
    className={cx(
      "absolute right-1 top-1 rounded-md p-1 text-foreground/50 opacity-0 transition-opacity hover:text-foreground focus:opacity-100 focus:outline-hidden focus:ring-1 group-hover:opacity-100 group-[.destructive]:text-red-300 hover:group-[.destructive]:text-red-50 focus:group-[.destructive]:ring-red-400 focus:group-[.destructive]:ring-offset-red-600",
      className
    )}
    toast-close=""
    {...props}
  >
    <span className="sr-only">Close</span>
  </RadixToast.Close>
);

const ToastTitle = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof RadixToast.Title>) => (
  <RadixToast.Title
    ref={ref}
    className={cx("text-sm font-semibold [&+div]:text-xs", className)}
    {...props}
  />
);

const ToastDescription = ({
  className,
  ref,
  ...props
}: React.ComponentPropsWithRef<typeof RadixToast.Description>) => (
  <RadixToast.Description
    ref={ref}
    className={cx("text-sm opacity-90", className)}
    {...props}
  />
);

export {
  Toast,
  ToastProvider,
  ToastViewport,
  ToastTitle,
  ToastDescription,
  ToastClose,
  ToastAction,
};
