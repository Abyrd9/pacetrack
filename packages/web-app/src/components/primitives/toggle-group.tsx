import * as RadixToggleGroup from "@radix-ui/react-toggle-group";
import { cx } from "~/utils/helpers/cx";

type ToggleGroupRootProps = React.ComponentPropsWithRef<
	typeof RadixToggleGroup.Root
>;
type ToggleGroupItemProps = React.ComponentPropsWithRef<
	typeof RadixToggleGroup.Item
>;

const ToggleGroupRoot = ({
	className,
	ref,
	...props
}: ToggleGroupRootProps) => (
	<RadixToggleGroup.Root
		ref={ref}
		className={cx("flex flex-row overflow-hidden rounded-sm w-fit", className)}
		{...props}
	/>
);

const ToggleGroupItem = ({
	className,
	ref,
	...props
}: ToggleGroupItemProps) => (
	<RadixToggleGroup.Item
		ref={ref}
		className={cx(
			"flex items-center justify-center text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground h-8 w-8 bg-background-100/50 hover:bg-background-100 dark:bg-background-300/50 dark:hover:bg-background-300 rdx-state-on:bg-background-200 rdx-state-on:text-foreground",
			className,
		)}
		{...props}
	/>
);

export const ToggleGroup = Object.assign(ToggleGroupRoot, {
	Item: ToggleGroupItem,
});
