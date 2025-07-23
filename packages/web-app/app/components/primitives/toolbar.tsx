import * as RadixToolbar from "@radix-ui/react-toolbar";
import { cx } from "~/utils/helpers/cx";

type ToolbarRootProps = React.ComponentPropsWithRef<typeof RadixToolbar.Root>;
type ToolbarButtonProps = React.ComponentPropsWithRef<
  typeof RadixToolbar.Button
>;
type ToolbarLinkProps = React.ComponentPropsWithRef<typeof RadixToolbar.Link>;
type ToolbarToggleGroupProps = React.ComponentPropsWithRef<
  typeof RadixToolbar.ToggleGroup
>;
type ToolbarToggleItemProps = React.ComponentPropsWithRef<
  typeof RadixToolbar.ToggleItem
>;
type ToolbarSeparatorProps = React.ComponentPropsWithRef<
  typeof RadixToolbar.Separator
>;

const ToolbarRoot = ({ className, ref, ...props }: ToolbarRootProps) => (
  <RadixToolbar.Root
    ref={ref}
    className={cx("flex items-center rounded-sm bg-muted/20 p-2", className)}
    {...props}
  />
);

const ToolbarButton = ({ className, ref, ...props }: ToolbarButtonProps) => (
  <RadixToolbar.Button
    ref={ref}
    className={cx(
      "flex size-6 items-center justify-center rounded-md bg-muted/0 hover:bg-muted/25 active:bg-muted/25",
      className
    )}
    {...props}
  />
);

const ToolbarLink = ({ className, ref, ...props }: ToolbarLinkProps) => (
  <RadixToolbar.Link
    ref={ref}
    className={cx(
      "flex size-6 items-center justify-center rounded-md bg-muted/0 hover:bg-muted/25 active:bg-muted/25",
      className
    )}
    {...props}
  />
);

const ToolbarToggleGroup = ({
  className,
  ref,
  ...props
}: ToolbarToggleGroupProps) => (
  <RadixToolbar.ToggleGroup
    ref={ref}
    className={cx("flex items-center space-x-0.5", className)}
    {...props}
  />
);

const ToolbarToggleItem = ({
  className,
  ref,
  ...props
}: ToolbarToggleItemProps) => (
  <RadixToolbar.ToggleItem
    ref={ref}
    className={cx(
      "flex size-6 items-center justify-center rounded-md bg-muted/0 text-sm hover:bg-muted/25 active:bg-muted/25",
      className
    )}
    {...props}
  />
);

const ToolbarSeparator = ({
  className,
  ref,
  ...props
}: ToolbarSeparatorProps) => (
  <RadixToolbar.Separator
    ref={ref}
    className={cx("h-4 w-px bg-muted", className)}
    {...props}
  />
);

export const Toolbar = Object.assign(ToolbarRoot, {
  Button: ToolbarButton,
  Link: ToolbarLink,
  ToggleGroup: ToolbarToggleGroup,
  ToggleItem: ToolbarToggleItem,
  Separator: ToolbarSeparator,
});
