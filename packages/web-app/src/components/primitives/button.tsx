import { Slot } from "@radix-ui/react-slot";
import { colord } from "colord";
import { LoaderCircleIcon } from "lucide-react";
import { type ComponentPropsWithRef, createContext, useContext } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cx } from "~/utils/helpers/cx";

// Base button styles that can be reused
export const buttonBaseStyles = tv({
	base: "relative h-fit overflow-hidden whitespace-nowrap rounded-md py-1.5 outline-hidden select-none cursor-pointer px-2.5 flex items-center justify-center text-foreground transition-colors duration-75",
	variants: {
		kind: {
			default: "",
			icon: "",
		},
		size: {
			default: "text-sm",
			sm: "text-xs",
			lg: "text-base",
		},
		variant: {
			default: [
				"border-black/[1%] dark:border-black/[1%] border shadow-black/5 dark:shadow-black/10 transition-colors duration-75 bg-background-100 dark:bg-background-200",
				// hover styles
				"hover:bg-background-200",
				// :after styles
				"after:shadow-highlight after:absolute after:-inset-y-[0.25px] after:h-[calc(100%_+_4px)] after:w-full after:rounded-md after:left-0 after:top-0",
			],
			outline: [
				"bg-transparent border-2 border-foreground/80 dark:border-foreground/70",
				// hover styles
				"hover:bg-foreground-100/[4%] hover:border-foreground/100 dark:hover:border-foreground/90 dark:hover:bg-foreground-100/[6%]",
			],
			ghost: [
				"bg-background-100/40 dark:bg-background-200/40",
				// hover styles
				"hover:bg-background-100/80 dark:hover:bg-background-200",
			],
			transparent: [
				"bg-transparent",
				// hover styles
				"hover:bg-foreground-100/[4%] hover:border-foreground/100 dark:hover:border-foreground/90 dark:hover:bg-foreground-100/[6%]",
			],
		},
		disabled: {
			true: "pointer-events-none touch-none text-foreground/50 border-foreground/50",
		},
		color: {
			true: "",
		},
	},
	compoundVariants: [
		{
			color: true,
			variant: "default",
			disabled: false,
			class: [
				"bg-[var(--btn-color)] border-transparent text-[var(--btn-text-color)] dark:bg-[var(--btn-color)]",
				"hover:bg-[var(--btn-hover-color)]",
			],
		},
		{
			color: true,
			variant: "default",
			disabled: true,
			class:
				"bg-[var(--btn-color)]/50 border-transparent text-[var(--btn-text-color)]/75 dark:bg-[var(--btn-color)]/50",
		},
		{
			color: true,
			variant: "outline",
			class: [
				"border-[var(--btn-color)]/80 text-[var(--btn-color)] bg-transparent dark:border-[var(--btn-color)]",
				"hover:bg-[var(--btn-hover-color)]/10 dark:hover:bg-[var(--btn-hover-color)]/10 hover:border-[var(--btn-hover-color)]/100 dark:hover:border-[var(--btn-hover-color)]/90",
			],
		},
		{
			color: true,
			variant: "ghost",
			class: [
				"bg-[var(--btn-color)]/10 dark:bg-[var(--btn-color)]/25",
				"hover:bg-[var(--btn-color)]/30 dark:hover:bg-[var(--btn-color)]/35",
			],
		},
		{
			color: true,
			variant: "transparent",
			class: [
				"bg-transparent text-[var(--btn-color)]",
				"hover:bg-[var(--btn-color)]/10 dark:hover:bg-[var(--btn-color)]/25",
			],
		},
		{
			kind: "icon",
			size: "default",
			class: "h-8 w-8 min-w-8 min-h-8 p-1 text-base",
		},
		{
			kind: "icon",
			size: "sm",
			class: "h-7 w-7 min-w-7 min-h-7 p-1 text-sm",
		},
		{
			kind: "icon",
			size: "lg",
			class: "h-9 w-9 min-w-9 min-h-9 p-1 text-lg",
		},
	],
	defaultVariants: {
		size: "default",
		variant: "default",
	},
});

// Regular button styles (kind: "default")
export const buttonStyles = (props: {
	variant?: "default" | "outline" | "ghost" | "transparent";
	size?: "default" | "sm" | "lg";
	disabled?: boolean;
	color?: boolean;
	className?: string;
}) => {
	return buttonBaseStyles({
		kind: "default",
		...props,
	});
};

// Icon button styles (kind: "icon")
export const iconButtonStyles = (props: {
	variant?: "default" | "outline" | "ghost" | "transparent";
	size?: "default" | "sm" | "lg";
	disabled?: boolean;
	color?: boolean;
	className?: string;
}) => {
	return buttonBaseStyles({
		kind: "icon",
		...props,
	});
};

// Legacy export for backward compatibility
export const button = buttonBaseStyles;

type ButtonVariants = VariantProps<typeof buttonBaseStyles>;
export type ButtonProps = ComponentPropsWithRef<"button"> &
	Omit<ButtonVariants, "color"> & {
		asChild?: boolean;
		color?: string;
		isLoading?: boolean;
	};

const ButtonLoadingContext = createContext({ isLoading: false });

const ButtonRoot = ({
	className,
	variant = "default",
	size = "default",
	color,
	isLoading,
	children,
	asChild,
	...props
}: Omit<ButtonProps, "kind">) => {
	const Comp = asChild ? Slot : "button";

	const buttonStyle = color
		? {
				...props.style,
				"--btn-color": colord(color).toRgbString(),
				"--btn-text-color": colord(color).isDark()
					? colord("#fff").toRgbString()
					: colord("#000").toRgbString(),
				"--btn-hover-color": colord(color).lighten(0.05).toRgbString(),
			}
		: props.style;

	return (
		<ButtonLoadingContext.Provider value={{ isLoading: Boolean(isLoading) }}>
			<Comp
				{...props}
				className={buttonStyles({
					variant,
					size,
					disabled: props.disabled || isLoading,
					color: Boolean(color),
					className,
				})}
				style={buttonStyle}
				disabled={isLoading || props.disabled}
			>
				{children}
			</Comp>
		</ButtonLoadingContext.Provider>
	);
};

type ButtonLoaderProps = React.HTMLAttributes<HTMLDivElement>;

const ButtonLoader = ({ className, children, ...props }: ButtonLoaderProps) => {
	const { isLoading } = useContext(ButtonLoadingContext);

	return (
		<>
			<div
				className={cx(
					"absolute inset-0 size-full items-center justify-center overflow-hidden rounded-md",
					isLoading ? "flex opacity-100" : "hidden opacity-0",
					className,
				)}
				{...props}
			>
				<LoaderCircleIcon className="animate-spin text-sm" />
			</div>
			<div
				className={cx(
					isLoading ? "opacity-0" : "opacity-100",
					"flex items-center justify-center",
					className,
				)}
				{...props}
			>
				{children}
			</div>
		</>
	);
};

export const Button = Object.assign(ButtonRoot, {
	Loader: ButtonLoader,
});
