import type { useZodForm } from "@abyrd9/zod-form-data";
import type { PIPELINE_TEMPLATE_CREATE_ROUTE } from "@pacetrack/schema";
import { FieldTypeEnum } from "@pacetrack/schema/src/config-schemas/fields";
import { PlusIcon, Trash2Icon } from "lucide-react";
import { Button } from "../primitives/button";
import { Card } from "../primitives/card";
import { Input, InputError } from "../primitives/input";
import { Label } from "../primitives/label";
import { NumberInput } from "../primitives/number-input";
import { Select } from "../primitives/select";
import { Switch } from "../primitives/switch";
import { Textarea } from "../primitives/textarea";

type UseZodFormFieldArrayHelpers = ReturnType<
	typeof useZodForm<typeof PIPELINE_TEMPLATE_CREATE_ROUTE.request>
>["getFieldArrayHelpers"];

type UseZodFormFields = ReturnType<
	typeof useZodForm<typeof PIPELINE_TEMPLATE_CREATE_ROUTE.request>
>["fields"];

export function ItemFields({
	field,
	fieldArrayHelpers,
}: {
	field: UseZodFormFields["item_template"]["fields_definition"]["fields"];
	fieldArrayHelpers: UseZodFormFieldArrayHelpers;
}) {
	const itemFieldsArrayHelpers = fieldArrayHelpers(
		"item_template.fields_definition.fields",
	);
	return (
		<div className="max-w-4xl">
			<h2 className="text-xl font-semibold mb-4">Item Fields</h2>
			<Card>
				<div className="flex items-center justify-between mb-3">
					<div className="text-sm text-foreground-muted">
						Define the fields for items in this pipeline.
					</div>
					<Button
						size="xs"
						type="button"
						onClick={() => {
							itemFieldsArrayHelpers.add({
								display_order: 0,
								type: FieldTypeEnum.text,
								name: "",
								label: "",
								help_text: "",
								is_required: false,
								is_read_only: false,
							});
						}}
					>
						<PlusIcon className="h-4 w-4" />
						Add Field
					</Button>
				</div>

				{/* Hidden version control for fields definition */}
				{/* <input
        type="hidden"
        name={fields.item_template.fields_definition.version.name}
        value={fields.item_template.fields_definition.version.value ?? 1}
      /> */}

				{field.length === 0 ? (
					<div className="text-sm text-foreground-muted py-4">
						No fields yet. Click "Add Field" to get started.
					</div>
				) : (
					<div className="space-y-3">
						{field.map((fieldDef, idx) => {
							console.log(fieldDef.type.value);
							return (
								<Card
									key={`field-card-${
										// biome-ignore lint/suspicious/noArrayIndexKey: This is definitely fine
										idx
									}`}
								>
									<div className="flex items-center justify-between mb-3">
										<div className="font-medium">Field {idx + 1}</div>
										<div className="flex items-center gap-2">
											<Button
												size="xs"
												type="button"
												onClick={() => itemFieldsArrayHelpers.remove(idx)}
											>
												<Trash2Icon className="h-4 w-4" />
											</Button>
										</div>
									</div>

									<div className="w-full max-w-sm mb-4">
										<Label>Type</Label>
										<Select
											value={fieldDef.type.value}
											onValueChange={(value: FieldTypeEnum) => {
												// biome-ignore lint/suspicious/noExplicitAny: This is a weird union type
												fieldDef.type.onChange(value as any);
											}}
										>
											<Select.Trigger
												className="w-full"
												value={fieldDef.type.value}
											>
												<Select.Value placeholder="Select a type">
													{fieldDef.type.value || "Select a type"}
												</Select.Value>
												<Select.Icon />
											</Select.Trigger>
											<Select.Portal>
												<Select.Content>
													<Select.Viewport>
														{Object.values(FieldTypeEnum).map((t) => (
															<Select.Item
																key={t}
																value={t}
																className="flex items-center justify-between gap-2"
															>
																<Select.ItemText>{t}</Select.ItemText>
																<Select.ItemIndicator />
															</Select.Item>
														))}
													</Select.Viewport>
													<Select.ScrollDownButton />
												</Select.Content>
											</Select.Portal>
										</Select>
									</div>

									<div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
										<div>
											<Label>Name</Label>
											<Input
												id={fieldDef.name.name}
												name={fieldDef.name.name}
												value={fieldDef.name.value}
												onChange={(e) => {
													// Always make underscore and replace spaces with underscores
													// Also only allow one underscore in a row
													const value = e.target.value
														.toLowerCase()
														.replace(/ /g, "_")
														.replace(/_{2,}/g, "_")
														.replace(/[^a-z0-9_]/g, "");

													fieldDef.name.onChange(value);
												}}
												placeholder="Field Name"
											/>
											{fieldDef.name.error && (
												<InputError>{fieldDef.name.error}</InputError>
											)}
										</div>

										<div>
											<Label htmlFor={fieldDef.label.name}>Label</Label>
											<Input
												id={fieldDef.label.name}
												name={fieldDef.label.name}
												value={fieldDef.label.value}
												onChange={(e) =>
													fieldDef.label.onChange(e.target.value)
												}
												placeholder="e.g., Deal Amount"
											/>
										</div>

										<div className="md:col-span-2">
											<Label htmlFor={fieldDef.help_text.name}>Help Text</Label>
											<Textarea
												id={fieldDef.help_text.name}
												name={fieldDef.help_text.name}
												value={fieldDef.help_text.value}
												onChange={(e) =>
													fieldDef.help_text.onChange(e.target.value)
												}
												placeholder="Provide additional context or instructions for this field..."
												rows={2}
												maxLength={240}
											/>
										</div>

										<div className="flex items-center gap-3">
											<Switch
												checked={!!fieldDef.is_required.value}
												onCheckedChange={(checked) =>
													fieldDef.is_required.onChange(checked)
												}
											>
												<Switch.Thumb />
											</Switch>
											<Label>Required</Label>
										</div>

										<div className="flex items-center gap-3">
											<Switch
												checked={!!fieldDef.is_read_only.value}
												onCheckedChange={(checked) =>
													fieldDef.is_read_only.onChange(checked)
												}
											>
												<Switch.Thumb />
											</Switch>
											<Label>Read Only</Label>
										</div>
									</div>

									{fieldDef.type.value && (
										<>
											<div className="font-medium capitalize mb-4">
												{fieldDef.type.value} Specific Configuration
											</div>

											{fieldDef.type.value === FieldTypeEnum.text && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="md:col-span-2">
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., Enter text..."
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.min_length.name}>
															Min Length
														</Label>
														<NumberInput
															id={fieldDef.min_length.name}
															name={fieldDef.min_length.name}
															value={fieldDef.min_length.value}
															onChange={(v) => fieldDef.min_length.onChange(v)}
															placeholder="0"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_length.name}>
															Max Length
														</Label>
														<NumberInput
															id={fieldDef.max_length.name}
															name={fieldDef.max_length.name}
															value={fieldDef.max_length.value}
															onChange={(v) => fieldDef.max_length.onChange(v)}
															placeholder="No limit"
														/>
													</div>
													<div className="md:col-span-2">
														<Label htmlFor={fieldDef.pattern.name}>
															Pattern (Regex)
														</Label>
														<Input
															id={fieldDef.pattern.name}
															name={fieldDef.pattern.name}
															value={fieldDef.pattern.value}
															onChange={(e) =>
																fieldDef.pattern.onChange(e.target.value)
															}
															placeholder="e.g., ^[A-Z].*"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.textarea && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="md:col-span-2">
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., Enter details..."
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.rows.name}>Rows</Label>
														<NumberInput
															id={fieldDef.rows.name}
															name={fieldDef.rows.name}
															value={fieldDef.rows.value}
															onChange={(v) => fieldDef.rows.onChange(v)}
															placeholder="4"
														/>
													</div>
													<div />
													<div>
														<Label htmlFor={fieldDef.min_length.name}>
															Min Length
														</Label>
														<NumberInput
															id={fieldDef.min_length.name}
															name={fieldDef.min_length.name}
															value={fieldDef.min_length.value}
															onChange={(v) => fieldDef.min_length.onChange(v)}
															placeholder="0"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_length.name}>
															Max Length
														</Label>
														<NumberInput
															id={fieldDef.max_length.name}
															name={fieldDef.max_length.name}
															value={fieldDef.max_length.value}
															onChange={(v) => fieldDef.max_length.onChange(v)}
															placeholder="No limit"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.number && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., 0"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.suffix.name}>Suffix</Label>
														<Input
															id={fieldDef.suffix.name}
															name={fieldDef.suffix.name}
															value={fieldDef.suffix.value}
															onChange={(e) =>
																fieldDef.suffix.onChange(e.target.value)
															}
															placeholder="e.g., units"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.format.name}>Format</Label>
														<Select
															value={fieldDef.format.value}
															onValueChange={(value: string) =>
																fieldDef.format.onChange(
																	value as "integer" | "decimal",
																)
															}
														>
															<Select.Trigger className="w-full">
																<Select.Value placeholder="Select format" />
																<Select.Icon />
															</Select.Trigger>
															<Select.Portal>
																<Select.Content>
																	<Select.Viewport>
																		<Select.Item value="integer">
																			<Select.ItemText>Integer</Select.ItemText>
																			<Select.ItemIndicator />
																		</Select.Item>
																		<Select.Item value="decimal">
																			<Select.ItemText>Decimal</Select.ItemText>
																			<Select.ItemIndicator />
																		</Select.Item>
																	</Select.Viewport>
																</Select.Content>
															</Select.Portal>
														</Select>
													</div>
													<div />
													<div>
														<Label htmlFor={fieldDef.min_value.name}>
															Min Value
														</Label>
														<NumberInput
															id={fieldDef.min_value.name}
															name={fieldDef.min_value.name}
															value={fieldDef.min_value.value}
															onChange={(v) => fieldDef.min_value.onChange(v)}
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_value.name}>
															Max Value
														</Label>
														<NumberInput
															id={fieldDef.max_value.name}
															name={fieldDef.max_value.name}
															value={fieldDef.max_value.value}
															onChange={(v) => fieldDef.max_value.onChange(v)}
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.currency && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., 0.00"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.currency_code.name}>
															Currency Code
														</Label>
														<Input
															id={fieldDef.currency_code.name}
															name={fieldDef.currency_code.name}
															value={fieldDef.currency_code.value}
															onChange={(e) =>
																fieldDef.currency_code.onChange(e.target.value)
															}
															placeholder="USD"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.min_value.name}>
															Min Value
														</Label>
														<NumberInput
															id={fieldDef.min_value.name}
															name={fieldDef.min_value.name}
															value={fieldDef.min_value.value}
															onChange={(v) => fieldDef.min_value.onChange(v)}
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_value.name}>
															Max Value
														</Label>
														<NumberInput
															id={fieldDef.max_value.name}
															name={fieldDef.max_value.name}
															value={fieldDef.max_value.value}
															onChange={(v) => fieldDef.max_value.onChange(v)}
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.percentage && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="md:col-span-2">
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., 50"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.min_value.name}>
															Min (0-100)
														</Label>
														<NumberInput
															id={fieldDef.min_value.name}
															name={fieldDef.min_value.name}
															value={fieldDef.min_value.value}
															onChange={(v) => fieldDef.min_value.onChange(v)}
															placeholder="0"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_value.name}>
															Max (0-100)
														</Label>
														<NumberInput
															id={fieldDef.max_value.name}
															name={fieldDef.max_value.name}
															value={fieldDef.max_value.value}
															onChange={(v) => fieldDef.max_value.onChange(v)}
															placeholder="100"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.step.name}>Step</Label>
														<NumberInput
															id={fieldDef.step.name}
															name={fieldDef.step.name}
															value={fieldDef.step.value}
															onChange={(v) => fieldDef.step.onChange(v)}
															placeholder="1"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.date && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="md:col-span-2">
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., Select date"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.min_date.name}>
															Min Date
														</Label>
														<Input
															id={fieldDef.min_date.name}
															name={fieldDef.min_date.name}
															value={fieldDef.min_date.value}
															onChange={(e) =>
																fieldDef.min_date.onChange(e.target.value)
															}
															placeholder="YYYY-MM-DD"
															type="date"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_date.name}>
															Max Date
														</Label>
														<Input
															id={fieldDef.max_date.name}
															name={fieldDef.max_date.name}
															value={fieldDef.max_date.value}
															onChange={(e) =>
																fieldDef.max_date.onChange(e.target.value)
															}
															placeholder="YYYY-MM-DD"
															type="date"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.datetime && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div className="md:col-span-2">
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., Select date and time"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.min_datetime.name}>
															Min DateTime
														</Label>
														<Input
															id={fieldDef.min_datetime.name}
															name={fieldDef.min_datetime.name}
															value={fieldDef.min_datetime.value}
															onChange={(e) =>
																fieldDef.min_datetime.onChange(e.target.value)
															}
															type="datetime-local"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.max_datetime.name}>
															Max DateTime
														</Label>
														<Input
															id={fieldDef.max_datetime.name}
															name={fieldDef.max_datetime.name}
															value={fieldDef.max_datetime.value}
															onChange={(e) =>
																fieldDef.max_datetime.onChange(e.target.value)
															}
															type="datetime-local"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.boolean && (
												<div className="text-sm text-muted-foreground">
													No additional configuration needed for boolean fields.
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.dropdown && (
												<div className="space-y-4">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div>
															<Label htmlFor={fieldDef.placeholder.name}>
																Placeholder
															</Label>
															<Input
																id={fieldDef.placeholder.name}
																name={fieldDef.placeholder.name}
																value={fieldDef.placeholder.value}
																onChange={(e) =>
																	fieldDef.placeholder.onChange(e.target.value)
																}
																placeholder="e.g., Select an option"
															/>
														</div>
														<div className="flex items-center gap-3">
															<Switch
																checked={!!fieldDef.allow_custom.value}
																onCheckedChange={(checked) =>
																	fieldDef.allow_custom.onChange(checked)
																}
															>
																<Switch.Thumb />
															</Switch>
															<Label>Allow Custom Values</Label>
														</div>
													</div>
													<div className="text-sm text-muted-foreground">
														<strong>Note:</strong> Options management will be
														available in the next version. For now, options can
														be configured after creation.
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.multiselect && (
												<div className="space-y-4">
													<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
														<div className="md:col-span-2">
															<Label htmlFor={fieldDef.placeholder.name}>
																Placeholder
															</Label>
															<Input
																id={fieldDef.placeholder.name}
																name={fieldDef.placeholder.name}
																value={fieldDef.placeholder.value}
																onChange={(e) =>
																	fieldDef.placeholder.onChange(e.target.value)
																}
																placeholder="e.g., Select options"
															/>
														</div>
														<div>
															<Label htmlFor={fieldDef.min_selections.name}>
																Min Selections
															</Label>
															<NumberInput
																id={fieldDef.min_selections.name}
																name={fieldDef.min_selections.name}
																value={fieldDef.min_selections.value}
																onChange={(v) =>
																	fieldDef.min_selections.onChange(v)
																}
																placeholder="0"
															/>
														</div>
														<div>
															<Label htmlFor={fieldDef.max_selections.name}>
																Max Selections
															</Label>
															<NumberInput
																id={fieldDef.max_selections.name}
																name={fieldDef.max_selections.name}
																value={fieldDef.max_selections.value}
																onChange={(v) =>
																	fieldDef.max_selections.onChange(v)
																}
																placeholder="Unlimited"
															/>
														</div>
													</div>
													<div className="flex items-center gap-3">
														<Switch
															checked={!!fieldDef.allow_custom.value}
															onCheckedChange={(checked) =>
																fieldDef.allow_custom.onChange(checked)
															}
														>
															<Switch.Thumb />
														</Switch>
														<Label>Allow Custom Values</Label>
													</div>
													<div className="text-sm text-muted-foreground">
														<strong>Note:</strong> Options management will be
														available in the next version. For now, options can
														be configured after creation.
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.url && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., https://example.com"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.pattern.name}>
															URL Pattern (Regex)
														</Label>
														<Input
															id={fieldDef.pattern.name}
															name={fieldDef.pattern.name}
															value={fieldDef.pattern.value}
															onChange={(e) =>
																fieldDef.pattern.onChange(e.target.value)
															}
															placeholder="e.g., ^https://.*"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.email && (
												<div className="grid grid-cols-1 md:grid-cols-1 gap-4">
													<div>
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., user@example.com"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.phone && (
												<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
													<div>
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., (555) 123-4567"
														/>
													</div>
													<div>
														<Label htmlFor={fieldDef.pattern.name}>
															Phone Pattern (Regex)
														</Label>
														<Input
															id={fieldDef.pattern.name}
															name={fieldDef.pattern.name}
															value={fieldDef.pattern.value}
															onChange={(e) =>
																fieldDef.pattern.onChange(e.target.value)
															}
															placeholder="e.g., ^\\+?[0-9\\-\\s]{7,15}$"
														/>
													</div>
												</div>
											)}

											{fieldDef.type.value === FieldTypeEnum.user && (
												<div className="grid grid-cols-1 md:grid-cols-1 gap-4">
													<div>
														<Label htmlFor={fieldDef.placeholder.name}>
															Placeholder
														</Label>
														<Input
															id={fieldDef.placeholder.name}
															name={fieldDef.placeholder.name}
															value={fieldDef.placeholder.value}
															onChange={(e) =>
																fieldDef.placeholder.onChange(e.target.value)
															}
															placeholder="e.g., Select user"
														/>
													</div>
												</div>
											)}
										</>
									)}
								</Card>
							);

							// return (
							// 	<Card key={fieldDef.id.value}>
							// 		<div className="flex items-center justify-between mb-3">
							// 			<div className="font-medium">Field {idx + 1}</div>
							// 			<div className="flex items-center gap-2">
							// 				<Button
							// 					size="xs"
							// 					type="button"
							// 					onClick={() => itemFieldsArrayHelpers.remove(idx)}
							// 				>
							// 					<Trash2Icon className="h-4 w-4" />
							// 				</Button>
							// 			</div>
							// 		</div>

							// 		<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							// 			<div>
							// 				<Label htmlFor={fieldDef.type.name}>Type</Label>
							// 				<Select
							// 					value={fieldDef.type.value}
							// 					onValueChange={(value: FieldTypeEnum) =>
							// 						fieldDef.type.onChange(value)
							// 					}
							// 				>
							// 					<Select.Trigger className="w-full">
							// 						<Select.Value placeholder="Select a type">
							// 							{fieldDef.type.value || "Select a type"}
							// 						</Select.Value>
							// 						<Select.Icon />
							// 					</Select.Trigger>
							// 					<Select.Portal>
							// 						<Select.Content>
							// 							<Select.ScrollUpButton />
							// 							<Select.Viewport>
							// 								{Object.values(FieldTypeEnum).map((t) => (
							// 									<Select.Item key={t} value={t}>
							// 										<Select.ItemText>{t}</Select.ItemText>
							// 										<Select.ItemIndicator />
							// 									</Select.Item>
							// 								))}
							// 							</Select.Viewport>
							// 							<Select.ScrollDownButton />
							// 						</Select.Content>
							// 					</Select.Portal>
							// 				</Select>
							// 				{fieldDef.type.error && (
							// 					<InputError>{fieldDef.type.error}</InputError>
							// 				)}
							// 			</div>

							// 			<div>
							// 				<Label htmlFor={fieldDef.name.name}>Name</Label>
							// 				<Input
							// 					id={fieldDef.name.name}
							// 					name={fieldDef.name.name}
							// 					value={fieldDef.name.value}
							// 					onChange={(e) =>
							// 						fieldDef.name.onChange(e.target.value)
							// 					}
							// 					placeholder="machine_safe_name"
							// 				/>
							// 				{fieldDef.name.error && (
							// 					<InputError>{fieldDef.name.error}</InputError>
							// 				)}
							// 			</div>

							// 			<div>
							// 				<Label htmlFor={fieldDef.label.name}>Label</Label>
							// 				<Input
							// 					id={fieldDef.label.name}
							// 					name={fieldDef.label.name}
							// 					value={fieldDef.label.value}
							// 					onChange={(e) =>
							// 						fieldDef.label.onChange(e.target.value)
							// 					}
							// 					placeholder="e.g., Deal Amount"
							// 				/>
							// 			</div>

							// 			<div>
							// 				<Label htmlFor={fieldDef.help_text.name}>
							// 					Help Text
							// 				</Label>
							// 				<Input
							// 					id={fieldDef.help_text.name}
							// 					name={fieldDef.help_text.name}
							// 					value={fieldDef.help_text.value}
							// 					onChange={(e) =>
							// 						fieldDef.help_text.onChange(e.target.value)
							// 					}
							// 					placeholder="Short helper text"
							// 				/>
							// 			</div>

							// 			<div className="flex items-center gap-3">
							// 				<Switch
							// 					checked={!!fieldDef.is_required.value}
							// 					onCheckedChange={(checked) =>
							// 						fieldDef.is_required.onChange(checked)
							// 					}
							// 				/>
							// 				<Label>Required</Label>
							// 			</div>

							// 			<div className="flex items-center gap-3">
							// 				<Switch
							// 					checked={!!fieldDef.is_read_only.value}
							// 					onCheckedChange={(checked) =>
							// 						fieldDef.is_read_only.onChange(checked)
							// 					}
							// 				/>
							// 				<Label>Read Only</Label>
							// 			</div>
							// 		</div>

							// 		{/* Type-specific configuration */}
							// 		<div className="mt-4">
							// 			{fieldDef.type.value === FieldTypeEnum.text && (
							// 				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							// 					<div>
							// 						<Label htmlFor={fieldDef.placeholder.name}>
							// 							Placeholder
							// 						</Label>
							// 						<Input
							// 							id={fieldDef.placeholder.name}
							// 							name={fieldDef.placeholder.name}
							// 							value={fieldDef.placeholder.value}
							// 							onChange={(e) =>
							// 								fieldDef.placeholder.onChange(e.target.value)
							// 							}
							// 							placeholder="e.g., Acme Corp"
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.min_length.name}>
							// 							Min Length
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.min_length.name}
							// 							name={fieldDef.min_length.name}
							// 							value={fieldDef.min_length.value}
							// 							onChange={(v) =>
							// 								fieldDef.min_length.onChange(v)
							// 							}
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.max_length.name}>
							// 							Max Length
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.max_length.name}
							// 							name={fieldDef.max_length.name}
							// 							value={fieldDef.max_length.value}
							// 							onChange={(v) =>
							// 								fieldDef.max_length.onChange(v)
							// 							}
							// 						/>
							// 					</div>
							// 				</div>
							// 			)}

							// 			{fieldDef.type.value === FieldTypeEnum.number && (
							// 				<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
							// 					<div>
							// 						<Label htmlFor={fieldDef.suffix.name}>
							// 							Suffix
							// 						</Label>
							// 						<Input
							// 							id={fieldDef.suffix.name}
							// 							name={fieldDef.suffix.name}
							// 							value={fieldDef.suffix.value}
							// 							onChange={(e) =>
							// 								fieldDef.suffix.onChange(e.target.value)
							// 							}
							// 							placeholder="e.g., units"
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.format.name}>
							// 							Format
							// 						</Label>
							// 						<Select
							// 							value={fieldDef.format.value}
							// 							onValueChange={(value: string) =>
							// 								fieldDef.format.onChange(
							// 									value as "integer" | "decimal",
							// 								)
							// 							}
							// 						>
							// 							<Select.Trigger className="w-full">
							// 								<Select.Value placeholder="Select format" />
							// 								<Select.Icon />
							// 							</Select.Trigger>
							// 							<Select.Portal>
							// 								<Select.Content>
							// 									<Select.Viewport>
							// 										<Select.Item value="integer">
							// 											<Select.ItemText>
							// 												integer
							// 											</Select.ItemText>
							// 											<Select.ItemIndicator />
							// 										</Select.Item>
							// 										<Select.Item value="decimal">
							// 											<Select.ItemText>
							// 												decimal
							// 											</Select.ItemText>
							// 											<Select.ItemIndicator />
							// 										</Select.Item>
							// 									</Select.Viewport>
							// 								</Select.Content>
							// 							</Select.Portal>
							// 						</Select>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.min_value.name}>
							// 							Min
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.min_value.name}
							// 							name={fieldDef.min_value.name}
							// 							value={fieldDef.min_value.value}
							// 							onChange={(v) => fieldDef.min_value.onChange(v)}
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.max_value.name}>
							// 							Max
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.max_value.name}
							// 							name={fieldDef.max_value.name}
							// 							value={fieldDef.max_value.value}
							// 							onChange={(v) => fieldDef.max_value.onChange(v)}
							// 						/>
							// 					</div>
							// 				</div>
							// 			)}

							// 			{fieldDef.type.value === FieldTypeEnum.currency && (
							// 				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							// 					<div>
							// 						<Label htmlFor={fieldDef.currency_code.name}>
							// 							Currency Code
							// 						</Label>
							// 						<Input
							// 							id={fieldDef.currency_code.name}
							// 							name={fieldDef.currency_code.name}
							// 							value={fieldDef.currency_code.value}
							// 							onChange={(e) =>
							// 								fieldDef.currency_code.onChange(
							// 									e.target.value,
							// 								)
							// 							}
							// 							placeholder="USD"
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.min_value.name}>
							// 							Min
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.min_value.name}
							// 							name={fieldDef.min_value.name}
							// 							value={fieldDef.min_value.value}
							// 							onChange={(v) => fieldDef.min_value.onChange(v)}
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.max_value.name}>
							// 							Max
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.max_value.name}
							// 							name={fieldDef.max_value.name}
							// 							value={fieldDef.max_value.value}
							// 							onChange={(v) => fieldDef.max_value.onChange(v)}
							// 						/>
							// 					</div>
							// 				</div>
							// 			)}

							// 			{fieldDef.type.value === FieldTypeEnum.percentage && (
							// 				<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
							// 					<div>
							// 						<Label htmlFor={fieldDef.min_value.name}>
							// 							Min (0-100)
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.min_value.name}
							// 							name={fieldDef.min_value.name}
							// 							value={fieldDef.min_value.value}
							// 							onChange={(v) => fieldDef.min_value.onChange(v)}
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.max_value.name}>
							// 							Max (0-100)
							// 						</Label>
							// 						<NumberInput
							// 							id={fieldDef.max_value.name}
							// 							name={fieldDef.max_value.name}
							// 							value={fieldDef.max_value.value}
							// 							onChange={(v) => fieldDef.max_value.onChange(v)}
							// 						/>
							// 					</div>
							// 					<div>
							// 						<Label htmlFor={fieldDef.step.name}>Step</Label>
							// 						<NumberInput
							// 							id={fieldDef.step.name}
							// 							name={fieldDef.step.name}
							// 							value={fieldDef.step.value}
							// 							onChange={(v) => fieldDef.step.onChange(v)}
							// 						/>
							// 					</div>
							// 				</div>
							// 			)}

							// 			{fieldDef.type.value === FieldTypeEnum.url && (
							// 				<div>
							// 					<Label htmlFor={fieldDef.pattern.name}>
							// 						Custom URL Pattern
							// 					</Label>
							// 					<Input
							// 						id={fieldDef.pattern.name}
							// 						name={fieldDef.pattern.name}
							// 						value={fieldDef.pattern.value}
							// 						onChange={(e) =>
							// 							fieldDef.pattern.onChange(e.target.value)
							// 						}
							// 						placeholder="^https://example\\.com/.*$"
							// 					/>
							// 				</div>
							// 			)}

							// 			{fieldDef.type.value === FieldTypeEnum.phone && (
							// 				<div>
							// 					<Label htmlFor={fieldDef.pattern.name}>
							// 						Phone Pattern
							// 					</Label>
							// 					<Input
							// 						id={fieldDef.pattern.name}
							// 						name={fieldDef.pattern.name}
							// 						value={fieldDef.pattern.value}
							// 						onChange={(e) =>
							// 							fieldDef.pattern.onChange(e.target.value)
							// 						}
							// 						placeholder="e.g., ^\\+?[0-9\\-\\s]{7,15}$"
							// 					/>
							// 				</div>
							// 			)}
							// 		</div>
							// 	</Card>
							// );
						})}
					</div>
				)}
			</Card>
		</div>
	);
}
