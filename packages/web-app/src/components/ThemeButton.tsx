import { CheckIcon, ComputerIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "~/utils/services/client-theme/ThemeProvider";
import { DropdownMenu } from "./primitives/dropdown-menu";

export function ThemeButton() {
	const [{ theme, isSystem }, setTheme] = useTheme();

	return (
		<DropdownMenu>
			<DropdownMenu.Trigger kind="icon" variant="ghost" className="">
				{isSystem ? (
					<ComputerIcon className="text-xs" />
				) : theme === "light" ? (
					<SunIcon className="text-xs" />
				) : theme === "dark" ? (
					<MoonIcon className="text-xs" />
				) : (
					<ComputerIcon />
				)}
			</DropdownMenu.Trigger>
			<DropdownMenu.Portal>
				<DropdownMenu.Content
					sideOffset={5}
					align="start"
					className="min-w-[150px]"
				>
					<DropdownMenu.RadioGroup
						value={isSystem ? "system" : theme}
						onValueChange={(value) =>
							setTheme(value as "light" | "dark" | "system")
						}
					>
						<DropdownMenu.RadioItem
							className={
								"flex items-center gap-2 w-full data-[state=checked]:bg-background-100"
							}
							value="light"
						>
							<div className="flex items-center gap-2">
								<SunIcon />
								<span>Light</span>
							</div>
							<DropdownMenu.ItemIndicator className="ml-auto text-xs">
								<CheckIcon />
							</DropdownMenu.ItemIndicator>
						</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem
							className={
								"flex items-center gap-2 w-full data-[state=checked]:bg-background-100 dark:data-[state=checked]:bg-background-300"
							}
							value="dark"
						>
							<div className="flex items-center gap-2">
								<MoonIcon />
								<span>Dark</span>
							</div>
							<DropdownMenu.ItemIndicator className="ml-auto text-xs">
								<CheckIcon />
							</DropdownMenu.ItemIndicator>
						</DropdownMenu.RadioItem>
						<DropdownMenu.RadioItem
							className={
								"flex items-center gap-2 w-full data-[state=checked]:bg-background-100 dark:data-[state=checked]:bg-background-300"
							}
							value="system"
						>
							<div className="flex items-center gap-2">
								<ComputerIcon />
								<span>System</span>
							</div>
							<DropdownMenu.ItemIndicator className="ml-auto text-xs">
								<CheckIcon />
							</DropdownMenu.ItemIndicator>
						</DropdownMenu.RadioItem>
					</DropdownMenu.RadioGroup>
				</DropdownMenu.Content>
			</DropdownMenu.Portal>
		</DropdownMenu>
	);
}
