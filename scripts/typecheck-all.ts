#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync } from "fs";
import path from "path";

// Package directories to check
const packages = ["packages/schema", "packages/server", "packages/web-app"];

interface TypecheckResult {
	package: string;
	success: boolean;
	output: string;
	errorFiles: string[];
	errorCount: number;
}

async function runTypecheck(packagePath: string): Promise<TypecheckResult> {
	const fullPath = path.resolve(packagePath);
	const tsconfigPath = path.join(fullPath, "tsconfig.json");

	if (!existsSync(tsconfigPath)) {
		return {
			package: packagePath,
			success: false,
			output: `❌ No tsconfig.json found in ${packagePath}`,
			errorFiles: [],
			errorCount: 0,
		};
	}

	console.log(`🔍 Checking ${packagePath}...`);

	try {
		const proc = spawn({
			cmd: ["bun", "x", "tsc", "--noEmit"],
			cwd: fullPath,
			stdout: "pipe",
			stderr: "pipe",
		});

		const output = await new Response(proc.stdout).text();
		const errors = await new Response(proc.stderr).text();
		const exitCode = await proc.exited;

		const fullOutput = (output + errors).trim();

		// Parse error files and count
		const errorFiles = new Set<string>();
		let errorCount = 0;

		if (fullOutput) {
			// Match TypeScript error patterns like: src/file.ts(line,col): error TS####:
			const errorMatches = fullOutput.match(
				/([^(\s]+\.ts)\(\d+,\d+\): error TS\d+:/g,
			);
			if (errorMatches) {
				errorMatches.forEach((match) => {
					const fileMatch = match.match(/([^(\s]+\.ts)/);
					if (fileMatch) {
						errorFiles.add(fileMatch[1]);
					}
				});
				errorCount = errorMatches.length;
			}
		}

		return {
			package: packagePath,
			success: exitCode === 0,
			output:
				fullOutput ||
				(exitCode === 0 ? "✅ No type errors" : "❌ Type check failed"),
			errorFiles: Array.from(errorFiles),
			errorCount,
		};
	} catch (error) {
		return {
			package: packagePath,
			success: false,
			output: `❌ Failed to run typecheck: ${error}`,
			errorFiles: [],
			errorCount: 0,
		};
	}
}

async function main() {
	console.log("🚀 Running TypeScript checks across all packages...\n");

	const results: TypecheckResult[] = [];
	let hasErrors = false;

	// Run typechecks sequentially for cleaner output
	for (const pkg of packages) {
		const result = await runTypecheck(pkg);
		results.push(result);

		if (!result.success) {
			hasErrors = true;
		}
	}

	// Print clean summary
	console.log(`\n${"=".repeat(50)}`);
	console.log("📊 TYPECHECK SUMMARY");
	console.log("=".repeat(50));

	for (const result of results) {
		const status = result.success ? "✅" : "❌";
		const errorInfo = result.success
			? ""
			: ` (${result.errorCount} errors in ${result.errorFiles.length} files)`;

		console.log(`${status} ${result.package}${errorInfo}`);

		// Show only the files with errors, not the full error messages
		if (!result.success && result.errorFiles.length > 0) {
			console.log("   📁 Files with errors:");
			result.errorFiles.forEach((file) => {
				console.log(`      • ${file}`);
			});
			console.log("");
		}
	}

	const passCount = results.filter((r) => r.success).length;
	const totalCount = results.length;
	const totalErrors = results.reduce((sum, r) => sum + r.errorCount, 0);

	console.log(`📈 Results: ${passCount}/${totalCount} packages passed`);
	if (totalErrors > 0) {
		console.log(`🚨 Total: ${totalErrors} TypeScript errors found`);
	}

	if (hasErrors) {
		console.log(
			"\n💡 Tip: Run individual package typecheck to see full error details:",
		);
		for (const result of results) {
			if (!result.success) {
				console.log(`   cd ${result.package} && bun x tsc --noEmit`);
			}
		}
		process.exit(1);
	} else {
		console.log("🎉 All packages passed type checking!");
		process.exit(0);
	}
}

main().catch((error) => {
	console.error("💥 Script failed:", error);
	process.exit(1);
});
