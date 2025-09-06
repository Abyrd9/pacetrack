import type { App } from "../../index";

export interface TimingMetric {
  name: string;
  duration: number;
  description?: string;
}

declare module "hono" {
  interface ContextVariableMap {
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
