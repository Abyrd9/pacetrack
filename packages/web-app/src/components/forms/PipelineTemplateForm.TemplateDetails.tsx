import type { useZodForm } from "@abyrd9/zod-form-data";
import type { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import { Card } from "../primitives/card";
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
							Name <span className="text-destructive">*</span>
						</Label>
						<Input
							id={fields.name.name}
							name={fields.name.name}
							value={fields.name.value}
							onChange={(e) => fields.name.onChange(e.target.value)}
							placeholder="e.g., Sales Pipeline"
							required
						/>
						{fields.name.error && (
							<InputError>{fields.name.error}</InputError>
						)}
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
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<Label htmlFor={fields.icon.name}>Icon</Label>
							<Input
								id={fields.icon.name}
								name={fields.icon.name}
								value={fields.icon.value}
								onChange={(e) => fields.icon.onChange(e.target.value)}
								placeholder="Sparkles"
							/>
						</div>

						<div>
							<Label htmlFor={fields.iconColor.name}>Icon Color</Label>
							<div className="flex gap-2">
								<Input
									id={fields.iconColor.name}
									name={fields.iconColor.name}
									type="color"
									value={fields.iconColor.value}
									onChange={(e) => fields.iconColor.onChange(e.target.value)}
									className="w-20 h-10 cursor-pointer"
								/>
								<Input
									type="text"
									value={fields.iconColor.value}
									onChange={(e) => fields.iconColor.onChange(e.target.value)}
									placeholder="#3b82f6"
									className="flex-1"
								/>
							</div>
						</div>
					</div>
				</div>
			</Card>
		</div>
	);
}

