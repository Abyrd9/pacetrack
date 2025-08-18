import * as RadixDropdownMenu from "@radix-ui/react-dropdown-menu";
import { cx } from "~/utils/helpers/cx";
import { buttonStyles, iconButtonStyles } from "./button";

type DropdownMenuRootProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Root
>;
type DropdownMenuTriggerProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Trigger
>;
type DropdownMenuPortalProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Portal
>;
type DropdownMenuContentProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Content
>;
type DropdownMenuArrowProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Arrow
>;
type DropdownMenuItemProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Item
>;
type DropdownMenuGroupProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Group
>;
type DropdownMenuLabelProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Label
>;
type DropdownMenuCheckboxItemProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.CheckboxItem
>;
type DropdownMenuRadioGroupProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.RadioGroup
>;
type DropdownMenuRadioItemProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.RadioItem
>;
type DropdownMenuItemIndicatorProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.ItemIndicator
>;
type DropdownMenuSeparatorProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Separator
>;
type DropdownMenuSubProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.Sub
>;
type DropdownMenuSubTriggerProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.SubTrigger
>;
type DropdownMenuSubContentProps = React.ComponentPropsWithRef<
	typeof RadixDropdownMenu.SubContent
>;

const DropdownMenuRoot = ({ ...props }: DropdownMenuRootProps) => (
	<RadixDropdownMenu.Root {...props} />
);

const DropdownMenuTrigger = ({
	className,
	ref,
	kind = "default",
	variant,
	size,
	disabled,
	color,
	...props
}: DropdownMenuTriggerProps & {
	kind?: "icon" | "button" | "default";
	variant?: "default" | "outline" | "ghost" | "transparent";
	size?: "default" | "sm" | "lg";
	disabled?: boolean;
	color?: boolean;
}) => {
	// Use the appropriate styles based on kind
	let triggerClassName = className;

	if (kind === "icon") {
		triggerClassName = iconButtonStyles({
			variant,
			size,
			disabled,
			color,
			className,
		});
	} else if (kind === "button") {
		triggerClassName = buttonStyles({
			variant,
			size,
			disabled,
			color,
			className,
		});
	}
	// For "default" kind, use the original className without any button styles

	return (
		<RadixDropdownMenu.Trigger
			ref={ref}
			className={triggerClassName}
			{...props}
		/>
	);
};

const DropdownMenuPortal = ({
	children,
	...props
}: DropdownMenuPortalProps) => (
	<RadixDropdownMenu.Portal {...props}>{children}</RadixDropdownMenu.Portal>
);

const DropdownMenuContent = ({
	className,
	ref,
	...props
}: DropdownMenuContentProps) => (
	<RadixDropdownMenu.Content
		ref={ref}
		className={cx(
			"overflow-hidden rounded-md bg-background-offset dark:bg-background-100 p-1.5 shadow-black/10 shadow-modal border border-background-100 dark:border-background-300 space-y-1",
			className,
		)}
		{...props}
	/>
);

const DropdownMenuArrow = ({
	className,
	ref,
	...props
}: DropdownMenuArrowProps) => (
	<RadixDropdownMenu.Arrow
		ref={ref}
		className={cx("fill-background-offset dark:fill-background-100", className)}
		{...props}
	/>
);

const DropdownMenuItem = ({
	className,
	ref,
	...props
}: DropdownMenuItemProps) => (
	<RadixDropdownMenu.Item
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500",
			className,
		)}
		{...props}
	/>
);

const DropdownMenuGroup = ({
	className,
	ref,
	...props
}: DropdownMenuGroupProps) => (
	<RadixDropdownMenu.Group ref={ref} className={cx(className)} {...props} />
);

const DropdownMenuLabel = ({
	className,
	ref,
	...props
}: DropdownMenuLabelProps) => (
	<RadixDropdownMenu.Label
		ref={ref}
		className={cx(
			"px-2 text-[12px] leading-[25px] text-muted-foreground",
			className,
		)}
		{...props}
	/>
);

const DropdownMenuCheckboxItem = ({
	className,
	children,
	ref,
	...props
}: DropdownMenuCheckboxItemProps) => (
	<RadixDropdownMenu.CheckboxItem
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500 rdx-state-checked:pl-6",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<RadixDropdownMenu.ItemIndicator>
				<span className="h-2 w-2 rounded-full bg-primary" />
			</RadixDropdownMenu.ItemIndicator>
		</span>
		{children}
	</RadixDropdownMenu.CheckboxItem>
);

const DropdownMenuRadioGroup = ({
	className,
	ref,
	...props
}: DropdownMenuRadioGroupProps) => (
	<RadixDropdownMenu.RadioGroup
		ref={ref}
		className={cx(className)}
		{...props}
	/>
);

const DropdownMenuRadioItem = ({
	className,
	children,
	ref,
	...props
}: DropdownMenuRadioItemProps) => (
	<RadixDropdownMenu.RadioItem
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500 rdx-state-checked:pl-6",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<RadixDropdownMenu.ItemIndicator>
				<span className="h-2 w-2 rounded-full bg-primary" />
			</RadixDropdownMenu.ItemIndicator>
		</span>
		{children}
	</RadixDropdownMenu.RadioItem>
);

const DropdownMenuItemIndicator = ({
	className,
	ref,
	...props
}: DropdownMenuItemIndicatorProps) => (
	<RadixDropdownMenu.ItemIndicator
		ref={ref}
		className={cx("", className)}
		{...props}
	/>
);

const DropdownMenuSeparator = ({
	className,
	ref,
	...props
}: DropdownMenuSeparatorProps) => (
	<RadixDropdownMenu.Separator
		ref={ref}
		className={cx("mx-1.5 my-1 h-px bg-background-500", className)}
		{...props}
	/>
);

const DropdownMenuSub = ({ ...props }: DropdownMenuSubProps) => (
	<RadixDropdownMenu.Sub {...props} />
);

const DropdownMenuSubTrigger = ({
	className,
	children,
	ref,
	...props
}: DropdownMenuSubTriggerProps) => (
	<RadixDropdownMenu.SubTrigger
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500",
			className,
		)}
		{...props}
	>
		{children}
	</RadixDropdownMenu.SubTrigger>
);

const DropdownMenuSubContent = ({
	className,
	ref,
	...props
}: DropdownMenuSubContentProps) => (
	<RadixDropdownMenu.SubContent
		ref={ref}
		className={cx(
			"min-w-[220px] overflow-hidden rounded-md bg-background-offset dark:bg-background-100 p-1.5 shadow-black/10 shadow-modal border border-background-100 dark:border-background-300 space-y-1",
			className,
		)}
		{...props}
	/>
);

export const DropdownMenu = Object.assign(DropdownMenuRoot, {
	Trigger: DropdownMenuTrigger,
	Portal: DropdownMenuPortal,
	Content: DropdownMenuContent,
	Arrow: DropdownMenuArrow,
	Item: DropdownMenuItem,
	Group: DropdownMenuGroup,
	Label: DropdownMenuLabel,
	CheckboxItem: DropdownMenuCheckboxItem,
	RadioGroup: DropdownMenuRadioGroup,
	RadioItem: DropdownMenuRadioItem,
	ItemIndicator: DropdownMenuItemIndicator,
	Separator: DropdownMenuSeparator,
	Sub: DropdownMenuSub,
	SubTrigger: DropdownMenuSubTrigger,
	SubContent: DropdownMenuSubContent,
});
