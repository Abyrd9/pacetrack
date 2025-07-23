import * as RadixTabs from "@radix-ui/react-tabs";
import { cx } from "~/utils/helpers/cx";

type TabsRootProps = React.ComponentPropsWithRef<typeof RadixTabs.Root>;
type TabsListProps = React.ComponentPropsWithRef<typeof RadixTabs.List>;
type TabsTriggerProps = React.ComponentPropsWithRef<typeof RadixTabs.Trigger>;
type TabsContentProps = React.ComponentPropsWithRef<typeof RadixTabs.Content>;

const TabsRoot = ({ ref, ...props }: TabsRootProps) => (
  <RadixTabs.Root ref={ref} {...props} />
);

const TabsList = ({ className, ref, ...props }: TabsListProps) => (
  <RadixTabs.List
    ref={ref}
    className={cx("flex w-full border-b border-muted", className)}
    {...props}
  />
);

const TabsTrigger = ({ className, ref, ...props }: TabsTriggerProps) => (
  <RadixTabs.Trigger
    ref={ref}
    className={cx(
      "rdx-state-active:border-foreground rdx-state-active:text-foreground rounded-t-lg border-b-2 border-transparent px-4 py-2 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-foreground",
      className
    )}
    {...props}
  />
);

const TabsContent = ({ className, ref, ...props }: TabsContentProps) => (
  <RadixTabs.Content
    ref={ref}
    className={cx("overflow-hidden", className)}
    {...props}
  />
);

export const Tabs = Object.assign(TabsRoot, {
  List: TabsList,
  Trigger: TabsTrigger,
  Content: TabsContent,
});
