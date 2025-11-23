import type { useZodForm } from "@abyrd9/zod-form-data";
import type { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import { ArrowDownIcon, ArrowUpIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { useEffect } from "react";
import { cx } from "~/utils/helpers/cx";
import { Button } from "../primitives/button";
import { Card } from "../primitives/card";
import { ColorPicker } from "../primitives/color-picker";
import { IconPicker } from "../primitives/icon-picker";
import { Input, InputError } from "../primitives/input";
import { Label } from "../primitives/label";
import { NumberInput } from "../primitives/number-input";
import { Textarea } from "../primitives/textarea";

type UseZodFormFields = ReturnType<
	typeof useZodForm<typeof PIPELINE_TEMPLATE_CREATE_ROUTE.request>
>["fields"];

type UseZodFormFieldArrayHelpers = ReturnType<
	typeof useZodForm<typeof PIPELINE_TEMPLATE_CREATE_ROUTE.request>
>["getFieldArrayHelpers"];

export function StepsStep({
	fields,
	getFieldArrayHelpers,
	activeStepIndex,
	setActiveStepIndex,
	pipelineStepConfigCards,
	setPipelineStepConfigCards,
}: {
	fields: UseZodFormFields;
	getFieldArrayHelpers: UseZodFormFieldArrayHelpers;
	activeStepIndex: number | null;
	setActiveStepIndex: (index: number | null) => void;
	pipelineStepConfigCards: HTMLDivElement[];
	setPipelineStepConfigCards: React.Dispatch<
		React.SetStateAction<HTMLDivElement[]>
	>;
}) {
	const stepArrayHelpers = getFieldArrayHelpers("step_templates");

	// Use IntersectionObserver to detect which step card is in view
	useEffect(() => {
		const observer = new IntersectionObserver(() => {
			// Observer callback - can be used to detect which card is in view
		});

		// Observe all step config cards
		pipelineStepConfigCards.forEach((card) => {
			if (card) {
				observer.observe(card);
			}
		});

		return () => {
			observer.disconnect();
		};
	}, [pipelineStepConfigCards]);

	return (
		<div>
			<h2 className="text-2xl font-semibold mb-2">Configure Steps</h2>
			<p className="text-sm text-muted-foreground mb-6">
				Define the stages items will move through in this pipeline.
			</p>

			<div className="space-y-4">
				{fields.step_templates.map((step, idx) => {
					const isActive = activeStepIndex === idx;
					return (
						<div
							key={`step-${
								// biome-ignore lint/suspicious/noArrayIndexKey: This is fine
								idx
							}`}
							data-step-index={idx}
							data-step-config-card="true"
							ref={(el) => {
								if (el) {
									setPipelineStepConfigCards((prev: HTMLDivElement[]) => {
										const exists = prev.find((card) => card === el);
										return exists ? prev : [...prev, el];
									});
								}
							}}
						>
							<Card
								className={cx(
									"transition-all",
									isActive &&
										"ring-2 ring-blue-500 ring-offset-2 ring-offset-background",
								)}
							>
								<div className="flex items-center justify-between mb-4">
									<div className="font-medium">Step {idx + 1}</div>
									<div className="flex items-center gap-2">
										{idx > 0 && (
											<Button
												size="xs"
												variant="outline"
												type="button"
												onClick={() => stepArrayHelpers.move?.(idx, idx - 1)}
											>
												<ArrowUpIcon className="h-4 w-4" />
											</Button>
										)}
										{idx < fields.step_templates.length - 1 && (
											<Button
												size="xs"
												variant="outline"
												type="button"
												onClick={() => stepArrayHelpers.move?.(idx, idx + 1)}
											>
												<ArrowDownIcon className="h-4 w-4" />
											</Button>
										)}
										{fields.step_templates.length > 1 && (
											<Button
												size="xs"
												variant="outline"
												type="button"
												onClick={() => stepArrayHelpers.remove(idx)}
											>
												<Trash2Icon className="h-4 w-4" />
											</Button>
										)}
									</div>
								</div>

								<div className="space-y-4">
									<div>
										<Label htmlFor={step.name.name}>
											Step Name & Icon{" "}
											<span className="text-destructive">*</span>
										</Label>
										<div className="flex items-center gap-2 w-full">
											<IconPicker
												variant="button-only"
												value={{
													icon: step.icon.value || "CircleDot",
													color: step.color.value || "#3b82f6",
												}}
												onChange={(value) => {
													step.icon.onChange(value.icon);
													step.color.onChange(value.color);
												}}
											/>
											<div className="w-full">
												<Input
													id={step.name.name}
													name={step.name.name}
													value={step.name.value}
													onChange={(e) => step.name.onChange(e.target.value)}
													placeholder="e.g., Qualify"
													className="w-full max-w-md"
													required
												/>
												{step.name.error && (
													<InputError>{step.name.error}</InputError>
												)}
												{step.icon.error && (
													<InputError>{step.icon.error}</InputError>
												)}
												{step.color.error && (
													<InputError>{step.color.error}</InputError>
												)}
											</div>
										</div>
									</div>

									<div>
										<Label htmlFor={step.description.name}>Description</Label>
										<Textarea
											id={step.description.name}
											name={step.description.name}
											value={step.description.value}
											onChange={(e) =>
												step.description.onChange(e.target.value)
											}
											placeholder="Describe what this step is used for..."
											rows={3}
										/>
										{step.description.error && (
											<InputError>{step.description.error}</InputError>
										)}
									</div>

									<div className="flex gap-6">
										<div>
											<Label htmlFor={step.target_duration_days.name}>
												Target Duration
											</Label>
											<NumberInput
												id={step.target_duration_days.name}
												name={step.target_duration_days.name}
												value={step.target_duration_days.value}
												onChange={(value) =>
													step.target_duration_days.onChange(value)
												}
												suffix="days"
												placeholder="0"
											/>
											{step.target_duration_days.error && (
												<InputError>
													{step.target_duration_days.error}
												</InputError>
											)}
										</div>

										<div>
											<Label htmlFor={step.color.name}>Step Color</Label>
											<ColorPicker
												variant="button-only"
												value={step.color.value}
												onChange={(color) => step.color.onChange(color)}
											/>
											{step.color.error && (
												<InputError>{step.color.error}</InputError>
											)}
										</div>
									</div>
								</div>
							</Card>
						</div>
					);
				})}

				<Button
					size="sm"
					variant="outline"
					type="button"
					onClick={() => {
						stepArrayHelpers.add({
							name: "",
							description: "",
							order: fields.step_templates.length,
							target_duration_days: 0,
							color: "#3b82f6",
							icon: "CircleDot",
						});
					}}
					className="w-full"
				>
					<PlusIcon className="h-4 w-4 mr-2" />
					Add Step
				</Button>
			</div>
		</div>
	);
}
