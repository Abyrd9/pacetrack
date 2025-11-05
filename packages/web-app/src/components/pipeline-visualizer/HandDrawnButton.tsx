import { type PropsWithChildren, useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { cx } from "~/utils/helpers/cx";

type HandDrawnButtonProps = PropsWithChildren<{
	onClick?: () => void;
	className?: string;
	color?: string;
	hoverColor?: string;
	roughness?: number;
	bowing?: number;
	disabled?: boolean;
	type?: "button" | "submit" | "reset";
}>;

function HandDrawnButton({
	onClick,
	className,
	color = "#3b82f6",
	hoverColor,
	roughness = 1.5,
	bowing = 2,
	disabled = false,
	type = "button",
	children,
}: HandDrawnButtonProps) {
	const containerRef = useRef<HTMLButtonElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [isHovered, setIsHovered] = useState(false);
	const [isPressed, setIsPressed] = useState(false);

	const currentColor = isPressed
		? adjustColor(hoverColor || color, -20) // Darker when pressed
		: isHovered
			? hoverColor || adjustColor(color, 10) // Lighter when hovered
			: color;

	// Observe container size changes
	useEffect(() => {
		const container = containerRef.current;
		if (!container) return;

		const updateDimensions = () => {
			const rect = container.getBoundingClientRect();
			setDimensions({
				width: rect.width,
				height: rect.height,
			});
		};

		// Initial dimensions
		updateDimensions();

		// Watch for resize
		const resizeObserver = new ResizeObserver(updateDimensions);
		resizeObserver.observe(container);

		return () => {
			resizeObserver.disconnect();
		};
	}, []);

	// Draw the button when dimensions or props change
	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas || dimensions.width === 0 || dimensions.height === 0) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		const rc = rough.canvas(canvas);

		// Add padding to prevent edges from being clipped
		const padding = 8;
		rc.rectangle(
			padding,
			padding,
			canvas.width - padding * 2,
			canvas.height - padding * 2,
			{
				fill: currentColor,
				fillStyle: "hachure",
				roughness: isPressed ? roughness * 0.8 : roughness,
				bowing: isPressed ? bowing * 0.8 : bowing,
				fillWeight: isPressed ? 2 : 1,
			},
		);
	}, [currentColor, roughness, bowing, dimensions, isPressed]);

	return (
		<button
			ref={containerRef}
			type={type}
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => {
				setIsHovered(false);
				setIsPressed(false);
			}}
			onMouseDown={() => setIsPressed(true)}
			onMouseUp={() => setIsPressed(false)}
			disabled={disabled}
			className={cx(
				"relative transition-transform",
				!disabled && "cursor-pointer hover:scale-[1.02] active:scale-[0.98]",
				disabled && "opacity-50 cursor-not-allowed",
				className,
			)}
		>
			<canvas
				ref={canvasRef}
				width={dimensions.width}
				height={dimensions.height}
				className="absolute inset-0 w-full h-full pointer-events-none"
			/>
			<div className="relative z-10 px-4 py-2 font-handwriting text-foreground">
				{children}
			</div>
		</button>
	);
}

// Helper to adjust color brightness
function adjustColor(color: string, amount: number): string {
	// Parse hex color
	const hex = color.replace("#", "");
	const r = Math.max(
		0,
		Math.min(255, parseInt(hex.substring(0, 2), 16) + amount),
	);
	const g = Math.max(
		0,
		Math.min(255, parseInt(hex.substring(2, 4), 16) + amount),
	);
	const b = Math.max(
		0,
		Math.min(255, parseInt(hex.substring(4, 6), 16) + amount),
	);

	return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

export { HandDrawnButton };

