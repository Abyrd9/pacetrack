import * as RadixCollapsible from "@radix-ui/react-collapsible";
import { cx } from "~/utils/helpers/cx";

type CollapsibleRootProps = React.ComponentPropsWithRef<
	typeof RadixCollapsible.Root
>;
type CollapsibleTriggerProps = React.ComponentPropsWithRef<
	typeof RadixCollapsible.Trigger
>;
type CollapsibleContentProps = React.ComponentPropsWithRef<
	typeof RadixCollapsible.Content
>;

const CollapsibleRoot = ({ ref, ...props }: CollapsibleRootProps) => (
	<RadixCollapsible.Root ref={ref} {...props} />
);

const CollapsibleTrigger = ({
	className,
	ref,
	children,
	...props
}: CollapsibleTriggerProps) => (
	<RadixCollapsible.Trigger ref={ref} className={cx("", className)} {...props}>
		{children}
	</RadixCollapsible.Trigger>
);

const CollapsibleContent = ({
	className,
	ref,
	...props
}: CollapsibleContentProps) => (
	<RadixCollapsible.Content ref={ref} className={cx(className)} {...props} />
);

export const Collapsible = Object.assign(CollapsibleRoot, {
	Trigger: CollapsibleTrigger,
	Content: CollapsibleContent,
});
