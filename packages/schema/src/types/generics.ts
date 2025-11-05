import {
	createZodFormDataErrorSchema,
	type ZodFormDataParseResultError,
} from "@abyrd9/zod-form-data";
import { z } from "zod/v4";
import type { $ZodType } from "zod/v4/core";

// Type-level definition - no runtime function calls
type ActionDataErrorSchema<
	T extends $ZodType,
	Key extends string,
> = z.ZodObject<
	{
		key: z.ZodLiteral<Key>;
		status: z.ZodLiteral<"error">;
		payload: z.ZodOptional<z.ZodNull>;
		// Use the type, not the runtime function
		errors: z.ZodOptional<
			z.ZodIntersection<
				z.ZodType<ZodFormDataParseResultError<T>>, // ← Type-level only
				z.ZodObject<
					{
						form: z.ZodOptional<z.ZodNullable<z.ZodString>>;
						global: z.ZodOptional<z.ZodNullable<z.ZodString>>;
					},
					z.core.$strict
				>
			>
		>;
	},
	z.core.$strict
>;

type ActionDataOkSchema<T extends $ZodType, Key extends string> = z.ZodObject<
	{
		key: z.ZodLiteral<Key>;
		status: z.ZodLiteral<"ok">;
		payload: T;
		errors: z.ZodOptional<z.ZodNull>;
	},
	z.core.$strict
>;

export function ActionDataSchema<
	T extends $ZodType,
	S extends "error" | "ok",
	Key extends string,
>(
	schema: T,
	status: S,
	key: Key,
): S extends "error"
	? ActionDataErrorSchema<T, Key>
	: ActionDataOkSchema<T, Key> {
	if (status === "error") {
		return z.object({
			key: z.literal(key),
			status: z.literal("error"),
			payload: z.optional(z.null()),
			errors: z.optional(
				z.intersection(
					createZodFormDataErrorSchema(schema),
					z.object({
						form: z.optional(z.nullable(z.string())),
						global: z.optional(z.nullable(z.string())),
					}),
				),
			),
		}) as unknown as S extends "error"
			? ActionDataErrorSchema<T, Key>
			: ActionDataOkSchema<T, Key>;
	}

	return z.object({
		key: z.literal(key),
		status: z.literal("ok"),
		payload: schema,
		errors: z.optional(z.null()),
	}) as unknown as S extends "error"
		? ActionDataErrorSchema<T, Key>
		: ActionDataOkSchema<T, Key>;
}

export type ActionData<
	T extends $ZodType,
	S extends "error" | "ok",
	Key extends string,
> = S extends "error"
	? ActionDataErrorSchema<T, Key>
	: ActionDataOkSchema<T, Key>;

export type RouteResponse<TSuccess extends $ZodType, TError extends $ZodType> =
	| z.infer<TSuccess>
	| z.infer<TError>;
