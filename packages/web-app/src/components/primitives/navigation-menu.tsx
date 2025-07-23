import * as RadixNavigationMenu from "@radix-ui/react-navigation-menu";
import { cx } from "~/utils/helpers/cx";

type NavigationMenuRootProps = React.ComponentPropsWithRef<
	typeof RadixNavigationMenu.Root
>;
type NavigationMenuListProps = React.ComponentPropsWithRef<
	typeof RadixNavigationMenu.List
>;
type NavigationMenuTriggerProps = React.ComponentPropsWithRef<
	typeof RadixNavigationMenu.Trigger
>;
type NavigationMenuContentProps = React.ComponentPropsWithRef<
	typeof RadixNavigationMenu.Content
>;
type NavigationMenuLinkProps = React.ComponentPropsWithRef<
	typeof RadixNavigationMenu.Link
>;

const NavigationMenuRoot = ({
	className,
	ref,
	children,
	...props
}: NavigationMenuRootProps) => (
	<RadixNavigationMenu.Root
		ref={ref}
		className={cx(
			"relative z-10 flex max-w-max flex-1 items-center justify-center",
			className,
		)}
		{...props}
	>
		{children}
		<RadixNavigationMenu.Viewport className="data-[state=open]:animate-[scale-in_200ms_ease] data-[state=closed]:animate-[scale-out_200ms_ease] absolute left-0 top-full flex justify-center" />
	</RadixNavigationMenu.Root>
);

const NavigationMenuList = ({
	className,
	ref,
	...props
}: NavigationMenuListProps) => (
	<RadixNavigationMenu.List
		ref={ref}
		className={cx(
			"group flex flex-1 list-none items-center justify-center space-x-1",
			className,
		)}
		{...props}
	/>
);

const NavigationMenuTrigger = ({
	className,
	ref,
	children,
	...props
}: NavigationMenuTriggerProps) => (
	<RadixNavigationMenu.Trigger
		ref={ref}
		className={cx(
			"group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-muted/50 focus:bg-muted/50 focus:outline-hidden disabled:pointer-events-none disabled:opacity-50 data-active:bg-muted/50 data-[state=open]:bg-muted/50",
			className,
		)}
		{...props}
	>
		{children}
	</RadixNavigationMenu.Trigger>
);

const NavigationMenuContent = ({
	className,
	ref,
	...props
}: NavigationMenuContentProps) => (
	<RadixNavigationMenu.Content
		ref={ref}
		className={cx(
			"left-0 top-0 w-full data-[motion^=from-]:animate-[enter_200ms_ease] data-[motion^=to-]:animate-[exit_200ms_ease] md:absolute md:w-auto",
			className,
		)}
		{...props}
	/>
);

const NavigationMenuLink = ({
	className,
	ref,
	...props
}: NavigationMenuLinkProps) => (
	<RadixNavigationMenu.Link
		ref={ref}
		className={cx(
			"block select-none space-y-1 rounded-md p-3 leading-none no-underline outline-hidden transition-colors hover:bg-muted/50 focus:bg-muted/50",
			className,
		)}
		{...props}
	/>
);

export const NavigationMenu = Object.assign(NavigationMenuRoot, {
	List: NavigationMenuList,
	Item: RadixNavigationMenu.Item,
	Trigger: NavigationMenuTrigger,
	Content: NavigationMenuContent,
	Link: NavigationMenuLink,
	Indicator: RadixNavigationMenu.Indicator,
});
