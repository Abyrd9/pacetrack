import * as RadixAccordion from "@radix-ui/react-accordion";
import { cx } from "~/utils/helpers/cx";

type AccordionProps = React.ComponentPropsWithRef<typeof RadixAccordion.Root>;
type AccordionItemProps = React.ComponentPropsWithRef<
  typeof RadixAccordion.Item
>;
type AccordionHeaderProps = React.ComponentPropsWithRef<
  typeof RadixAccordion.Header
>;
type AccordionTriggerProps = React.ComponentPropsWithRef<
  typeof RadixAccordion.Trigger
>;
type AccordionContentProps = React.ComponentPropsWithRef<
  typeof RadixAccordion.Content
>;

const AccordionRoot = ({ className, ref, ...props }: AccordionProps) => (
  <RadixAccordion.Root
    className={cx("text-foreground", className)}
    ref={ref}
    {...props}
  />
);

const AccordionItem = ({ className, ref, ...props }: AccordionItemProps) => (
  <RadixAccordion.Item
    ref={ref}
    className={cx(
      "first-of-type:rounded-t-md last-of-type:rounded-b-md overflow-hidden",
      className
    )}
    {...props}
  />
);

const AccordionHeader = ({
  className,
  children,
  ref,
  ...props
}: AccordionHeaderProps) => (
  <RadixAccordion.Header ref={ref} className={cx("flex", className)} {...props}>
    {children}
  </RadixAccordion.Header>
);

const AccordionTrigger = ({
  className,
  children,
  ref,
  ...props
}: AccordionTriggerProps) => (
  <RadixAccordion.Trigger
    ref={ref}
    className={cx(
      "p-2 bg-background-100 dark:bg-background-200 w-full flex",
      className
    )}
    {...props}
  >
    {children}
  </RadixAccordion.Trigger>
);

const AccordionContent = ({
  className,
  children,
  ref,
  ...props
}: AccordionContentProps) => (
  <RadixAccordion.Content
    ref={ref}
    className={cx(
      "rdx-state-open:animate-accordion-down rdx-state-closed:animate-accordion-up overflow-hidden text-sm transition-all bg-background-100/50 dark:bg-background-100",
      className
    )}
    {...props}
  >
    <div className="flex flex-col px-2 py-1.5">{children}</div>
  </RadixAccordion.Content>
);

export const Accordion = Object.assign(AccordionRoot, {
  Item: AccordionItem,
  Header: AccordionHeader,
  Trigger: AccordionTrigger,
  Content: AccordionContent,
});
