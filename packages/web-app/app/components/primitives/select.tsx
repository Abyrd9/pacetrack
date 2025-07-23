import * as RadixSelect from "@radix-ui/react-select";
import {
	CheckIcon,
	ChevronDownIcon,
	ChevronUpIcon,
	ChevronsUpDownIcon,
} from "lucide-react";
import { cx } from "~/utils/helpers/cx";
import { Button } from "./button";

type SelectRootProps = React.ComponentPropsWithRef<typeof RadixSelect.Root>;
type SelectTriggerProps = React.ComponentPropsWithRef<
	typeof RadixSelect.Trigger
>;
type SelectPortalProps = React.ComponentPropsWithRef<typeof RadixSelect.Portal>;
type SelectValueProps = React.ComponentPropsWithRef<typeof RadixSelect.Value>;
type SelectIconProps = React.ComponentPropsWithRef<typeof RadixSelect.Icon>;
type SelectContentProps = React.ComponentPropsWithRef<
	typeof RadixSelect.Content
>;
type SelectViewportProps = React.ComponentPropsWithRef<
	typeof RadixSelect.Viewport
>;
type SelectItemProps = React.ComponentPropsWithRef<typeof RadixSelect.Item>;
type SelectItemTextProps = React.ComponentPropsWithRef<
	typeof RadixSelect.ItemText
>;
type SelectItemIndicatorProps = React.ComponentPropsWithRef<
	typeof RadixSelect.ItemIndicator
>;
type SelectScrollUpButtonProps = React.ComponentPropsWithRef<
	typeof RadixSelect.ScrollUpButton
>;
type SelectScrollDownButtonProps = React.ComponentPropsWithRef<
	typeof RadixSelect.ScrollDownButton
>;
type SelectGroupProps = React.ComponentPropsWithRef<typeof RadixSelect.Group>;
type SelectLabelProps = React.ComponentPropsWithRef<typeof RadixSelect.Label>;
type SelectSeparatorProps = React.ComponentPropsWithRef<
	typeof RadixSelect.Separator
>;
type SelectArrowProps = React.ComponentPropsWithRef<typeof RadixSelect.Arrow>;

const SelectRoot = ({ ...props }: SelectRootProps) => (
	<RadixSelect.Root {...props} />
);

const SelectTrigger = ({
	className,
	ref,
	children,
	...props
}: SelectTriggerProps) => (
	<RadixSelect.Trigger
		asChild
		ref={ref}
		className={cx(
			{
				"justify-between space-x-5 px-2 data-[placeholder]:text-foreground":
					!props.asChild,
			},
			!props.asChild && className,
		)}
		{...props}
	>
		{props.asChild ? (
			children
		) : (
			<Button
				className={cx(
					"justify-between space-x-5 px-2 data-[placeholder]:text-foreground",
					className,
				)}
			>
				{children}
			</Button>
		)}
	</RadixSelect.Trigger>
);

const SelectPortal = ({ children, ...props }: SelectPortalProps) => (
	<RadixSelect.Portal {...props}>{children}</RadixSelect.Portal>
);

const SelectValue = ({
	className,
	ref,
	children,
	...props
}: SelectValueProps) => (
	<RadixSelect.Value ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixSelect.Value>
);

const SelectIcon = ({
	className,
	ref,
	children,
	...props
}: SelectIconProps) => (
	<RadixSelect.Icon ref={ref} className={cx("", className)} {...props}>
		{children ?? <ChevronsUpDownIcon />}
	</RadixSelect.Icon>
);

const SelectContent = ({
	className,
	ref,
	children,
	...props
}: SelectContentProps) => (
	<RadixSelect.Content
		ref={ref}
		className={cx(
			"relative overflow-hidden rounded-sm bg-background-offset dark:bg-background-200 shadow-modal shadow-black/10 min-w-[var(--radix-select-trigger-width)] origin-[var(--radix-select-content-transform-origin)] data-[state=closed]:animate-[dialog-out_150ms_cubic-bezier(0.33,1,0.68,1)] data-[state=open]:animate-[dialog-in_150ms_cubic-bezier(0.33,1,0.68,1)] dark:border max-h-[var(--radix-select-content-available-height)] border border-background-100 dark:border-background-300",
			className,
		)}
		{...props}
	>
		{children}
	</RadixSelect.Content>
);

const SelectViewport = ({
	className,
	ref,
	children,
	...props
}: SelectViewportProps) => (
	<RadixSelect.Viewport
		ref={ref}
		className={cx("px-1 py-1.5", className)}
		{...props}
	>
		{children}
	</RadixSelect.Viewport>
);

const SelectItem = ({
	className,
	ref,
	children,
	...props
}: SelectItemProps) => (
	<RadixSelect.Item
		ref={ref}
		className={cx(
			"relative cursor-pointer select-none rounded-sm py-2 pl-3 pr-4 text-sm data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-background-200/50 dark:data-[highlighted]:bg-background-300/50 data-[highlighted]:outline-hidden",
			className,
		)}
		{...props}
	>
		{children}
	</RadixSelect.Item>
);

const SelectItemText = ({
	className,
	ref,
	children,
	...props
}: SelectItemTextProps) => (
	<RadixSelect.ItemText ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixSelect.ItemText>
);

const SelectItemIndicator = ({
	className,
	ref,
	children,
	...props
}: SelectItemIndicatorProps) => (
	<RadixSelect.ItemIndicator
		ref={ref}
		className={cx("text-sm", className)}
		{...props}
	>
		{children ?? <CheckIcon />}
	</RadixSelect.ItemIndicator>
);

const SelectScrollUpButton = ({
	className,
	ref,
	children,
	...props
}: SelectScrollUpButtonProps) => (
	<RadixSelect.ScrollUpButton
		ref={ref}
		className={cx(
			"flex w-full cursor-pointer select-none items-center justify-center bg-background py-1 dark:bg-background-200",
			className,
		)}
		{...props}
	>
		{children ?? <ChevronUpIcon />}
	</RadixSelect.ScrollUpButton>
);

const SelectScrollDownButton = ({
	className,
	ref,
	children,
	...props
}: SelectScrollDownButtonProps) => (
	<RadixSelect.ScrollDownButton
		ref={ref}
		className={cx(
			"flex w-full cursor-pointer select-none items-center justify-center bg-background py-1 dark:bg-background-200",
			className,
		)}
		{...props}
	>
		{children ?? <ChevronDownIcon />}
	</RadixSelect.ScrollDownButton>
);

const SelectGroup = ({
	className,
	ref,
	children,
	...props
}: SelectGroupProps) => (
	<RadixSelect.Group ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixSelect.Group>
);

const SelectLabel = ({
	className,
	ref,
	children,
	...props
}: SelectLabelProps) => (
	<RadixSelect.Label
		ref={ref}
		className={cx(
			"px-1.5 py-2 text-xs font-normal text-muted-foreground",
			className,
		)}
		{...props}
	>
		{children}
	</RadixSelect.Label>
);

const SelectSeparator = ({
	className,
	ref,
	children,
	...props
}: SelectSeparatorProps) => (
	<RadixSelect.Separator
		ref={ref}
		className={cx(
			"my-1.5 h-[1px] w-full bg-background-300 dark:bg-background-400",
			className,
		)}
		{...props}
	>
		{children}
	</RadixSelect.Separator>
);

const SelectArrow = ({
	className,
	ref,
	children,
	...props
}: SelectArrowProps) => (
	<RadixSelect.Arrow ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixSelect.Arrow>
);

export const Select = Object.assign(SelectRoot, {
	Portal: SelectPortal,
	Trigger: SelectTrigger,
	Value: SelectValue,
	Icon: SelectIcon,
	Content: SelectContent,
	Viewport: SelectViewport,
	Item: SelectItem,
	ItemText: SelectItemText,
	ItemIndicator: SelectItemIndicator,
	ScrollUpButton: SelectScrollUpButton,
	ScrollDownButton: SelectScrollDownButton,
	Group: SelectGroup,
	Label: SelectLabel,
	Separator: SelectSeparator,
	Arrow: SelectArrow,
});
