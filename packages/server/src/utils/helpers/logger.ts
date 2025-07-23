// Logger utility for consistent logging across the application

export type LogContext = {
	requestId?: string;
	userId?: string;
	tenantId?: string;
	[key: string]: any;
};

export type LogLevel = "debug" | "info" | "warn" | "error";

const LOG_LEVELS: LogLevel[] = ["debug", "info", "warn", "error"];

class Logger {
	private minLevel: LogLevel;

	constructor() {
		// Only one env var: LOG_LEVEL (defaults to "info")
		// Set to "debug" for verbose logging, "warn" or "error" for less
		this.minLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
	}

	private shouldLog(level: LogLevel): boolean {
		return LOG_LEVELS.indexOf(level) >= LOG_LEVELS.indexOf(this.minLevel);
	}

	private formatMessage(
		level: LogLevel,
		category: string,
		message: string,
		context?: LogContext,
	): string {
		const timestamp = new Date().toISOString();
		const requestId = context?.requestId ? `[${context.requestId}]` : "";
		const userId = context?.userId ? `[User:${context.userId}]` : "";
		const tenantId = context?.tenantId ? `[Tenant:${context.tenantId}]` : "";

		const contextStr = [requestId, userId, tenantId].filter(Boolean).join(" ");

		return `[${timestamp}] [${level.toUpperCase()}] [${category}] ${contextStr} ${message}`;
	}

	private log(
		level: LogLevel,
		category: string,
		message: string,
		context?: LogContext,
		...args: any[]
	): void {
		if (!this.shouldLog(level)) return;

		const formattedMessage = this.formatMessage(
			level,
			category,
			message,
			context,
		);

		switch (level) {
			case "debug":
				console.log(formattedMessage, ...args);
				break;
			case "info":
				console.log(formattedMessage, ...args);
				break;
			case "warn":
				console.warn(formattedMessage, ...args);
				break;
			case "error":
				console.error(formattedMessage, ...args);
				break;
		}
	}

	debug(
		category: string,
		message: string,
		context?: LogContext,
		...args: any[]
	): void {
		this.log("debug", category, message, context, ...args);
	}

	info(
		category: string,
		message: string,
		context?: LogContext,
		...args: any[]
	): void {
		this.log("info", category, message, context, ...args);
	}

	warn(
		category: string,
		message: string,
		context?: LogContext,
		...args: any[]
	): void {
		this.log("warn", category, message, context, ...args);
	}

	error(
		category: string,
		message: string,
		context?: LogContext,
		...args: any[]
	): void {
		this.log("error", category, message, context, ...args);
	}

	// Convenience method for middleware logging
	middleware(
		category: string,
		message: string,
		requestId: string,
		additionalContext?: Omit<LogContext, "requestId">,
	): void {
		this.info(category, message, { requestId, ...additionalContext });
	}

	// Convenience method for error logging in middleware
	middlewareError(
		category: string,
		message: string,
		requestId: string,
		error?: any,
		additionalContext?: Omit<LogContext, "requestId">,
	): void {
		this.error(category, message, { requestId, ...additionalContext }, error);
	}
}

// Export a singleton instance
export const logger = new Logger();

// Export the class for testing or custom instances
export { Logger };
