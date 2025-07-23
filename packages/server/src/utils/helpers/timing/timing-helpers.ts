import type { Context } from "hono";

/**
 * Utility functions for Server-Timing measurements
 */

/**
 * Measures the execution time of an async function and records it as a timing metric
 * @param c - Hono context
 * @param name - Metric name
 * @param fn - Async function to measure
 * @param description - Optional description for the metric
 * @returns The result of the function
 */
export async function measureAsync<T>(
  c: Context,
  name: string,
  fn: () => Promise<T>,
  description?: string
): Promise<T> {
  const startTime = performance.now();
  try {
    const result = await fn();
    const duration = performance.now() - startTime;
    c.get("timing").record(name, duration, description);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    c.get("timing").record(`${name}-error`, duration, description);
    throw error;
  }
}

/**
 * Measures the execution time of a sync function and records it as a timing metric
 * @param c - Hono context
 * @param name - Metric name
 * @param fn - Sync function to measure
 * @param description - Optional description for the metric
 * @returns The result of the function
 */
export function measureSync<T>(
  c: Context,
  name: string,
  fn: () => T,
  description?: string
): T {
  const startTime = performance.now();
  try {
    const result = fn();
    const duration = performance.now() - startTime;
    c.get("timing").record(name, duration, description);
    return result;
  } catch (error) {
    const duration = performance.now() - startTime;
    c.get("timing").record(`${name}-error`, duration, description);
    throw error;
  }
}

/**
 * Creates a timer that can be started and stopped manually
 * @param c - Hono context
 * @param name - Metric name
 * @param description - Optional description for the metric
 * @returns Object with start and stop methods
 */
export function createTimer(c: Context, name: string, description?: string) {
  let startTime: number | null = null;

  return {
    start: () => {
      startTime = performance.now();
    },
    stop: () => {
      if (startTime === null) {
        console.warn(`Timer "${name}" stopped without being started`);
        return;
      }
      const duration = performance.now() - startTime;
      c.get("timing").record(name, duration, description);
      startTime = null;
    },
  };
}

/**
 * Measures database query execution time
 * @param c - Hono context
 * @param queryName - Name for the query metric
 * @param queryFn - Database query function
 * @returns The result of the query
 */
export async function measureDatabaseQuery<T>(
  c: Context,
  queryName: string,
  queryFn: () => Promise<T>
): Promise<T> {
  return measureAsync(
    c,
    `db-${queryName}`,
    queryFn,
    `Database query: ${queryName}`
  );
}

/**
 * Measures external API call execution time
 * @param c - Hono context
 * @param apiName - Name for the API metric
 * @param apiCallFn - External API call function
 * @returns The result of the API call
 */
export async function measureApiCall<T>(
  c: Context,
  apiName: string,
  apiCallFn: () => Promise<T>
): Promise<T> {
  return measureAsync(
    c,
    `api-${apiName}`,
    apiCallFn,
    `External API call: ${apiName}`
  );
}
