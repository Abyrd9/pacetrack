import * as RadixDialog from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";
import { cx } from "~/utils/helpers/cx";

type DialogRootProps = React.ComponentPropsWithRef<typeof RadixDialog.Root>;
type DialogTriggerProps = React.ComponentPropsWithRef<
	typeof RadixDialog.Trigger
>;
type DialogPortalProps = React.ComponentPropsWithRef<typeof RadixDialog.Portal>;
type DialogOverlayProps = React.ComponentPropsWithRef<
	typeof RadixDialog.Overlay
>;
type DialogContentProps = React.ComponentPropsWithRef<
	typeof RadixDialog.Content
> & {
	hideCloseIcon?: boolean;
};
type DialogCloseProps = React.ComponentPropsWithRef<typeof RadixDialog.Close>;
type DialogTitleProps = React.ComponentPropsWithRef<typeof RadixDialog.Title>;
type DialogDescriptionProps = React.ComponentPropsWithRef<
	typeof RadixDialog.Description
>;

const DialogRoot = ({ ...props }: DialogRootProps) => (
	<RadixDialog.Root {...props} />
);

const DialogTrigger = ({
	className,
	ref,
	children,
	...props
}: DialogTriggerProps) => (
	<RadixDialog.Trigger ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixDialog.Trigger>
);

const DialogPortal = ({ children, ...props }: DialogPortalProps) => (
	<RadixDialog.Portal {...props}>{children}</RadixDialog.Portal>
);

const DialogOverlay = ({
	className,
	ref,
	children,
	...props
}: DialogOverlayProps) => (
	<RadixDialog.Overlay
		ref={ref}
		className={cx(
			"fixed inset-0 flex min-h-dvh items-center justify-center bg-black/15 p-6 transition-all data-[state=open]:animate-overlay-in data-[state=closed]:animate-overlay-out z-50 backdrop-blur-xs",
			className,
		)}
		{...props}
	>
		{children}
	</RadixDialog.Overlay>
);

const DialogContent = ({
	className,
	ref,
	children,
	hideCloseIcon,
	...props
}: DialogContentProps) => {
	const showCloseIcon = !hideCloseIcon;
	return (
		<RadixDialog.Content
			ref={ref}
			className={
				"relative w-full max-w-md rounded-lg bg-background-offset dark:bg-background-100 p-6 shadow-modal shadow-black/10 data-[state=closed]:animate-dialog-out data-[state=open]:animate-dialog-in border border-background-100 dark:border-background-300"
			}
			{...props}
		>
			{showCloseIcon && (
				<DialogClose className="absolute right-3 top-3 text-foreground cursor-pointer">
					<XIcon />
				</DialogClose>
			)}
			{children}
		</RadixDialog.Content>
	);
};

const DialogClose = ({
	className,
	ref,
	children,
	...props
}: DialogCloseProps) => (
	<RadixDialog.Close ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixDialog.Close>
);

const DialogTitle = ({
	className,
	ref,
	children,
	...props
}: DialogTitleProps) => (
	<RadixDialog.Title
		ref={ref}
		className={cx("pb-1.5 text-2xl font-bold", className)}
		{...props}
	>
		{children}
	</RadixDialog.Title>
);

const DialogDescription = ({
	className,
	ref,
	children,
	...props
}: DialogDescriptionProps) => (
	<RadixDialog.Description
		ref={ref}
		className={cx("text-sm leading-[20px] text-muted-foreground", className)}
		{...props}
	>
		{children}
	</RadixDialog.Description>
);

export const Dialog = Object.assign(DialogRoot, {
	Trigger: DialogTrigger,
	Portal: DialogPortal,
	Overlay: DialogOverlay,
	Content: DialogContent,
	Close: DialogClose,
	Title: DialogTitle,
	Description: DialogDescription,
});
