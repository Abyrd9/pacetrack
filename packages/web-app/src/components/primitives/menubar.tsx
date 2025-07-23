import * as RadixMenubar from "@radix-ui/react-menubar";
import { cx } from "~/utils/helpers/cx";

type MenubarRootProps = React.ComponentPropsWithRef<typeof RadixMenubar.Root>;
type MenubarMenuProps = React.ComponentPropsWithRef<typeof RadixMenubar.Menu>;
type MenubarTriggerProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.Trigger
>;
type MenubarPortalProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.Portal
>;
type MenubarContentProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.Content
>;
type MenubarArrowProps = React.ComponentPropsWithRef<typeof RadixMenubar.Arrow>;
type MenubarItemProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.Item
> & {
	inset?: boolean;
};
type MenubarGroupProps = React.ComponentPropsWithRef<typeof RadixMenubar.Group>;
type MenubarLabelProps = React.ComponentPropsWithRef<typeof RadixMenubar.Label>;
type MenubarCheckboxItemProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.CheckboxItem
>;
type MenubarRadioGroupProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.RadioGroup
>;
type MenubarRadioItemProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.RadioItem
>;
type MenubarItemIndicatorProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.ItemIndicator
>;
type MenubarSeparatorProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.Separator
>;
type MenubarSubProps = React.ComponentPropsWithRef<typeof RadixMenubar.Sub>;
type MenubarSubTriggerProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.SubTrigger
>;
type MenubarSubContentProps = React.ComponentPropsWithRef<
	typeof RadixMenubar.SubContent
>;

const MenubarRoot = ({ className, ref, ...props }: MenubarRootProps) => (
	<RadixMenubar.Root
		ref={ref}
		className={cx("flex items-center", className)}
		{...props}
	/>
);

const MenubarMenu = ({ ...props }: MenubarMenuProps) => (
	<RadixMenubar.Menu {...props} />
);

const MenubarTrigger = ({ className, ref, ...props }: MenubarTriggerProps) => (
	<RadixMenubar.Trigger
		ref={ref}
		className={cx(
			"flex cursor-default select-none items-center rounded-sm px-3 py-1.5 text-sm font-medium outline-hidden focus:bg-muted/50 data-[state=open]:bg-background-200",
			className,
		)}
		{...props}
	/>
);

const MenubarPortal = ({ children, ...props }: MenubarPortalProps) => (
	<RadixMenubar.Portal {...props}>{children}</RadixMenubar.Portal>
);

const MenubarContent = ({ className, ref, ...props }: MenubarContentProps) => (
	<RadixMenubar.Content
		ref={ref}
		className={cx(
			"min-w-[220px] overflow-hidden rounded-md bg-background-offset dark:bg-background-100 p-1.5 shadow-black/10 shadow-modal border border-background-100 dark:border-background-300 space-y-1",
			className,
		)}
		{...props}
	/>
);

const MenubarArrow = ({ className, ref, ...props }: MenubarArrowProps) => (
	<RadixMenubar.Arrow
		ref={ref}
		className={cx("fill-background-offset dark:fill-background-100", className)}
		{...props}
	/>
);

const MenubarItem = ({ className, ref, ...props }: MenubarItemProps) => (
	<RadixMenubar.Item
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500",
			className,
		)}
		{...props}
	/>
);

const MenubarGroup = ({ className, ref, ...props }: MenubarGroupProps) => (
	<RadixMenubar.Group ref={ref} className={cx(className)} {...props} />
);

const MenubarLabel = ({ className, ref, ...props }: MenubarLabelProps) => (
	<RadixMenubar.Label
		ref={ref}
		className={cx(
			"px-2 text-[12px] leading-[25px] text-muted-foreground",
			className,
		)}
		{...props}
	/>
);

const MenubarCheckboxItem = ({
	className,
	children,
	ref,
	...props
}: MenubarCheckboxItemProps) => (
	<RadixMenubar.CheckboxItem
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500 rdx-state-checked:pl-6",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<RadixMenubar.ItemIndicator>
				<span className="h-2 w-2 rounded-full bg-primary" />
			</RadixMenubar.ItemIndicator>
		</span>
		{children}
	</RadixMenubar.CheckboxItem>
);

const MenubarRadioGroup = ({
	className,
	ref,
	...props
}: MenubarRadioGroupProps) => (
	<RadixMenubar.RadioGroup ref={ref} className={cx(className)} {...props} />
);

const MenubarRadioItem = ({
	className,
	children,
	ref,
	...props
}: MenubarRadioItemProps) => (
	<RadixMenubar.RadioItem
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500 rdx-state-checked:pl-6",
			className,
		)}
		{...props}
	>
		<span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
			<RadixMenubar.ItemIndicator>
				<span className="h-2 w-2 rounded-full bg-primary" />
			</RadixMenubar.ItemIndicator>
		</span>
		{children}
	</RadixMenubar.RadioItem>
);

const MenubarItemIndicator = ({
	className,
	ref,
	...props
}: MenubarItemIndicatorProps) => (
	<RadixMenubar.ItemIndicator
		ref={ref}
		className={cx(
			"absolute left-0 inline-flex w-[25px] items-center justify-center",
			className,
		)}
		{...props}
	/>
);

const MenubarSeparator = ({
	className,
	ref,
	...props
}: MenubarSeparatorProps) => (
	<RadixMenubar.Separator
		ref={ref}
		className={cx("mx-1.5 my-1 h-px bg-background-500", className)}
		{...props}
	/>
);

const MenubarSub = ({ ...props }: MenubarSubProps) => (
	<RadixMenubar.Sub {...props} />
);

const MenubarSubTrigger = ({
	className,
	children,
	ref,
	...props
}: MenubarSubTriggerProps) => (
	<RadixMenubar.SubTrigger
		ref={ref}
		className={cx(
			"relative flex h-6 select-none items-center rounded-sm py-2 text-[13px] leading-none text-foreground outline-hidden px-2 data-disabled:pointer-events-none data-disabled:text-muted-foreground data-highlighted:bg-background-200 dark:data-highlighted:bg-background-500",
			className,
		)}
		{...props}
	>
		{children}
	</RadixMenubar.SubTrigger>
);

const MenubarSubContent = ({
	className,
	ref,
	...props
}: MenubarSubContentProps) => (
	<RadixMenubar.SubContent
		ref={ref}
		className={cx(
			"min-w-[220px] overflow-hidden rounded-md bg-background-offset dark:bg-background-100 p-1.5 shadow-black/10 shadow-modal border border-background-100 dark:border-background-300 space-y-1",
			className,
		)}
		{...props}
	/>
);

export const Menubar = Object.assign(MenubarRoot, {
	Menu: MenubarMenu,
	Trigger: MenubarTrigger,
	Portal: MenubarPortal,
	Content: MenubarContent,
	Arrow: MenubarArrow,
	Item: MenubarItem,
	Group: MenubarGroup,
	Label: MenubarLabel,
	CheckboxItem: MenubarCheckboxItem,
	RadioGroup: MenubarRadioGroup,
	RadioItem: MenubarRadioItem,
	ItemIndicator: MenubarItemIndicator,
	Separator: MenubarSeparator,
	Sub: MenubarSub,
	SubTrigger: MenubarSubTrigger,
	SubContent: MenubarSubContent,
});
