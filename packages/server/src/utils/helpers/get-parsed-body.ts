import { parseZodData, parseZodFormData } from "@abyrd9/zod-form-data";
import type { HonoRequest } from "hono";
import type { z } from "zod/v4";
import { logger } from "./logger";

export async function getParsedBody<Schema extends z.ZodType>(
	req: HonoRequest,
	schema: Schema,
	requestId?: string,
): Promise<
	| ReturnType<typeof parseZodData<Schema>>
	| ReturnType<typeof parseZodFormData<Schema>>
> {
	const contentType = req.header("Content-Type");

	logger.info(
		"GET_PARSED_BODY",
		`Starting body parsing - Content-Type: ${contentType || "undefined"}`,
		{ requestId },
	);

	if (contentType?.includes("multipart/form-data")) {
		logger.info("GET_PARSED_BODY", "Parsing multipart/form-data", {
			requestId,
		});
		const form = await req.formData();
		const result = parseZodFormData(form, {
			schema: schema,
		});
		logger.info(
			"GET_PARSED_BODY",
			`Multipart parsing ${result.success ? "succeeded" : "failed"}`,
			{ requestId },
		);
		return result;
	}

	if (contentType?.includes("application/json")) {
		logger.info("GET_PARSED_BODY", "Parsing application/json", { requestId });
		const json = await req.json();
		const result = parseZodData(json, {
			schema: schema,
		});
		logger.info(
			"GET_PARSED_BODY",
			`JSON parsing ${result.success ? "succeeded" : "failed"}`,
			{ requestId },
		);
		return result;
	}

	logger.error("GET_PARSED_BODY", `Unsupported content type: ${contentType}`, {
		requestId,
	});
	throw new Error("Unsupported content type");
}
