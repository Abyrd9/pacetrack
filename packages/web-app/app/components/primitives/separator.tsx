import * as RadixSeparator from "@radix-ui/react-separator";
import { cx } from "~/utils/helpers/cx";

type SeparatorProps = React.ComponentPropsWithRef<typeof RadixSeparator.Root>;

const Separator = ({ className, ref, ...props }: SeparatorProps) => (
  <RadixSeparator.Root
    ref={ref}
    className={cx("h-[1px] w-full bg-muted", className)}
    {...props}
  />
);

export { Separator };
