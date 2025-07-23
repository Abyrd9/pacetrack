import * as RadixSwitch from "@radix-ui/react-switch";
import { cx } from "~/utils/helpers/cx";

type SwitchRootProps = React.ComponentPropsWithRef<typeof RadixSwitch.Root>;
type SwitchThumbProps = React.ComponentPropsWithRef<typeof RadixSwitch.Thumb>;

const SwitchRoot = ({ className, ref, ...props }: SwitchRootProps) => (
  <RadixSwitch.Root
    ref={ref}
    className={cx(
      "w-10 h-6 bg-muted/25 rounded-full flex items-center px-1 rdx-state-checked:bg-primary/25 transition-all",
      className
    )}
    {...props}
  />
);

const SwitchThumb = ({ className, ref, ...props }: SwitchThumbProps) => (
  <RadixSwitch.Thumb
    ref={ref}
    className={cx(
      "transition-all block size-[18px] bg-muted rounded-full rdx-state-checked:translate-x-[14px] rdx-state-checked:bg-primary",
      className
    )}
    {...props}
  />
);

export const Switch = Object.assign(SwitchRoot, {
  Thumb: SwitchThumb,
});
