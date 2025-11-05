import { useVirtualizer } from "@tanstack/react-virtual";
import type { LucideIcon } from "lucide-react";
import { icons } from "lucide-react";
import { matchSorter } from "match-sorter";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { cx } from "~/utils/helpers/cx";
import { IconButton } from "./icon-button";
import { Input } from "./input";
import { Label } from "./label";
import { Popover } from "./popover";
import { Separator } from "./separator";
import { Tabs } from "./tabs";

const Icons = Object.entries(icons);

const COLOR_GROUPS = [
	{
		name: "Grayscale",
		colors: ["#000000", "#404040", "#737373", "#a3a3a3", "#d4d4d4", "#ffffff"],
	},
	{
		name: "Red",
		colors: ["#991b1b", "#dc2626", "#ef4444", "#f87171", "#fca5a5", "#fecaca"],
	},
	{
		name: "Orange",
		colors: ["#9a3412", "#ea580c", "#f97316", "#fb923c", "#fdba74", "#fed7aa"],
	},
	{
		name: "Amber",
		colors: ["#92400e", "#d97706", "#f59e0b", "#fbbf24", "#fcd34d", "#fde68a"],
	},
	{
		name: "Yellow",
		colors: ["#854d0e", "#ca8a04", "#eab308", "#facc15", "#fde047", "#fef08a"],
	},
	{
		name: "Lime",
		colors: ["#365314", "#4d7c0f", "#65a30d", "#84cc16", "#a3e635", "#d9f99d"],
	},
	{
		name: "Green",
		colors: ["#14532d", "#166534", "#16a34a", "#22c55e", "#4ade80", "#86efac"],
	},
	{
		name: "Emerald",
		colors: ["#064e3b", "#047857", "#10b981", "#34d399", "#6ee7b7", "#a7f3d0"],
	},
	{
		name: "Teal",
		colors: ["#134e4a", "#0f766e", "#14b8a6", "#2dd4bf", "#5eead4", "#99f6e4"],
	},
	{
		name: "Cyan",
		colors: ["#164e63", "#0e7490", "#06b6d4", "#22d3ee", "#67e8f9", "#a5f3fc"],
	},
	{
		name: "Sky",
		colors: ["#0c4a6e", "#075985", "#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc"],
	},
	{
		name: "Blue",
		colors: ["#1e3a8a", "#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd"],
	},
	{
		name: "Indigo",
		colors: ["#312e81", "#3730a3", "#4f46e5", "#6366f1", "#818cf8", "#a5b4fc"],
	},
	{
		name: "Violet",
		colors: ["#4c1d95", "#5b21b6", "#7c3aed", "#8b5cf6", "#a78bfa", "#c4b5fd"],
	},
	{
		name: "Purple",
		colors: ["#581c87", "#6b21a8", "#9333ea", "#a855f7", "#c084fc", "#d8b4fe"],
	},
	{
		name: "Fuchsia",
		colors: ["#701a75", "#86198f", "#c026d3", "#d946ef", "#e879f9", "#f0abfc"],
	},
	{
		name: "Pink",
		colors: ["#831843", "#9f1239", "#db2777", "#ec4899", "#f472b6", "#f9a8d4"],
	},
	{
		name: "Rose",
		colors: ["#881337", "#9f1239", "#e11d48", "#f43f5e", "#fb7185", "#fda4af"],
	},
];

type IconPickerProps = {
	value: {
		icon: string;
		color: string;
	};
	onChange: (value: { icon: string; color: string }) => void;
	label?: string;
	className?: string;
	disabled?: boolean;
	variant?: "full" | "button-only";
};

const COLUMNS = 8;
const ITEM_SIZE = 44; // 40px button + 4px gap

export function IconPicker({
	value,
	onChange,
	label,
	className,
	disabled,
	variant = "full",
}: IconPickerProps) {
	const [open, setOpen] = useState(false);
	const [search, setSearch] = useState("");
	const [colorInputValue, setColorInputValue] = useState(value.color);
	const [isColorValid, setIsColorValid] = useState(true);

	// Update color input when value changes externally
	useEffect(() => {
		setColorInputValue(value.color);
	}, [value.color]);

	// Filter icons based on search with memoization for performance
	const iconsToRender = useMemo(() => {
		if (!search) return Icons;
		return matchSorter(Icons, search, {
			keys: [([name]) => name],
			threshold: matchSorter.rankings.CONTAINS,
		});
	}, [search]);

	// Calculate rows for virtualization
	const rowCount = Math.ceil(iconsToRender.length / COLUMNS);

	// Ref for the scrollable container
	const parentRef = useRef<HTMLDivElement>(null);

	// Virtualizer for rows
	const rowVirtualizer = useVirtualizer({
		count: rowCount,
		getScrollElement: () => parentRef.current,
		estimateSize: () => ITEM_SIZE,
		overscan: 2,
	});

	// Force virtualizer to recalculate after popover animation completes
	const handlePopoverAnimationEnd = () => {
		rowVirtualizer.measure();
	};

	const handleIconSelect = (iconName: string) => {
		onChange({ ...value, icon: iconName });
		setOpen(false);
		setSearch(""); // Reset search when selecting
	};

	const handleColorChange = (color: string) => {
		setColorInputValue(color);
		setIsColorValid(true); // Always valid when selecting from presets
		onChange({ ...value, color });
	};

	const handleColorInputChange = (e: ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		setColorInputValue(newValue);

		// Check if it's a valid hex color
		const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(newValue);
		setIsColorValid(isValidHex);

		if (isValidHex) {
			onChange({ ...value, color: newValue });
		}
	};

	// Get the selected icon component
	const SelectedIcon = icons[value.icon as keyof typeof icons] as LucideIcon;

	return (
		<div className={cx(variant === "full" && "space-y-2", className)}>
			{label && variant === "full" && <Label>{label}</Label>}
			<Popover modal open={open} onOpenChange={setOpen}>
				<Popover.Anchor>
					<IconButton
						type="button"
						onClick={() => setOpen(true)}
						className="flex items-center justify-center h-8 w-8 p-0 data-[state=open]:bg-red-400"
						style={{ color: value.color }}
					>
						{SelectedIcon && <SelectedIcon className="text-base" />}
					</IconButton>
				</Popover.Anchor>
				<Popover.Portal>
					<Popover.Content
						className="w-[420px] p-0 z-10 origin-center"
						align="start"
						side="bottom"
						sideOffset={5}
						onAnimationEnd={handlePopoverAnimationEnd}
					>
						<Tabs
							defaultValue="icon"
							className="w-full"
							onValueChange={handlePopoverAnimationEnd}
						>
							<Tabs.List className="pt-4">
								<Tabs.Trigger
									value="icon"
									className="flex-1 data-[state=active]:border-b-muted-400 data-[state=active]:text-foreground"
								>
									Icon
								</Tabs.Trigger>
								<Tabs.Trigger
									value="color"
									className="flex-1 data-[state=active]:border-b-muted-400 data-[state=active]:text-foreground"
								>
									Color
								</Tabs.Trigger>
							</Tabs.List>

							<Tabs.Content value="icon" className="p-4 pt-2">
								<div className="space-y-3">
									<Input
										placeholder="Search icons..."
										value={search}
										onChange={(e) => setSearch(e.target.value)}
										className="w-full"
									/>
									<Separator />
									{iconsToRender.length === 0 ? (
										<div className="flex h-[320px] items-center justify-center text-sm text-foreground-muted">
											No icons found
										</div>
									) : (
										<div
											ref={parentRef}
											className="h-[320px] overflow-auto"
											style={{ contain: "strict" }}
										>
											<div
												style={{
													height: `${rowVirtualizer.getTotalSize()}px`,
													width: "100%",
													position: "relative",
												}}
											>
												{rowVirtualizer.getVirtualItems().map((virtualRow) => {
													const startIdx = virtualRow.index * COLUMNS;
													const rowIcons = iconsToRender.slice(
														startIdx,
														startIdx + COLUMNS,
													);

													return (
														<div
															key={virtualRow.key}
															style={{
																position: "absolute",
																top: 0,
																left: 0,
																width: "100%",
																height: `${virtualRow.size}px`,
																transform: `translateY(${virtualRow.start}px)`,
															}}
														>
															<div className="grid grid-cols-8 gap-1">
																{rowIcons.map(([name, Icon]) => {
																	const IconComponent = Icon as LucideIcon;
																	return (
																		<button
																			key={name}
																			type="button"
																			onClick={() => handleIconSelect(name)}
																			className={cx(
																				"flex h-10 w-10 items-center justify-center rounded-sm transition-all hover:bg-background-300/50",
																				value.icon === name &&
																					"bg-primary-500/10 ring-2 ring-primary-500",
																			)}
																			title={name}
																		>
																			<IconComponent
																				className="text-lg"
																				style={{ color: value.color }}
																			/>
																		</button>
																	);
																})}
															</div>
														</div>
													);
												})}
											</div>
										</div>
									)}
								</div>
							</Tabs.Content>

							<Tabs.Content value="color" className="p-4 pt-3">
								<div className="space-y-4">
									{/* Color Input */}
									<div className="space-y-2">
										<Label className="text-xs font-medium">Custom Color</Label>
										<div className="relative">
											<div className="absolute left-0 top-1/2 -translate-y-1/2 z-10">
												<button
													type="button"
													onClick={() =>
														document
															.getElementById("color-picker-input")
															?.click()
													}
													className="h-8 w-8 rounded border-2 border-white shadow-sm cursor-pointer transition-transform hover:scale-110"
													style={{ backgroundColor: value.color }}
													disabled={disabled}
													title="Pick a color"
												/>
												<input
													id="color-picker-input"
													type="color"
													value={value.color}
													onChange={(e) => handleColorChange(e.target.value)}
													className="sr-only"
													disabled={disabled}
												/>
											</div>
											<div className="pl-10">
												<Input
													type="text"
													value={colorInputValue}
													onChange={handleColorInputChange}
													className={cx(
														"pl-14 font-mono text-sm",
														!isColorValid &&
															"border-red-500 focus-visible:ring-red-500",
													)}
													placeholder="#000000"
													disabled={disabled}
												/>
											</div>
										</div>
										{!isColorValid && (
											<p className="text-xs text-red-500">
												Please enter a valid hex color (e.g. #3b82f6)
											</p>
										)}
									</div>

									<Separator />

									{/* Preset Colors */}
									<div className="space-y-3">
										<Label className="text-xs font-medium">Color Palette</Label>
										<div className="h-[258px] overflow-auto pr-2 space-y-2">
											{COLOR_GROUPS.map((group) => (
												<div key={group.name} className="space-y-1">
													<div className="text-xs text-foreground-muted px-1">
														{group.name}
													</div>
													<div className="flex gap-1.5">
														{group.colors.map((color) => (
															<button
																key={color}
																type="button"
																className={cx(
																	"h-8 w-full rounded transition-all hover:scale-105 border border-background-300/20",
																	value.color === color &&
																		"ring-2 ring-primary-500 scale-105 shadow-md",
																)}
																style={{ backgroundColor: color }}
																onClick={() => handleColorChange(color)}
																disabled={disabled}
																title={color}
															/>
														))}
													</div>
												</div>
											))}
										</div>
									</div>
								</div>
							</Tabs.Content>
						</Tabs>
					</Popover.Content>
				</Popover.Portal>
			</Popover>
		</div>
	);
}
