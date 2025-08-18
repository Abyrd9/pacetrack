import { X } from "lucide-react";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Area, Point } from "react-easy-crop";
import Cropper from "react-easy-crop";
import { cx } from "~/utils/helpers/cx";
import { AspectRatio } from "./aspect-ratio";
import { Button } from "./button";
import { Dialog } from "./dialog";
import { IconButton } from "./icon-button";
import { Label } from "./label";

export const RATIOS = [
	"1:1",
	"16:9",
	"4:3",
	"3:2",
	"2:3",
	"5:4",
	"7:5",
	"21:9",
] as const;

type Ratio = (typeof RATIOS)[number];

export interface ImageUploaderProps {
	label?: string;
	value?: File | null;
	onChange?: (value: File | null) => void;
	className?: string;
	disabled?: boolean;
	ratio?: Ratio;
}

export function ImageUploader({
	label,
	value,
	onChange,
	className,
	disabled,
	ratio = "1:1",
}: ImageUploaderProps) {
	const buttonRef = useRef<HTMLButtonElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [showCrop, setShowCrop] = useState(false);
	const [tempImage, setTempImage] = useState<string | null>(null);
	const [originalFile, setOriginalFile] = useState<File | null>(null);
	const [isDialogFullyOpen, setIsDialogFullyOpen] = useState(false);

	// Cropper state
	const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
	const [zoom, setZoom] = useState(1);
	const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

	// Parse ratio string to number
	const parseRatio = (ratio: string) => {
		const [w, h] = ratio.split(":").map(Number);
		return w && h ? w / h : 1;
	};

	const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;
		setOriginalFile(file);
		setTempImage(URL.createObjectURL(file));
		setShowCrop(true);
		setCrop({ x: 0, y: 0 });
		setZoom(1);
	};

	const handleDrop = (e: React.DragEvent<HTMLButtonElement>) => {
		e.preventDefault();
		setIsDragging(false);
		if (disabled) return;
		const file = e.dataTransfer.files?.[0];
		if (file?.type?.startsWith("image/")) {
			setOriginalFile(file);
			setTempImage(URL.createObjectURL(file));
			setShowCrop(true);
			setCrop({ x: 0, y: 0 });
			setZoom(1);
		}
	};

	const handleDragEnter = (e: React.DragEvent<HTMLButtonElement>) => {
		e.preventDefault();
		if (disabled) return;
		setIsDragging(true);
	};

	const handleDragLeave = (e: React.DragEvent<HTMLButtonElement>) => {
		if (buttonRef.current?.contains(e.relatedTarget as Node)) return;
		e.preventDefault();
		setIsDragging(false);
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
		if (disabled) return;
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			inputRef.current?.click();
		}
	};

	const handleRemove = () => {
		onChange?.(null);
		if (inputRef.current) inputRef.current.value = "";
	};

	// Crop logic
	const onCropComplete = (_: Area, croppedPixels: Area) => {
		setCroppedAreaPixels(croppedPixels);
	};

	const handleCropConfirm = async () => {
		if (tempImage && croppedAreaPixels && originalFile) {
			const cropped = await getCroppedFile(
				tempImage,
				croppedAreaPixels,
				originalFile.name,
			);
			if (cropped) {
				onChange?.(cropped);
			}
			setShowCrop(false);
			setTempImage(null);
			setOriginalFile(null);
		}
	};

	// Utility to crop image and return a File
	async function getCroppedFile(
		imageSrc: string,
		crop: Area,
		fileName: string,
	): Promise<File | null> {
		return new Promise((resolve) => {
			const image = document.createElement("img");
			image.src = imageSrc;
			image.onload = () => {
				const canvas = document.createElement("canvas");
				canvas.width = crop.width;
				canvas.height = crop.height;
				const ctx = canvas.getContext("2d");
				if (!ctx) return resolve(null);
				ctx.drawImage(
					image,
					crop.x,
					crop.y,
					crop.width,
					crop.height,
					0,
					0,
					crop.width,
					crop.height,
				);
				canvas.toBlob((blob) => {
					if (blob) {
						resolve(new File([blob], fileName, { type: blob.type }));
					} else {
						resolve(null);
					}
				}, "image/png");
			};
		});
	}

	// Handler for animation end
	const handleDialogAnimationEnd = useCallback(
		(e: React.AnimationEvent<HTMLDivElement>) => {
			if (e.currentTarget.getAttribute("data-state") === "open") {
				setIsDialogFullyOpen(true);
			}
		},
		[],
	);

	// Reset when dialog closes
	useEffect(() => {
		if (!showCrop) setIsDialogFullyOpen(false);
	}, [showCrop]);

	return (
		<div className={cx("space-y-2", className)}>
			{label && <Label>{label}</Label>}
			<button
				ref={buttonRef}
				type="button"
				className={cx(
					"relative flex flex-col items-center justify-center border-2 border-dashed rounded-md p-4 cursor-pointer transition hover:border-primary-500 bg-background-100/80 w-full",
					disabled && "opacity-50 pointer-events-none",
					isDragging && "border-sky-200 bg-sky-200/10",
				)}
				onKeyDown={handleKeyDown}
				onClick={() => !disabled && inputRef.current?.click()}
				onDrop={handleDrop}
				onDragOver={(e) => e.preventDefault()}
				onDragEnter={handleDragEnter}
				onDragLeave={handleDragLeave}
				disabled={disabled}
			>
				{value ? (
					<div className="relative w-full">
						<AspectRatio
							ratio={parseRatio(ratio)}
							className="overflow-hidden w-full"
						>
							<img
								src={URL.createObjectURL(value)}
								alt="Preview"
								className="w-full h-full object-cover rounded shadow"
							/>
							<IconButton
								type="button"
								className="absolute top-2 right-2 z-10 bg-white/80 hover:bg-white"
								size="sm"
								aria-label="Remove image"
								onClick={(e) => {
									e.stopPropagation();
									handleRemove();
								}}
							>
								<X className="w-4 h-4" />
							</IconButton>
						</AspectRatio>
					</div>
				) : (
					<div className="flex flex-col items-center space-y-2">
						<span className="text-sm text-gray-500">
							Drag & drop or click to select an image
						</span>
						<Button
							type="button"
							variant="outline"
							size="sm"
							onClick={(e) => {
								e.stopPropagation();
								inputRef.current?.click();
							}}
							disabled={disabled}
						>
							Choose Image
						</Button>
					</div>
				)}
				<input
					ref={inputRef}
					type="file"
					accept="image/*"
					className="hidden"
					onChange={handleFileChange}
					disabled={disabled}
				/>
			</button>
			{/* Cropper Dialog */}
			<Dialog open={showCrop} onOpenChange={setShowCrop}>
				<Dialog.Portal>
					<Dialog.Overlay>
						<Dialog.Content
							className="max-w-lg w-full"
							onAnimationEnd={handleDialogAnimationEnd}
						>
							<AspectRatio ratio={parseRatio(ratio)} className="w-full">
								<div className="relative w-full h-full">
									{tempImage && isDialogFullyOpen && (
										<Cropper
											image={tempImage}
											crop={crop}
											zoom={zoom}
											aspect={parseRatio(ratio)}
											onCropChange={setCrop}
											onZoomChange={setZoom}
											onCropComplete={onCropComplete}
											restrictPosition={true}
											showGrid={false}
										/>
									)}
								</div>
							</AspectRatio>
							<div className="flex flex-col gap-2 mt-4">
								<input
									type="range"
									min={1}
									max={3}
									step={0.01}
									value={zoom}
									onChange={(e) => setZoom(Number(e.target.value))}
									className="w-full"
								/>
								<div className="flex gap-2 justify-end">
									<Button variant="outline" onClick={() => setShowCrop(false)}>
										Cancel
									</Button>
									<Button onClick={handleCropConfirm}>Save</Button>
								</div>
							</div>
						</Dialog.Content>
					</Dialog.Overlay>
				</Dialog.Portal>
			</Dialog>
		</div>
	);
}
