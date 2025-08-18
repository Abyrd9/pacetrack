import * as RadixCheckbox from "@radix-ui/react-checkbox";
import { CheckIcon } from "lucide-react";
import { createContext } from "react";
import { tv, type VariantProps } from "tailwind-variants";
import { cx } from "~/utils/helpers/cx";

type CheckboxVariants = VariantProps<typeof checkbox>;
type CheckboxRootProps = React.ComponentPropsWithRef<
	typeof RadixCheckbox.Root
> &
	CheckboxVariants;

type CheckboxIndicatorProps = React.ComponentPropsWithRef<
	typeof RadixCheckbox.Indicator
>;

const CheckboxContext = createContext({ size: "default" });

const checkbox = tv({
	base: "relative flex items-center justify-center overflow-hidden rounded-[7px] border border-black/[8%] bg-white text-muted-foreground/80 shadow-button shadow-black/5 ring-foreground ring-offset-1 transition-colors after:pointer-events-none after:absolute after:-inset-y-[0.25px] after:h-[calc(100%_+_4px)] after:w-full after:rounded-[7px] hover:bg-gray-50 hover:text-muted-foreground/100 focus-visible:ring-2 active:bg-gray-50 disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none rdx-state-on:bg-gray-100 rdx-state-on:text-foreground dark:bg-background-200 dark:shadow-black/10 dark:after:shadow-highlight dark:after:shadow-white/[2%] dark:hover:bg-background-200/80 dark:active:bg-background-200/80 dark:rdx-state-checked:text-white",
	variants: {
		size: {
			default: "size-6 p-1 text-sm",
			sm: "size-5 p-1 text-[11px] rounded-md",
			lg: "size-7 p-1 text-lg",
		},
	},
});

const CheckboxIndicator = ({
	className,
	ref,
	...props
}: CheckboxIndicatorProps) => {
	return (
		<RadixCheckbox.Indicator
			ref={ref}
			className={cx("border", className)}
			{...props}
		/>
	);
};

const CheckboxRoot = ({
	className,
	size = "default",
	ref,
	...props
}: CheckboxRootProps) => {
	return (
		<CheckboxContext.Provider value={{ size }}>
			<RadixCheckbox.Root
				ref={ref}
				className={checkbox({ size, className })}
				{...props}
			/>
		</CheckboxContext.Provider>
	);
};

export const Checkbox = ({ className, ref, ...props }: CheckboxRootProps) => (
	<CheckboxRoot ref={ref} className={className} {...props}>
		<CheckboxIndicator className="border-none rdx-state-checked:animate-[checkbox-in_100ms_ease-out] rdx-state-unchecked:animate-[checkbox-out_100ms_ease-out]">
			<CheckIcon />
		</CheckboxIndicator>
	</CheckboxRoot>
);

export const CheckboxComposer = Object.assign(CheckboxRoot, {
	Indicator: CheckboxIndicator,
});
