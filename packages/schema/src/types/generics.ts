import { z } from "zod/v4";

export type NestedFieldErrorsSchema<T extends z.ZodType> =
  T extends z.ZodObject<infer Shape>
    ? z.ZodOptional<
        z.ZodObject<
          {
            [K in keyof Shape]: NestedFieldErrorsSchema<Shape[K] & z.ZodType>;
          },
          z.core.$strict
        >
      >
    : T extends z.ZodRecord<infer K, infer V>
    ? z.ZodOptional<z.ZodNullable<z.ZodRecord<K, V>>>
    : z.ZodOptional<z.ZodNullable<z.ZodString>>;

type ActionDataErrorSchema<
  T extends z.ZodType,
  Key extends string
> = z.ZodObject<
  {
    key: z.ZodLiteral<Key>;
    status: z.ZodLiteral<"error">;
    payload: z.ZodOptional<z.ZodNull>;
    errors: z.ZodOptional<
      z.ZodIntersection<
        NestedFieldErrorsSchema<T>,
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

type ActionDataOkSchema<
  T extends z.ZodTypeAny,
  Key extends string
> = z.ZodObject<
  {
    key: z.ZodLiteral<Key>;
    status: z.ZodLiteral<"ok">;
    payload: T;
    errors: z.ZodOptional<z.ZodNull>;
  },
  z.core.$strict
>;

export function ActionDataSchema<
  T extends z.ZodType,
  S extends "error" | "ok",
  Key extends string
>(
  schema: T,
  status: S,
  key: Key
): S extends "error"
  ? ActionDataErrorSchema<T, Key>
  : ActionDataOkSchema<T, Key> {
  if (status === "error") {
    return z.object({
      status: z.literal("error"),
      payload: z.optional(z.null()),
      errors: z.optional(
        z.intersection(
          schema,
          z.object({
            form: z.optional(z.nullable(z.string())),
            global: z.optional(z.nullable(z.string())),
          })
        )
      ),
      // This sucks but I don't know how to do it better
    }) as unknown as S extends "error"
      ? ActionDataErrorSchema<T, Key>
      : ActionDataOkSchema<T, Key>;
  }
  return z.object({
    status: z.literal("ok"),
    payload: schema,
    errors: z.optional(z.null()),
  }) as S extends "error"
    ? ActionDataErrorSchema<T, Key>
    : ActionDataOkSchema<T, Key>;
}

export type ActionData<
  T extends z.ZodType,
  S extends "error" | "ok",
  Key extends string
> = S extends "error"
  ? ActionDataErrorSchema<T, Key>
  : ActionDataOkSchema<T, Key>;

export type RouteResponse<
  TSuccess extends z.ZodType,
  TError extends z.ZodType
> = z.infer<TSuccess> | z.infer<TError>;
