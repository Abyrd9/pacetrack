// Logger utility for consistent logging across the application
// Currently wraps console.log but provides a foundation for future enhancements

export interface LogContext {
	requestId?: string;
	userId?: string;
	tenantId?: string;
	[key: string]: any;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

// Add configuration interface
export interface LoggerConfig {
	enabled: boolean;
	level: LogLevel;
	categories: {
		enabled: boolean;
		include?: string[];
		exclude?: string[];
	};
	middleware: {
		enabled: boolean;
		include?: string[];
		exclude?: string[];
	};
}

class Logger {
	private config: LoggerConfig;

	constructor(config?: Partial<LoggerConfig>) {
		// Default configuration
		this.config = {
			enabled: process.env.LOGGING_ENABLED !== "false",
			level: (process.env.LOG_LEVEL as LogLevel) || "info",
			categories: {
				enabled: process.env.LOG_CATEGORIES_ENABLED !== "false",
				include: process.env.LOG_CATEGORIES_INCLUDE?.split(","),
				exclude: process.env.LOG_CATEGORIES_EXCLUDE?.split(","),
			},
			middleware: {
				enabled: process.env.LOG_MIDDLEWARE_ENABLED !== "false",
				include: process.env.LOG_MIDDLEWARE_INCLUDE?.split(","),
				exclude: process.env.LOG_MIDDLEWARE_EXCLUDE?.split(","),
			},
			...config,
		};
	}

	private shouldLog(level: LogLevel, category: string): boolean {
		if (!this.config.enabled) return false;

		// Check log level
		const levels: LogLevel[] = ["debug", "info", "warn", "error"];
		if (levels.indexOf(level) < levels.indexOf(this.config.level)) return false;

		// Check category filtering
		if (!this.config.categories.enabled) return false;

		if (this.config.categories.exclude?.includes(category)) return false;
		if (
			this.config.categories.include &&
			!this.config.categories.include.includes(category)
		)
			return false;

		return true;
	}

	private shouldLogMiddleware(category: string): boolean {
		if (!this.config.middleware.enabled) return false;

		if (this.config.middleware.exclude?.includes(category)) return false;
		if (
			this.config.middleware.include &&
			!this.config.middleware.include.includes(category)
		)
			return false;

		return true;
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
		if (!this.shouldLog(level, category)) return;

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
		if (!this.shouldLogMiddleware(category)) return;
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
		if (!this.shouldLogMiddleware(category)) return;
		this.error(category, message, { requestId, ...additionalContext }, error);
	}

	// Add method to update config at runtime
	updateConfig(newConfig: Partial<LoggerConfig>): void {
		this.config = { ...this.config, ...newConfig };
	}

	// Add method to get current config
	getConfig(): LoggerConfig {
		return { ...this.config };
	}
}

// Export a singleton instance
export const logger = new Logger();

// Export the class for testing or custom instances
export { Logger };
