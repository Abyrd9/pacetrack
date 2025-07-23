import * as RadixProgress from "@radix-ui/react-progress";
import { cx } from "~/utils/helpers/cx";

type ProgressProps = React.ComponentPropsWithRef<typeof RadixProgress.Root> & {
	value?: number;
	max?: number;
};

const Progress = ({
	className,
	ref,
	value,
	max = 100,
	...props
}: ProgressProps) => (
	<RadixProgress.Root
		ref={ref}
		className={cx(
			"relative h-2 w-full overflow-hidden rounded-full bg-muted/25",
			className,
		)}
		{...props}
		value={value}
		max={max}
	>
		<RadixProgress.Indicator
			className="h-full w-full flex-1 bg-primary transition-all"
			style={{ transform: `translateX(-${100 - ((value || 0) / max) * 100}%)` }}
		/>
	</RadixProgress.Root>
);

export { Progress };
