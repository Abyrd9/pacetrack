import { afterAll, beforeAll } from "bun:test";
import { resetDb } from "./reset-db";

beforeAll(async () => {
  await resetDb();
});

afterAll(async () => {
  await resetDb();
});
