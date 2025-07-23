import type { Context } from "hono";

export const getRecordFunction =
  ({ name, description }: { name: string; description: string }) =>
  (c: Context, startTime: number) => {
    const duration = performance.now() - startTime;
    c.get("timing").record(name, duration, description);
  };
