import { parseZodFormData } from "@abyrd9/zod-form-data";
import { parseZodData } from "@abyrd9/zod-form-data";
import type { HonoRequest } from "hono";
import type { z } from "zod/v4";

export async function getParsedBody<Schema extends z.ZodType>(
  req: HonoRequest,
  schema: Schema
): Promise<
  | ReturnType<typeof parseZodData<Schema>>
  | ReturnType<typeof parseZodFormData<Schema>>
> {
  const contentType = req.header("Content-Type");

  if (contentType?.includes("multipart/form-data")) {
    const form = await req.formData();
    return parseZodFormData(form, {
      schema: schema,
    });
  }

  if (contentType?.includes("application/json")) {
    const json = await req.json();
    return parseZodData(json, {
      schema: schema,
    });
  }

  throw new Error("Unsupported content type");
}
