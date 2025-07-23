import * as RadixRadioGroup from "@radix-ui/react-radio-group";
import { cx } from "~/utils/helpers/cx";

type RadioGroupRootProps = React.ComponentPropsWithRef<
  typeof RadixRadioGroup.Root
>;
type RadioGroupItemProps = React.ComponentPropsWithRef<
  typeof RadixRadioGroup.Item
>;
type RadioGroupIndicatorProps = React.ComponentPropsWithRef<
  typeof RadixRadioGroup.Indicator
>;

const RadioGroupRoot = ({ ref, ...props }: RadioGroupRootProps) => (
  <RadixRadioGroup.Root ref={ref} {...props} />
);

const RadioGroupItem = ({ className, ref, ...props }: RadioGroupItemProps) => (
  <RadixRadioGroup.Item
    ref={ref}
    className={cx(
      "flex size-[16px] items-center justify-center rounded-full border border-primary/10 bg-muted/50",
      className
    )}
    {...props}
  />
);

const RadioGroupIndicator = ({
  className,
  ref,
  ...props
}: RadioGroupIndicatorProps) => (
  <RadixRadioGroup.Indicator
    ref={ref}
    className={cx("size-[8px] rounded-full bg-primary", className)}
    {...props}
  />
);

export const RadioGroup = Object.assign(RadioGroupRoot, {
  Item: RadioGroupItem,
  Indicator: RadioGroupIndicator,
});
