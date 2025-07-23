import { afterAll, beforeAll } from "bun:test";
import { logger } from "src/utils/helpers/logger";
import { resetDb } from "./reset-db";

beforeAll(async () => {
	logger.updateConfig({ enabled: false });
	await resetDb();
});

afterAll(async () => {
	await resetDb();
});
