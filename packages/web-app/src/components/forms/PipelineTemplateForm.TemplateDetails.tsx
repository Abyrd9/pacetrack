import type { useZodForm } from "@abyrd9/zod-form-data";
import type { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import { Card } from "../primitives/card";
import { IconPicker } from "../primitives/icon-picker";
import { Input, InputError } from "../primitives/input";
import { Label } from "../primitives/label";
import { Textarea } from "../primitives/textarea";

type UseZodFormFields = ReturnType<
	typeof useZodForm<typeof PIPELINE_TEMPLATE_CREATE_ROUTE.request>
>["fields"];

export function TemplateDetailsStep({ fields }: { fields: UseZodFormFields }) {
	return (
		<div>
			<h2 className="text-2xl font-semibold mb-2">Template Details</h2>
			<p className="text-sm text-muted-foreground mb-6">
				Give your pipeline template a name and description.
			</p>

			<Card>
				<div className="space-y-4">
					<div>
						<Label htmlFor={fields.name.name}>
							Template Name & Icon <span className="text-destructive">*</span>
						</Label>
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
									required
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
	);
}
