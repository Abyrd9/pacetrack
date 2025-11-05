import type { PropsWithChildren } from "react";
import { useEffect, useRef, useState } from "react";
import rough from "roughjs";
import { cx } from "~/utils/helpers/cx";
import { useTheme } from "~/utils/services/client-theme/ThemeProvider";

type HandDrawnBoxProps = PropsWithChildren<{
	className?: string;
	color?: string;
	stroke?: string;
	strokeWidth?: number;
	roughness?: number;
	bowing?: number;
}>;

function HandDrawnBox({
	className,
	color = "red",
	stroke,
	strokeWidth = 2,
	roughness = 1.5,
	bowing = 2,
	children,
}: HandDrawnBoxProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
	const [{ theme }] = useTheme();

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

	// Draw the box when dimensions or props change
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

		// Default stroke color based on theme
		const defaultStroke = theme === "dark" ? "#404040" : "#d4d4d4";

		// Build options object conditionally
		const options: {
			fill: string;
			fillStyle: string;
			fillWeight?: number;
			hachureGap?: number;
			roughness: number;
			bowing: number;
			stroke?: string;
			strokeWidth?: number;
		} = {
			fill: color,
			fillStyle: "hachure",
			fillWeight: 1,
			hachureGap: 4,
			roughness,
			bowing,
			stroke: stroke || defaultStroke,
			strokeWidth: stroke ? strokeWidth : 1,
		};

		rc.rectangle(
			padding,
			padding,
			canvas.width - padding * 2,
			canvas.height - padding * 2,
			options,
		);
	}, [color, stroke, strokeWidth, roughness, bowing, dimensions, theme]);

	return (
		<div ref={containerRef} className={cx("relative", className)}>
			<canvas
				ref={canvasRef}
				width={dimensions.width}
				height={dimensions.height}
				className="absolute inset-0 w-full h-full pointer-events-none"
			/>
			{children && (
				<div className="relative z-10 w-full h-full">{children}</div>
			)}
		</div>
	);
}

export { HandDrawnBox };
