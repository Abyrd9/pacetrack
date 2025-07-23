import type { App } from "../../index";
import { logger } from "../helpers/logger";

export type TimingMetric = {
	name: string;
	duration: number;
	description?: string;
};

declare module "hono" {
	interface ContextVariableMap {
		request_id: string;
		timing: {
			startTime: number;
			metrics: TimingMetric[];
			start: (name: string, description?: string) => () => void;
			record: (name: string, duration: number, description?: string) => void;
		};
	}
}

/**
 * Server-Timing middleware for Hono
 * Adds Server-Timing header to responses with performance metrics
 * Provides utilities to measure timing of operations within request lifecycle
 */
export function serverTimingMiddleware(app: App) {
	app.use("*", async (c, next) => {
		const startTime = performance.now();
		const metrics: TimingMetric[] = [];

		const requestId = Math.random().toString(36).substring(7);
		c.set("request_id", requestId);

		logger.middleware("REQUEST", "Starting request", requestId, {
			path: c.req.path,
		});

		c.set("timing", {
			startTime,
			metrics,
			start: (name: string, description?: string) => {
				const timerStart = performance.now();
				return () => {
					const duration = performance.now() - timerStart;
					metrics.push({ name, duration, description });
				};
			},
			record: (name: string, duration: number, description?: string) => {
				metrics.push({ name, duration, description });
			},
		});

		await next();

		if (c.res.status >= 400) {
			logger.middlewareError(
				"REQUEST",
				"Request failed",
				requestId,
				undefined,
				{
					path: c.req.path,
					status: c.res.status,
					error: c.res.statusText,
				},
			);
		}

		const totalDuration = performance.now() - startTime;
		metrics.push({
			name: "total",
			duration: totalDuration,
			description: "Total request duration",
		});

		// Format header to fit with Server-Timing spec
		const header = metrics
			.map((metric) => {
				const parts = [`${metric.name};dur=${metric.duration.toFixed(2)}`];
				if (metric.description) {
					parts.push(`desc="${metric.description.replace(/"/g, '\\"')}"`);
				}
				return parts.join(";");
			})
			.join(", ");

		// Add Server-Timing header to response
		c.header("Server-Timing", header);
	});
}
