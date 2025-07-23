import { cx } from "~/utils/helpers/cx";

type CardRootProps = React.ComponentPropsWithRef<"div">;

const CardRoot = ({ children, className, ref, ...props }: CardRootProps) => {
	return (
		<div
			ref={ref}
			className={cx(
				"rounded-sm border border-background-300 bg-background-offset p-4 shadow-card shadow-black/5 dark:shadow-black/50",
				className,
			)}
			{...props}
		>
			{children}
		</div>
	);
};

export const Card = Object.assign(CardRoot, {});
