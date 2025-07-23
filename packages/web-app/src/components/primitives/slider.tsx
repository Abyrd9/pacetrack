import * as RadixSlider from "@radix-ui/react-slider";
import { cx } from "~/utils/helpers/cx";

type SliderProps = React.ComponentPropsWithRef<typeof RadixSlider.Root> & {
	thickness?: "thin" | "normal";
};

const Slider = ({
	className,
	ref,
	thickness = "normal",
	...props
}: SliderProps) => (
	<RadixSlider.Root
		ref={ref}
		className={cx(
			"relative flex w-full touch-none select-none items-center",
			className,
		)}
		{...props}
	>
		<RadixSlider.Track
			className={cx(
				"relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted/25",
				thickness === "thin" && "h-0.5",
			)}
		>
			<RadixSlider.Range className="absolute h-full bg-primary" />
		</RadixSlider.Track>
		<RadixSlider.Thumb
			className={cx(
				"block size-4 rounded-full border border-primary/50 bg-background shadow-sm transition-colors focus-visible:outline-hidden focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
				thickness === "thin" && "size-3",
			)}
		/>
	</RadixSlider.Root>
);

export { Slider };
