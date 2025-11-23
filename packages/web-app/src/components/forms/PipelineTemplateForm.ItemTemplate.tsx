import type { useZodForm } from "@abyrd9/zod-form-data";
import type { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import { Card } from "../primitives/card";
import { Input, InputError } from "../primitives/input";
import { Label } from "../primitives/label";
import { Select } from "../primitives/select";
import { Textarea } from "../primitives/textarea";

type UseZodFormFields = ReturnType<
	typeof useZodForm<typeof PIPELINE_TEMPLATE_CREATE_ROUTE.request>
>["fields"];

export function ItemTemplateStep({ fields }: { fields: UseZodFormFields }) {
	return (
		<div>
			<h2 className="text-2xl font-semibold mb-2">Item Template</h2>
			<p className="text-sm text-muted-foreground mb-6">
				Configure the items that will move through this pipeline.
			</p>

			<Card>
				<div className="space-y-4">
					<div>
						<Label htmlFor={fields.item_template.name.name}>
							Item Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id={fields.item_template.name.name}
							name={fields.item_template.name.name}
							value={fields.item_template.name.value}
							onChange={(e) =>
								fields.item_template.name.onChange(e.target.value)
							}
							placeholder="e.g., Deal"
							required
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
					</div>

					<div>
						<Label htmlFor={fields.item_template.initial_step_index.name}>
							Initial Step
						</Label>
						<Select
							value={
								fields.item_template.initial_step_index.value?.toString() ?? "0"
							}
							onValueChange={(value) =>
								fields.item_template.initial_step_index.onChange(
									Number.parseInt(value),
								)
							}
						>
							<Select.Trigger className="w-full">
								<Select.Value placeholder="Select initial step">
									{fields.step_templates[
										fields.item_template.initial_step_index.value ?? 0
									]?.name.value || "Select initial step"}
								</Select.Value>
								<Select.Icon />
							</Select.Trigger>
							<Select.Portal>
								<Select.Content>
									<Select.Viewport>
										{fields.step_templates.map((step, idx) => (
											<Select.Item
												key={`initial-step-${
													// biome-ignore lint/suspicious/noArrayIndexKey: This is fine
													idx
												}`}
												value={idx.toString()}
											>
												<Select.ItemText>
													{step.name.value || `Step ${idx + 1}`}
												</Select.ItemText>
												<Select.ItemIndicator />
											</Select.Item>
										))}
									</Select.Viewport>
								</Select.Content>
							</Select.Portal>
						</Select>
						<input
							type="hidden"
							name={fields.item_template.initial_step_index.name}
							value={fields.item_template.initial_step_index.value ?? 0}
						/>
					</div>
				</div>
			</Card>
		</div>
	);
}

