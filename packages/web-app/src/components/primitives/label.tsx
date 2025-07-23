import * as RadixLabel from "@radix-ui/react-label";
import type React from "react";
import { cx } from "~/utils/helpers/cx";

type LabelProps = React.ComponentPropsWithRef<"label">;

const Label = ({ className, ref, ...props }: LabelProps) => (
	<RadixLabel.Label
		ref={ref}
		className={cx(
			"mb-2 block text-sm font-medium leading-none text-foreground",
			className,
		)}
		{...props}
	/>
);

export { Label };
