import type React from "react";
import { cx } from "~/utils/helpers/cx";

export type TextareaProps = React.ComponentPropsWithRef<"textarea">;

const TextareaRoot = ({
	className,
	ref,
	...props
}: React.ComponentPropsWithRef<"label">) => (
	// biome-ignore lint/a11y/noLabelWithoutControl: This will have a form control when it's passed in as a prop
	<label
		ref={ref}
		className={cx(
			"relative flex w-full items-center overflow-clip rounded-md border border-background-300/50 dark:border-background-300/25 px-3 py-2 text-foreground after:pointer-events-none after:absolute after:-inset-y-[0.25px] after:left-0 after:h-[calc(100%_+_4px)] after:w-full after:rounded-md focus-within:border-black/10 dark:bg-background-200 bg-background [&:has(:focus-visible)]:border-background-300 [&:has(textarea:is(:disabled))]:opacity-50",
			className,
		)}
		{...props}
	/>
);

const TextareaElement = ({ className, ref, ...props }: TextareaProps) => (
	<textarea
		ref={ref}
		className={cx(
			"placeholder:text-foreground-muted block w-full bg-transparent text-sm text-foreground outline-hidden resize-none field-sizing-content min-h-[80px]",
			className,
		)}
		{...props}
	/>
);

const TextareaError = ({
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

export const Textarea = ({ className, ...props }: TextareaProps) => {
	return (
		<TextareaComposer className={className}>
			<TextareaElement {...props} />
		</TextareaComposer>
	);
};

export const TextareaComposer = Object.assign(TextareaRoot, {
	Input: TextareaElement,
	Error: TextareaError,
});
