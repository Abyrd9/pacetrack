import { useZodForm } from "@abyrd9/zod-form-data";
import { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import type { FieldsDefinition } from "@pacetrack/schema/src/config-schemas/fields";
import { FieldTypeEnum } from "@pacetrack/schema/src/config-schemas/fields";
import type { ItemTemplate } from "@pacetrack/schema/src/db-schema/item-template";
import type { PipelineTemplate } from "@pacetrack/schema/src/db-schema/pipeline-template";
import type { StepTemplate } from "@pacetrack/schema/src/db-schema/step-template";
import {
	ArrowLeftRightIcon,
	ArrowRightLeftIcon,
	ChevronLeft,
	ChevronRight,
	ChevronRightIcon,
	PlusIcon,
	Trash2Icon,
} from "lucide-react";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button } from "~/components/primitives/button";
import { Card } from "~/components/primitives/card";
import { ColorPicker } from "~/components/primitives/color-picker";
import { IconButton } from "~/components/primitives/icon-button";
import { IconPicker } from "~/components/primitives/icon-picker";
import { Input, InputError } from "~/components/primitives/input";
import { Label } from "~/components/primitives/label";
import { NumberInput } from "~/components/primitives/number-input";
import { Select } from "~/components/primitives/select";
import { Switch } from "~/components/primitives/switch";
import { Textarea } from "~/components/primitives/textarea";
import { Tooltip } from "~/components/primitives/tooltip";
import { cx } from "~/utils/helpers/cx";
import { HandDrawnBox } from "../pipeline-visualizer/HandDrawnBox";
import { ItemFields } from "./PipelineTemplateForm.ItemFields";

type PipelineTemplateFormProps = {
	mode: "create" | "edit";
	initialData?: {
		pipeline: PipelineTemplate;
		step_templates: StepTemplate[];
		item_template: ItemTemplate;
	};
	onSubmit: (data: FormData) => Promise<void> | void;
	isPending?: boolean;
};

export function PipelineTemplateForm({
	mode,
	initialData,
	onSubmit,
	isPending = false,
}: PipelineTemplateFormProps) {
	// Always use the create schema for the form UI (includes step_templates)
	// Parent component handles calling the correct API endpoint
	const { fields, getFieldArrayHelpers } = useZodForm({
		schema: PIPELINE_TEMPLATE_CREATE_ROUTE.request,
		defaultValues:
			mode === "edit" && initialData
				? {
						name: initialData.pipeline.name,
						description: initialData.pipeline.description ?? "",
						icon: initialData.pipeline.icon ?? "Sparkles",
						iconColor: initialData.pipeline.iconColor ?? "#3b82f6",
						item_template: {
							name: initialData.item_template.name,
							description: initialData.item_template.description ?? "",
							initial_step_index: Math.max(
								0,
								initialData.step_templates.findIndex(
									(step) =>
										step.id === initialData.item_template.initial_step_id,
								),
							),
							fields_definition: (
								initialData.item_template as {
									fields_definition?: FieldsDefinition;
								}
							).fields_definition ?? {
								version: 1,
								fields: [],
							},
						},
						step_templates: initialData.step_templates.map((step) => ({
							name: step.name,
							description: step.description ?? "",
							order: step.order,
							target_duration_days: step.target_duration_days ?? undefined,
							color: step.color ?? "#3b82f6",
							icon: step.icon ?? "CircleDot",
						})),
					}
				: {
						icon: "Sparkles",
						iconColor: "#3b82f6",
						step_templates: [
							{
								name: "",
								description: "",
								order: 0,
								target_duration_days: undefined,
								color: "#3b82f6",
								icon: "CircleDot",
							},
						],
						item_template: {
							name: "",
							description: "",
							initial_step_index: 0,
							fields_definition: {
								version: 1,
								fields: [],
							},
						},
					},
	});

	const [activeEditableStepIndex, setActiveEditableStepIndex] = useState(0);
	const activeEditableStep = fields.step_templates[activeEditableStepIndex];

	const stepArrayHelpers = getFieldArrayHelpers("step_templates");
	const itemFieldsArrayHelpers = getFieldArrayHelpers(
		"item_template.fields_definition.fields",
	);

	const handleAddStep = (index?: number) => {
		stepArrayHelpers.add(
			{
				name: "",
				description: "",
				order: fields.step_templates.length,
				target_duration_days: 0,
				color: "#3b82f6",
				icon: "CircleDot",
			},
			index,
		);
		setActiveEditableStepIndex(
			typeof index === "number" ? index : fields.step_templates.length,
		);
	};

	const handleDeleteStep = () => {
		if (fields.step_templates.length === 1) {
			return;
		}
		stepArrayHelpers.remove(activeEditableStepIndex);
		if (activeEditableStepIndex >= fields.step_templates.length - 1) {
			setActiveEditableStepIndex(Math.max(0, fields.step_templates.length - 2));
		}
	};

	const pipelineStepRef = useRef<(HTMLButtonElement | null)[]>([]);
	useEffect(() => {
		// Scroll the pipeline visualization step into view
		pipelineStepRef.current[activeEditableStepIndex]?.scrollIntoView({
			behavior: "smooth",
			block: "nearest",
			inline: "center",
		});
	}, [activeEditableStepIndex]);

	const getVisibleSteps = () => {
		const totalSteps = fields.step_templates.length;

		if (totalSteps <= 5) {
			return fields.step_templates.map((_step, idx) => idx);
		}

		const visibleIndices: (number | "ellipsis-start" | "ellipsis-end")[] = [];

		visibleIndices.push(0);

		const middleStart = Math.max(
			1,
			Math.min(activeEditableStepIndex - 1, totalSteps - 4),
		);
		const middleEnd = Math.min(totalSteps - 2, middleStart + 2);

		if (middleStart > 1) {
			visibleIndices.push("ellipsis-start");
		}

		for (let i = middleStart; i <= middleEnd; i++) {
			visibleIndices.push(i);
		}

		if (middleEnd < totalSteps - 2) {
			visibleIndices.push("ellipsis-end");
		}

		visibleIndices.push(totalSteps - 1);

		return visibleIndices;
	};

	const visibleSteps = getVisibleSteps();

	const stepHasError = (stepIndex: number) => {
		const step = fields.step_templates[stepIndex];
		if (!step) return false;
		return !!(
			step.name.error ||
			step.description.error ||
			step.icon.error ||
			step.color.error ||
			step.target_duration_days.error
		);
	};

	const hiddenStepsHaveErrors = (side: "start" | "end") => {
		const visibleIndices = visibleSteps.filter(
			(item) => typeof item === "number",
		) as number[];

		if (side === "start") {
			const firstVisible = visibleIndices[1] || 0;
			for (let i = 1; i < firstVisible; i++) {
				if (stepHasError(i)) return true;
			}
		} else {
			const lastVisible =
				visibleIndices[visibleIndices.length - 2] ||
				fields.step_templates.length - 1;
			for (let i = lastVisible + 1; i < fields.step_templates.length - 1; i++) {
				if (stepHasError(i)) return true;
			}
		}
		return false;
	};

	const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		await onSubmit(formData);
	};

	return (
		<form onSubmit={handleFormSubmit} className="space-y-4">
			{/* Template Details */}
			<div className="max-w-4xl">
				<h2 className="text-xl font-semibold mb-4">Template Details</h2>
				<Card>
					<div className="space-y-4">
						<div>
							<Label htmlFor={fields.name.name}>Template Name & Icon</Label>
							<div className="flex items-center gap-2 w-full">
								<IconPicker
									variant="button-only"
									value={{
										icon: fields.icon.value || "Sparkles",
										color: fields.iconColor.value || "#3b82f6",
									}}
									onChange={(value) => {
										fields.icon.onChange(value.icon);
										fields.iconColor.onChange(value.color);
									}}
								/>
								<div className="w-full">
									<Input
										id={fields.name.name}
										name={fields.name.name}
										value={fields.name.value}
										onChange={(e) => fields.name.onChange(e.target.value)}
										placeholder="e.g., Sales Pipeline"
										className="w-full max-w-md"
									/>
									{fields.name.error && (
										<InputError>{fields.name.error}</InputError>
									)}
									{fields.icon.error && (
										<InputError>{fields.icon.error}</InputError>
									)}
								</div>
							</div>
						</div>

						<div>
							<Label htmlFor={fields.description.name}>Description</Label>
							<Textarea
								id={fields.description.name}
								name={fields.description.name}
								value={fields.description.value}
								onChange={(e) => fields.description.onChange(e.target.value)}
								placeholder="Describe what this pipeline is used for..."
								rows={3}
							/>
							{fields.description.error && (
								<InputError>{fields.description.error}</InputError>
							)}
						</div>
					</div>
				</Card>
			</div>

			{/* Item Template Configuration */}
			<div className="max-w-4xl">
				<h2 className="text-xl font-semibold mb-4">Item Template</h2>
				<Card>
					<p className="text-sm text-foreground-muted mb-4">
						Configure what type of items will move through this pipeline (e.g.,
						"Deal", "Lead", "Project").
					</p>
					<div className="space-y-4">
						<div>
							<Label htmlFor={fields.item_template.name.name}>
								Item Name (Singular)
							</Label>
							<Input
								id={fields.item_template.name.name}
								name={fields.item_template.name.name}
								value={fields.item_template.name.value}
								onChange={(e) =>
									fields.item_template.name.onChange(e.target.value)
								}
								placeholder="e.g., Deal, Lead, Project"
								className="w-full max-w-md"
							/>
							{fields.item_template.name.error && (
								<InputError>{fields.item_template.name.error}</InputError>
							)}
						</div>

						<div>
							<Label htmlFor={fields.item_template.description.name}>
								Item Description
							</Label>
							<Textarea
								id={fields.item_template.description.name}
								name={fields.item_template.description.name}
								value={fields.item_template.description.value}
								onChange={(e) =>
									fields.item_template.description.onChange(e.target.value)
								}
								placeholder="Describe what this item represents..."
								rows={2}
							/>
							{fields.item_template.description.error && (
								<InputError>
									{fields.item_template.description.error}
								</InputError>
							)}
						</div>

						<div>
							<Label htmlFor={fields.item_template.initial_step_index.name}>
								Starting Step
							</Label>
							<p className="text-xs text-foreground-muted mb-2">
								New items will start at this step in the pipeline
							</p>
							<Select
								value={fields.item_template.initial_step_index.value?.toString()}
								onValueChange={(value: string) =>
									fields.item_template.initial_step_index.onChange(
										Number(value),
									)
								}
							>
								<Select.Trigger className="w-full max-w-sm">
									<Select.Value placeholder="Select starting step">
										{fields.step_templates[
											fields.item_template.initial_step_index.value
										]?.name.value || "Select starting step"}
									</Select.Value>
									<Select.Icon />
								</Select.Trigger>
								<Select.Portal>
									<Select.Content>
										<Select.ScrollUpButton />
										<Select.Viewport>
											{fields.step_templates.map((step, idx) => (
												<Select.Item
													key={`initial-step-${step.name.name}-${idx}`}
													value={idx.toString()}
													className="flex items-center justify-between gap-2"
												>
													<Select.ItemText>
														{step.name.value || `Step ${idx + 1}`}
													</Select.ItemText>
													<Select.ItemIndicator />
												</Select.Item>
											))}
										</Select.Viewport>
										<Select.ScrollDownButton />
									</Select.Content>
								</Select.Portal>
							</Select>
							<input
								type="hidden"
								name={fields.item_template.initial_step_index.name}
								value={fields.item_template.initial_step_index.value}
							/>
							{fields.item_template.initial_step_index.error && (
								<InputError>
									{fields.item_template.initial_step_index.error}
								</InputError>
							)}
						</div>
					</div>
				</Card>
			</div>

			{/* Item Fields Builder */}
			<ItemFields
				field={fields.item_template.fields_definition.fields}
				fieldArrayHelpers={getFieldArrayHelpers}
			/>

			{/* Pipeline Visualization */}
			<Tooltip.Provider>
				<div>
					<h2 className="text-xl font-semibold mb-4">Pipeline Preview</h2>
					<span
						className={cx("font-handwriting text-muted-500 pl-3", {
							"text-foreground": !!fields.name.value,
						})}
					>
						{fields.name.value
							? fields.name.value
							: "N/A (No Pipeline Name Set)"}
					</span>

					<div className="overflow-x-auto">
						<div className="inline-flex flex-col min-w-full">
							<HandDrawnBox
								className="w-full h-16"
								color="#fbbf24"
								roughness={0.75}
								bowing={1}
							/>

							<div className="flex">
								{fields.step_templates.map((step, idx) => {
									// Calculate width based on duration: 192px base + 60px per day
									const baseWidth = 184; // min-w-48
									const widthPerDay = 60;
									const duration = step.target_duration_days.value || 0;
									const calculatedWidth = baseWidth + duration * widthPerDay;

									return (
										<Tooltip key={`step-${step.name.name}-${idx}`}>
											<Tooltip.Trigger asChild>
												<button
													ref={(el) => {
														pipelineStepRef.current[idx] = el;
													}}
													type="button"
													style={{ width: `${calculatedWidth}px` }}
													className="shrink-0 cursor-pointer"
													onClick={() => setActiveEditableStepIndex(idx)}
												>
													<div className="w-full">
														<div
															className="text-sm font-handwriting text-foreground dark:text-muted-400 px-2 truncate text-left"
															style={{ maxWidth: `${calculatedWidth}px` }}
														>
															{`${idx + 1}:  ${step.name.value}` ||
																`Step ${idx + 1}`}
														</div>
														<HandDrawnBox
															className="w-full h-24"
															color={step.color.value}
															stroke={
																activeEditableStepIndex === idx
																	? "#3b82f6"
																	: stepHasError(idx)
																		? "#ef4444"
																		: undefined
															}
															strokeWidth={
																stepHasError(idx) ||
																activeEditableStepIndex === idx
																	? 3
																	: undefined
															}
															roughness={0.75}
															bowing={1}
														/>
													</div>
												</button>
											</Tooltip.Trigger>
											<Tooltip.Portal>
												<Tooltip.Content
													side="top"
													align="center"
													className="px-3 py-2 text-sm max-w-xs"
												>
													<div className="space-y-1">
														<div className="font-medium">
															{step.name.value || `Step ${idx + 1}`}
														</div>
														{step.target_duration_days.value && (
															<div className="text-xs text-foreground-muted">
																Duration: {step.target_duration_days.value} days
															</div>
														)}
													</div>
												</Tooltip.Content>
											</Tooltip.Portal>
										</Tooltip>
									);
								})}
							</div>
						</div>
					</div>
				</div>
			</Tooltip.Provider>

			<Button className="w-full" type="submit" disabled={isPending}>
				{isPending
					? mode === "create"
						? "Creating..."
						: "Saving..."
					: mode === "create"
						? "Create Pipeline Template"
						: "Save Changes"}
			</Button>

			{/* Step Details */}
			<div>
				<h2 className="text-xl font-semibold mb-4">Step Details</h2>

				<div className="flex items-center gap-2 justify-between mb-2">
					<IconButton
						size="xs"
						type="button"
						onClick={() =>
							setActiveEditableStepIndex(
								Math.max(0, activeEditableStepIndex - 1),
							)
						}
						disabled={activeEditableStepIndex === 0}
					>
						<ChevronLeft className="h-4 w-4" />
					</IconButton>

					<div className="flex items-center gap-1.5">
						{visibleSteps.map(
							(item: number | "ellipsis-start" | "ellipsis-end") => {
								if (item === "ellipsis-start" || item === "ellipsis-end") {
									const side = item === "ellipsis-start" ? "start" : "end";
									const hasErrors = hiddenStepsHaveErrors(side);

									return (
										<span
											key={`ellipsis-${item}`}
											className={cx(
												"flex h-9 items-center justify-center text-sm translate-y-1.5 px-2",
												hasErrors
													? "text-red-500 font-bold"
													: "text-foreground-muted",
											)}
										>
											...
										</span>
									);
								}

								const idx = item as number;
								const step = fields.step_templates[idx];
								const hasError = stepHasError(idx);

								return (
									<IconButton
										key={`step-nav-${step.name.name}-${idx}`}
										type="button"
										size="sm"
										className={cx("shrink-0", {
											"border border-blue-500!":
												activeEditableStepIndex === idx,
											"ring-2 ring-red-500!":
												hasError && activeEditableStepIndex !== idx,
										})}
										onClick={() => setActiveEditableStepIndex(idx)}
									>
										{idx + 1}
									</IconButton>
								);
							},
						)}
					</div>

					<IconButton
						size="xs"
						type="button"
						onClick={() =>
							setActiveEditableStepIndex(
								Math.min(
									fields.step_templates.length - 1,
									activeEditableStepIndex + 1,
								),
							)
						}
						disabled={
							activeEditableStepIndex === fields.step_templates.length - 1
						}
					>
						<ChevronRight className="h-4 w-4" />
					</IconButton>
				</div>

				<Card>
					<div className="flex items-center justify-between mb-3">
						<div className="flex items-center gap-2">
							<Button
								size="xs"
								type="button"
								className="flex items-center gap-1 px-1 py-1.5"
								onClick={() => handleAddStep(activeEditableStepIndex)}
							>
								<ChevronLeft className="text-xs" />
								<PlusIcon className="text-sm" />
							</Button>
							<Button
								size="xs"
								type="button"
								className="flex items-center gap-1 px-1 py-1.5"
								disabled={
									fields.step_templates.length === 1 ||
									activeEditableStepIndex === 0
								}
								onClick={() => {
									stepArrayHelpers.move(
										activeEditableStepIndex,
										activeEditableStepIndex - 1,
									);
									setActiveEditableStepIndex(activeEditableStepIndex - 1);
								}}
							>
								<ChevronLeft className="text-xs" />
								<ArrowLeftRightIcon className="text-sm" />
							</Button>
						</div>

						<div className="flex items-center gap-2">
							<Button
								size="xs"
								type="button"
								onClick={handleDeleteStep}
								disabled={fields.step_templates.length === 1}
							>
								<Trash2Icon className="text-sm" />
							</Button>
							<Button
								size="xs"
								type="button"
								className="flex items-center gap-1 px-1 py-1.5"
								disabled={
									fields.step_templates.length === 1 ||
									activeEditableStepIndex === fields.step_templates.length - 1
								}
								onClick={() => {
									stepArrayHelpers.move(
										activeEditableStepIndex,
										activeEditableStepIndex + 1,
									);
									setActiveEditableStepIndex(activeEditableStepIndex + 1);
								}}
							>
								<ArrowRightLeftIcon className="text-sm" />
								<ChevronRightIcon className="text-xs" />
							</Button>
							<Button
								size="xs"
								type="button"
								className="flex items-center gap-1 px-1 py-1.5"
								onClick={() => {
									if (
										activeEditableStepIndex ===
										fields.step_templates.length - 1
									) {
										handleAddStep();
									} else {
										handleAddStep(activeEditableStepIndex + 1);
									}
								}}
							>
								<PlusIcon className="text-sm" />
								<ChevronRightIcon className="text-xs" />
							</Button>
						</div>
					</div>

					<div className="space-y-4">
						<div>
							<Label htmlFor={activeEditableStep.name.name}>
								Step Name & Icon
							</Label>
							<div className="flex items-center gap-2 w-full">
								<IconPicker
									variant="button-only"
									value={{
										icon: activeEditableStep.icon.value || "CircleDot",
										color: activeEditableStep.color.value || "#3b82f6",
									}}
									onChange={(value) => {
										activeEditableStep.icon.onChange(value.icon);
										activeEditableStep.color.onChange(value.color);
									}}
								/>
								<div className="w-full">
									<Input
										id={activeEditableStep.name.name}
										name={activeEditableStep.name.name}
										value={activeEditableStep.name.value}
										onChange={(e) =>
											activeEditableStep.name.onChange(e.target.value)
										}
										placeholder="e.g., Qualify"
										className="w-full max-w-md"
									/>
									{activeEditableStep.name.error && (
										<InputError>{activeEditableStep.name.error}</InputError>
									)}
									{activeEditableStep.icon.error && (
										<InputError>{activeEditableStep.icon.error}</InputError>
									)}
									{activeEditableStep.color.error && (
										<InputError>{activeEditableStep.color.error}</InputError>
									)}
								</div>
							</div>
						</div>

						<div className="max-w-4xl">
							<Label htmlFor={activeEditableStep.description.name}>
								Description
							</Label>
							<Textarea
								id={activeEditableStep.description.name}
								name={activeEditableStep.description.name}
								value={activeEditableStep.description.value}
								onChange={(e) =>
									activeEditableStep.description.onChange(e.target.value)
								}
								placeholder="Describe what this step is used for..."
								rows={3}
							/>
							{activeEditableStep.description.error && (
								<InputError>{activeEditableStep.description.error}</InputError>
							)}
						</div>

						<div className="flex gap-6">
							<div>
								<Label htmlFor={activeEditableStep.target_duration_days.name}>
									Target Duration
								</Label>
								<NumberInput
									id={activeEditableStep.target_duration_days.name}
									name={activeEditableStep.target_duration_days.name}
									value={activeEditableStep.target_duration_days.value}
									onChange={(value) =>
										activeEditableStep.target_duration_days.onChange(value)
									}
									suffix="days"
									placeholder="0"
								/>
								{activeEditableStep.target_duration_days.error && (
									<InputError>
										{activeEditableStep.target_duration_days.error}
									</InputError>
								)}
							</div>

							<div>
								<Label htmlFor={activeEditableStep.color.name}>
									Step Color
								</Label>
								<ColorPicker
									variant="button-only"
									value={activeEditableStep.color.value}
									onChange={(color) => activeEditableStep.color.onChange(color)}
								/>
								{activeEditableStep.color.error && (
									<InputError>{activeEditableStep.color.error}</InputError>
								)}
							</div>
						</div>
					</div>

					<input
						type="hidden"
						name={fields.step_templates[activeEditableStepIndex].order.name}
						value={fields.step_templates[activeEditableStepIndex].order.value}
					/>
				</Card>

				{/* Hidden inputs for inactive steps */}
				{fields.step_templates.map((step, idx) => {
					if (idx === activeEditableStepIndex) return null;
					return (
						<div key={`hidden-step-${step.name.name}-${idx}`}>
							<input
								type="hidden"
								name={step.name.name}
								value={step.name.value}
							/>
							<input
								type="hidden"
								name={step.description.name}
								value={step.description.value}
							/>
							<input
								type="hidden"
								name={step.order.name}
								value={step.order.value}
							/>
							<input
								type="hidden"
								name={step.icon.name}
								value={step.icon.value}
							/>
							<input
								type="hidden"
								name={step.iconColor.name}
								value={step.iconColor.value}
							/>
							<input
								type="hidden"
								name={step.color.name}
								value={step.color.value}
							/>
							<input
								type="hidden"
								name={step.target_duration_days.name}
								value={step.target_duration_days.value}
							/>
						</div>
					);
				})}
			</div>
		</form>
	);
}
