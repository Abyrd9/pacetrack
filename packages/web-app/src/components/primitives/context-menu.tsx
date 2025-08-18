import * as RadixContextMenu from "@radix-ui/react-context-menu";
import type React from "react";
import { cx } from "~/utils/helpers/cx";

type ContextMenuRootProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Root
>;
type ContextMenuTriggerProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Trigger
>;
type ContextMenuPortalProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Portal
>;
type ContextMenuContentProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Content
>;
type ContextMenuArrowProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Arrow
>;
type ContextMenuItemProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Item
>;
type ContextMenuGroupProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Group
>;
type ContextMenuLabelProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Label
>;
type ContextMenuCheckboxItemProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.CheckboxItem
>;
type ContextMenuRadioGroupProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.RadioGroup
>;
type ContextMenuRadioItemProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.RadioItem
>;
type ContextMenuItemIndicatorProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.ItemIndicator
>;
type ContextMenuSeparatorProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Separator
>;
type ContextMenuSubProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.Sub
>;
type ContextMenuSubTriggerProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.SubTrigger
>;
type ContextMenuSubContentProps = React.ComponentPropsWithRef<
	typeof RadixContextMenu.SubContent
>;

const ContextMenuRoot = ({ ...props }: ContextMenuRootProps) => (
	<RadixContextMenu.Root {...props} />
);

const ContextMenuTrigger = ({
	ref,
	className,
	...props
}: ContextMenuTriggerProps) => (
	<RadixContextMenu.Trigger
		ref={ref}
		className={cx(
			"block w-[300px] text-center py-[45px] text-[15px] select-none rounded-sm border-2 border-dashed border-foreground",
			className,
		)}
		{...props}
	/>
);

const ContextMenuPortal = ({ children, ...props }: ContextMenuPortalProps) => (
	<RadixContextMenu.Portal {...props}>{children}</RadixContextMenu.Portal>
);

const ContextMenuContent = ({
	className,
	ref,
	...props
}: ContextMenuContentProps) => (
	<RadixContextMenu.Content
		ref={ref}
		className={cx(
			"min-w-[220px] overflow-hidden rounded-md bg-background-offset dark:bg-background-100 p-1.5 shadow-black/10 shadow-modal border border-background-100 dark:border-background-300 space-y-1",
			className,
		)}
		{...props}
	/>
);

const ContextMenuArrow = ({
	className,
	ref,
	...props
}: ContextMenuArrowProps) => (
	<RadixContextMenu.Arrow ref={ref} className={cx(className)} {...props} />
);

const ContextMenuItem = ({
	className,
	ref,
	...props
}: ContextMenuItemProps) => (
	<RadixContextMenu.Item
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500",
			className,
		)}
		{...props}
	/>
);

const ContextMenuGroup = ({
	className,
	ref,
	...props
}: ContextMenuGroupProps) => (
	<RadixContextMenu.Group ref={ref} className={cx(className)} {...props} />
);

const ContextMenuLabel = ({
	className,
	ref,
	...props
}: ContextMenuLabelProps) => (
	<RadixContextMenu.Label
		ref={ref}
		className={cx(
			"px-2 text-[12px] leading-[25px] text-muted-foreground",
			className,
		)}
		{...props}
	/>
);

const ContextMenuCheckboxItem = ({
	className,
	children,
	ref,
	...props
}: ContextMenuCheckboxItemProps) => (
	<RadixContextMenu.CheckboxItem
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500 rdx-state-checked:pl-6",
			className,
		)}
		{...props}
	>
		{children}
	</RadixContextMenu.CheckboxItem>
);

const ContextMenuRadioGroup = ({
	className,
	ref,
	...props
}: ContextMenuRadioGroupProps) => (
	<RadixContextMenu.RadioGroup ref={ref} className={cx(className)} {...props} />
);

const ContextMenuRadioItem = ({
	className,
	children,
	ref,
	...props
}: ContextMenuRadioItemProps) => (
	<RadixContextMenu.RadioItem
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500 rdx-state-checked:pl-6",
			className,
		)}
		{...props}
	>
		{children}
	</RadixContextMenu.RadioItem>
);

const ContextMenuItemIndicator = ({
	className,
	ref,
	...props
}: ContextMenuItemIndicatorProps) => (
	<RadixContextMenu.ItemIndicator
		ref={ref}
		className={cx(
			"absolute left-0 inline-flex w-[25px] items-center justify-center",
			className,
		)}
		{...props}
	/>
);

const ContextMenuSeparator = ({
	className,
	ref,
	...props
}: ContextMenuSeparatorProps) => (
	<RadixContextMenu.Separator
		ref={ref}
		className={cx("mx-1.5 my-1 h-px bg-background-500", className)}
		{...props}
	/>
);

const ContextMenuSub = ({ ...props }: ContextMenuSubProps) => (
	<RadixContextMenu.Sub {...props} />
);

const ContextMenuSubTrigger = ({
	className,
	ref,
	...props
}: ContextMenuSubTriggerProps) => (
	<RadixContextMenu.SubTrigger
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500",
			className,
		)}
		{...props}
	/>
);

const ContextMenuSubContent = ({
	className,
	ref,
	...props
}: ContextMenuSubContentProps) => (
	<RadixContextMenu.SubContent
		ref={ref}
		className={cx(
			"min-w-[220px] overflow-hidden rounded-md bg-background-offset dark:bg-background-100 p-1.5 shadow-black/10 shadow-modal border border-background-100 dark:border-background-300 space-y-1",
			className,
		)}
		{...props}
	/>
);

export const ContextMenu = Object.assign(ContextMenuRoot, {
	Trigger: ContextMenuTrigger,
	Portal: ContextMenuPortal,
	Content: ContextMenuContent,
	Arrow: ContextMenuArrow,
	Item: ContextMenuItem,
	Group: ContextMenuGroup,
	Label: ContextMenuLabel,
	CheckboxItem: ContextMenuCheckboxItem,
	RadioGroup: ContextMenuRadioGroup,
	RadioItem: ContextMenuRadioItem,
	ItemIndicator: ContextMenuItemIndicator,
	Separator: ContextMenuSeparator,
	Sub: ContextMenuSub,
	SubTrigger: ContextMenuSubTrigger,
	SubContent: ContextMenuSubContent,
});
