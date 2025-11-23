import { useZodForm } from "@abyrd9/zod-form-data";
import { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import type { ItemTemplate } from "@pacetrack/schema/src/db-schema/item-template";
import type { PipelineTemplate } from "@pacetrack/schema/src/db-schema/pipeline-template";
import type { StepTemplate } from "@pacetrack/schema/src/db-schema/step-template";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { type FormEvent, useEffect, useState } from "react";
import { Button } from "~/components/primitives/button";
import { Tooltip } from "~/components/primitives/tooltip";
import { cx } from "~/utils/helpers/cx";
import { HandDrawnBox } from "../pipeline-visualizer/HandDrawnBox";
import { ItemFields } from "./PipelineTemplateForm.ItemFields";
import { ItemTemplateStep } from "./PipelineTemplateForm.ItemTemplate";
import { StepsStep } from "./PipelineTemplateForm.Steps";
import { TemplateDetailsStep } from "./PipelineTemplateForm.TemplateDetails";

type PipelineTemplateWizardProps = {
	mode: "create" | "edit";
	initialData?: {
		pipeline: PipelineTemplate;
		step_templates: StepTemplate[];
		item_template: ItemTemplate;
	};
	onSubmit: (data: FormData) => Promise<void> | void;
	isPending?: boolean;
};

const STEPS = [
	{ id: 1, name: "Template Details" },
	{ id: 2, name: "Configure Steps" },
	{ id: 3, name: "Item Template" },
] as const;

export function PipelineTemplateWizard({
	mode,
	initialData,
	onSubmit,
	isPending = false,
}: PipelineTemplateWizardProps) {
	const [currentStep, setCurrentStep] = useState(1);

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
									fields_definition?: unknown;
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

	const [pipelineDrawnSteps, setPipelineDrawnSteps] = useState<
		HTMLButtonElement[]
	>([]);
	const [pipelineStepConfigCards, setPipelineStepConfigCards] = useState<
		HTMLDivElement[]
	>([]);
	const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);

	const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		await onSubmit(formData);
	};

	const handleNext = () => {
		if (currentStep < STEPS.length) {
			setCurrentStep(currentStep + 1);
		}
	};

	const handleBack = () => {
		if (currentStep > 1) {
			setCurrentStep(currentStep - 1);
		}
	};

	const canGoNext = () => {
		// Add validation logic here if needed
		return currentStep < STEPS.length;
	};

	const isLastStep = currentStep === STEPS.length;

	// Scroll to config card when preview step is clicked
	const handlePreviewStepClick = (index: number) => {
		// Always set the active index first
		setActiveStepIndex(index);

		// If not on step 2, navigate there first
		if (currentStep !== 2) {
			setCurrentStep(2);
			// The useEffect below will handle scrolling after step change
			return;
		}

		// Use querySelector to find the config card element by data attribute (more reliable)
		const configCardElement = document.querySelector(
			`[data-step-index="${index}"][data-step-config-card="true"]`,
		) as HTMLDivElement | null;

		const handDrawnBoxElement = document.querySelector(
			`[data-step-index="${index}"][data-step-hand-drawn-box="true"]`,
		) as HTMLDivElement | null;

		requestAnimationFrame(() => {
			if (configCardElement) {
				configCardElement.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "nearest",
				});
			}
			if (handDrawnBoxElement) {
				handDrawnBoxElement.scrollIntoView({
					behavior: "smooth",
					block: "center",
					inline: "nearest",
				});
			}
		});
	};

	useEffect(() => {
		const observer = new IntersectionObserver((entries) => {
			if (pipelineStepConfigCards.length > 0) {
			}
		});

		return () => {
			observer.disconnect();
		};
	}, [pipelineStepConfigCards]);

	return (
		<form onSubmit={handleFormSubmit} className="space-y-6">
			{/* Step Progress Indicator */}
			<div className="flex items-center justify-start gap-2 mb-8">
				{STEPS.map((step, idx) => (
					<div key={step.id} className="flex items-center gap-2">
						<button
							type="button"
							onClick={() => setCurrentStep(step.id)}
							className={cx(
								"flex items-center gap-2 px-4 py-2 rounded-lg transition-colors",
								currentStep === step.id
									? "bg-blue-500 text-background"
									: currentStep > step.id
										? "bg-blue-100 hover:bg-blue-200 text-foreground"
										: "bg-background-100 hover:bg-background-200 text-muted-foreground",
							)}
						>
							<span className="font-semibold">{step.id}</span>
							<span className="text-sm">{step.name}</span>
						</button>
						{idx < STEPS.length - 1 && (
							<ChevronRight className="h-4 w-4 text-muted-foreground" />
						)}
					</div>
				))}
			</div>

			{/* Current Step Content */}
			<div className="max-w-8xl mx-auto mb-14">
				{currentStep === 1 && <TemplateDetailsStep fields={fields} />}
				{currentStep === 2 && (
					<StepsStep
						fields={fields}
						getFieldArrayHelpers={getFieldArrayHelpers}
						activeStepIndex={activeStepIndex}
						setActiveStepIndex={setActiveStepIndex}
						pipelineStepConfigCards={pipelineStepConfigCards}
						setPipelineStepConfigCards={setPipelineStepConfigCards}
					/>
				)}
				{currentStep === 3 && (
					<>
						<ItemTemplateStep fields={fields} />
						<div className="mt-6">
							<ItemFields
								field={fields.item_template.fields_definition.fields}
								fieldArrayHelpers={getFieldArrayHelpers}
							/>
						</div>
					</>
				)}

				{/* Navigation Buttons */}
				<div className="flex items-center justify-between max-w-8xl mx-auto mt-6">
					<Button
						type="button"
						variant="outline"
						onClick={handleBack}
						disabled={currentStep === 1}
					>
						<ChevronLeft className="h-4 w-4 mr-2" />
						Back
					</Button>

					{isLastStep ? (
						<Button type="submit" disabled={isPending}>
							{isPending
								? mode === "create"
									? "Creating..."
									: "Saving..."
								: mode === "create"
									? "Create Pipeline Template"
									: "Save Changes"}
						</Button>
					) : (
						<Button
							type="button"
							onClick={handleNext}
							disabled={!canGoNext() || isPending}
						>
							Next: {STEPS[currentStep]?.name}
							<ChevronRight className="h-4 w-4 ml-2" />
						</Button>
					)}
				</div>
			</div>

			{/* Pipeline Preview & Navigation - Sticky at bottom */}
			<div className="sticky bottom-0 z-10 bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 border-t pt-4 mt-6 pb-12">
				<Tooltip.Provider>
					<div>
						<h3 className="text-lg font-semibold mb-4 text-center">
							Pipeline Preview
						</h3>
						<span
							className={cx("font-handwriting text-muted-500 pl-3 block mb-2", {
								"text-foreground": !!fields.name.value,
							})}
						>
							{fields.name.value
								? fields.name.value
								: "N/A (No Pipeline Name Set)"}
						</span>

						<div className="overflow-x-auto pb-4">
							<div className="inline-flex flex-col min-w-full">
								<HandDrawnBox
									className="w-full h-16"
									color="#fbbf24"
									roughness={0.75}
									bowing={1}
								/>

								<div className="flex">
									{fields.step_templates.map((step, idx) => {
										const baseWidth = 184;
										const widthPerDay = 60;
										const duration = step.target_duration_days.value || 0;
										const calculatedWidth = baseWidth + duration * widthPerDay;
										const isActive =
											currentStep === 2 && activeStepIndex === idx;

										return (
											<Tooltip key={`step-${step.name.name}-${idx}`}>
												<Tooltip.Trigger asChild>
													<button
														ref={(el) => {
															if (el) {
																setPipelineDrawnSteps(
																	(prev: HTMLButtonElement[]) => {
																		const exists = prev.find((step) =>
																			step.isSameNode(el),
																		);
																		return exists
																			? prev
																			: [...prev, el as HTMLButtonElement];
																	},
																);
															}
														}}
														data-step-index={idx}
														type="button"
														onClick={() => handlePreviewStepClick(idx)}
														style={{ width: `${calculatedWidth}px` }}
														className={cx(
															"shrink-0 transition-all",
															isActive &&
																"ring-2 ring-blue-500 ring-offset-2 ring-offset-background rounded-lg",
														)}
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
																color={isActive ? "#3b82f6" : step.color.value}
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
																	Duration: {step.target_duration_days.value}{" "}
																	days
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
			</div>
		</form>
	);
}
