import { Minus, Plus } from "lucide-react";
import type { ComponentPropsWithRef } from "react";
import { cx } from "~/utils/helpers/cx";

type NumberInputProps = Omit<
	ComponentPropsWithRef<"input">,
	"type" | "onChange"
> & {
	value: number | undefined;
	onChange: (value: number | undefined) => void;
	min?: number;
	max?: number;
	step?: number;
	suffix?: string;
	placeholder?: string;
	className?: string;
	disabled?: boolean;
};

export function NumberInput({
	value,
	onChange,
	min = 0,
	max,
	step = 1,
	suffix,
	placeholder,
	className,
	disabled,
	...props
}: NumberInputProps) {
	const handleIncrement = () => {
		const currentValue = value ?? min ?? 0;
		const newValue = currentValue + step;
		if (max === undefined || newValue <= max) {
			onChange(newValue);
		}
	};

	const handleDecrement = () => {
		const currentValue = value ?? min ?? 0;
		const newValue = currentValue - step;
		if (min === undefined || newValue >= min) {
			onChange(newValue);
		}
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if (val === "") {
			onChange(undefined);
			return;
		}

		const numValue = Number(val);
		if (!Number.isNaN(numValue)) {
			// Check bounds
			if (min !== undefined && numValue < min) return;
			if (max !== undefined && numValue > max) return;
			onChange(numValue);
		}
	};

	const isAtMin = min !== undefined && (value ?? 0) <= min;
	const isAtMax = max !== undefined && value !== undefined && value >= max;

	// Calculate approximate width based on value
	const valueLength = value?.toString().length ?? placeholder?.length ?? 1;
	const inputWidth = Math.max(5, Math.min(valueLength + 3, 14)); // Min 5 chars, max 14 chars

	return (
		<div
			className={cx(
				"inline-flex items-center border border-background-300 rounded-sm bg-background overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all",
				disabled && "opacity-50 cursor-not-allowed",
				className,
			)}
		>
			{/* Decrement Button */}
			<button
				type="button"
				onClick={handleDecrement}
				disabled={disabled || isAtMin}
				className="h-10 px-3 hover:bg-background-100 active:bg-background-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-r border-background-300 shrink-0"
				aria-label="Decrease"
			>
				<Minus className="h-4 w-4" />
			</button>

			{/* Input */}
			<input
				{...props}
				type="number"
				value={value ?? ""}
				onChange={handleInputChange}
				placeholder={placeholder}
				disabled={disabled}
				min={min}
				max={max}
				step={step}
				style={{ width: `${inputWidth}ch` }}
				className="h-10 px-3 bg-transparent border-0 outline-none text-center font-medium tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none min-w-[5ch] max-w-[14ch]"
			/>

			{/* Suffix */}
			{suffix && (
				<span className="px-3 text-sm text-foreground-muted border-l border-background-300 shrink-0">
					{suffix}
				</span>
			)}

			{/* Increment Button */}
			<button
				type="button"
				onClick={handleIncrement}
				disabled={disabled || isAtMax}
				className="h-10 px-3 hover:bg-background-100 active:bg-background-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-l border-background-300 shrink-0"
				aria-label="Increase"
			>
				<Plus className="h-4 w-4" />
			</button>
		</div>
	);
}

