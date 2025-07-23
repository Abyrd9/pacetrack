import type React from "react";
import { cx } from "~/utils/helpers/cx";

export type InputProps = React.ComponentPropsWithRef<"input">;

const InputRoot = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithRef<"label">) => (
	// biome-ignore lint/a11y/noLabelWithoutControl: This will have a form control when it's passed in as a prop
	<label
		ref={ref}
		className={cx(
			"relative flex w-full items-center overflow-clip rounded-md border border-background-300/50 dark:border-background-300/25 px-3 py-2 text-foreground after:pointer-events-none after:absolute after:-inset-y-[0.25px] after:left-0 after:h-[calc(100%_+_4px)] after:w-full after:rounded-md focus-within:border-black/10 dark:bg-background-200 bg-background [&:has(:focus-visible)]:border-background-300 [&:has(input:is(:disabled))]:opacity-50",
			className,
		)}
		{...props}
	/>
);

const InputElement = ({ className, ref, ...props }: InputProps) => (
	<input
		ref={ref}
		className={cx(
			"placeholder:text-foreground-muted block w-full bg-transparent text-sm text-foreground outline-hidden",
			className,
		)}
		{...props}
	/>
);

export const InputError = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithRef<"span">) => (
	<span
		ref={ref}
		className={cx("text-xs text-red-500", className)}
		{...props}
	/>
);

export const Input = ({ className, ...props }: InputProps) => {
	return (
		<InputComposer className={className}>
			<InputElement {...props} />
		</InputComposer>
	);
};

export const InputComposer = Object.assign(InputRoot, {
	Input: InputElement,
	Error: InputError,
});
