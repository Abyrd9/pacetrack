#!/usr/bin/env bun

import { execSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import prompts from "prompts";

interface PackageJson {
	name: string;
	dependencies?: Record<string, string>;
	devDependencies?: Record<string, string>;
	peerDependencies?: Record<string, string>;
}

interface OutdatedPackage {
	package: string;
	current: string;
	update: string;
	latest: string;
	workspace: string;
	dependencyType: "dependencies" | "devDependencies" | "peerDependencies";
}

interface PackageUpdate {
	packageName: string;
	currentVersion: string;
	latestVersion: string;
	dependencyType: "dependencies" | "devDependencies" | "peerDependencies";
	packagePath: string;
	workspace: string;
}

function parseBunOutdated(output: string): OutdatedPackage[] {
	const lines = output.trim().split("\n");
	const packages: OutdatedPackage[] = [];

	// Debug output removed for cleaner experience

	// Skip header lines and table borders
	for (const line of lines) {
		// Skip table borders and headers
		if (
			line.includes("┌─") ||
			line.includes("├─") ||
			line.includes("└─") ||
			line.includes("│ Package") ||
			line.includes("| Package") ||
			line.includes("bun outdated") ||
			line.includes("---") ||
			line.match(/^[|┌├└─]+$/)
		) {
			continue;
		}

		// Parse package lines - handle both │ and | characters
		const match = line.match(
			/[|│]\s*([^|│]+?)\s*[|│]\s*([^|│]+?)\s*[|│]\s*([^|│]+?)\s*[|│]\s*([^|│]+?)\s*[|│]\s*([^|│]+?)\s*[|│]/,
		);
		if (match) {
			const [, packageName, current, update, latest, workspace] = match.map(
				(s) => s.trim(),
			);

			// Debug output removed for cleaner experience

			// Determine dependency type based on package name
			let dependencyType:
				| "dependencies"
				| "devDependencies"
				| "peerDependencies" = "dependencies";
			if (packageName.includes(" (dev)")) {
				dependencyType = "devDependencies";
			} else if (packageName.includes(" (peer)")) {
				dependencyType = "peerDependencies";
			}

			// Clean up package name
			const cleanPackageName = packageName
				.replace(/\s*\(dev\)\s*/, "")
				.replace(/\s*\(peer\)\s*/, "");

			packages.push({
				package: cleanPackageName,
				current,
				update,
				latest,
				workspace,
				dependencyType,
			});
		}
	}

	return packages;
}

function getWorkspacePath(workspaceName: string): string {
	// Infer the path from the workspace name
	if (workspaceName === "pacetrack") {
		return "package.json"; // Root package.json
	}
	if (workspaceName.startsWith("@pacetrack/")) {
		const packageName = workspaceName.replace("@pacetrack/", "");
		// Handle special case where package name doesn't match directory name
		if (packageName === "app") {
			return "packages/web-app";
		}
		return `packages/${packageName}`;
	}
	return workspaceName;
}

async function updatePackageJson(
	filePath: string,
	updates: PackageUpdate[],
): Promise<void> {
	const content = readFileSync(filePath, "utf8");
	const pkg: PackageJson = JSON.parse(content);
	let updated = false;

	for (const update of updates) {
		const deps = pkg[update.dependencyType];
		if (deps?.[update.packageName]) {
			// Preserve the original prefix (^, ~, etc.)
			const originalPrefix =
				deps[update.packageName].match(/^[\^~>=<]+/)?.[0] || "^";
			deps[update.packageName] = `${originalPrefix}${update.latestVersion}`;
			updated = true;

			console.log(
				`  ✓ Updated ${update.packageName}: ${update.currentVersion} → ${originalPrefix}${update.latestVersion}`,
			);
		}
	}

	if (updated) {
		writeFileSync(filePath, `${JSON.stringify(pkg, null, 2)}\n`);
		console.log(`  📝 Updated ${filePath}`);
	}
}

async function main() {
	console.log("🔍 Checking for outdated packages using bun outdated...\n");

	try {
		// Get outdated packages using bun outdated
		const result = execSync("bun outdated --filter='*'", {
			encoding: "utf8",
			stdio: ["pipe", "pipe", "pipe"],
		});

		const outdatedPackages = parseBunOutdated(result);

		if (outdatedPackages.length === 0) {
			console.log("✨ All packages are already up to date!");
			return;
		}

		console.log(`Found ${outdatedPackages.length} outdated packages:\n`);

		// Group packages by workspace
		const workspaceGroups = new Map<string, OutdatedPackage[]>();
		for (const pkg of outdatedPackages) {
			if (!workspaceGroups.has(pkg.workspace)) {
				workspaceGroups.set(pkg.workspace, []);
			}
			const group = workspaceGroups.get(pkg.workspace);
			if (group) {
				group.push(pkg);
			}
		}

		// Process each workspace separately
		const allSelectedUpdates: PackageUpdate[] = [];

		for (const [workspace, packages] of workspaceGroups) {
			console.log(`\n📦 ${workspace}:`);
			for (const pkg of packages) {
				const prefix = pkg.current.match(/^[\^~>=<]+/)?.[0] || "^";
				console.log(
					`  • ${pkg.package}: ${pkg.current} → ${prefix}${pkg.latest} (${pkg.dependencyType})`,
				);
			}

			// Create choices for this workspace
			const choices: Array<{
				title: string;
				value: string;
				selected?: boolean;
			}> = [];

			for (const pkg of packages) {
				const prefix = pkg.current.match(/^[\^~>=<]+/)?.[0] || "^";
				choices.push({
					title: `${pkg.package}: ${pkg.current} → ${prefix}${pkg.latest} (${pkg.dependencyType})`,
					value: `${pkg.package}:${pkg.dependencyType}`,
					selected: true, // Default to checked
				});
			}

			// Show interactive TUI for this workspace
			const response = await prompts({
				type: "multiselect",
				name: "selectedPackages",
				message: `Select packages to update in ${workspace}:`,
				choices,
				hint: "Space to toggle, Enter to confirm",
				instructions: false,
			});

			if (response.selectedPackages && response.selectedPackages.length > 0) {
				// Convert selected choices to updates for this workspace
				for (const selected of response.selectedPackages) {
					const [packageName, dependencyType] = selected.split(":");

					// Find the original package
					const pkg = packages.find(
						(p) =>
							p.package === packageName && p.dependencyType === dependencyType,
					);

					if (pkg) {
						const workspacePath = getWorkspacePath(pkg.workspace);
						const packageJsonPath =
							workspacePath === "package.json"
								? join(process.cwd(), "package.json")
								: join(process.cwd(), workspacePath, "package.json");

						allSelectedUpdates.push({
							packageName: pkg.package,
							currentVersion: pkg.current,
							latestVersion: pkg.latest,
							dependencyType: pkg.dependencyType as
								| "dependencies"
								| "devDependencies"
								| "peerDependencies",
							packagePath: packageJsonPath,
							workspace: pkg.workspace,
						});
					}
				}
			}
		}

		if (allSelectedUpdates.length === 0) {
			console.log("\n👋 No packages selected for update.");
			return;
		}

		// Group selected updates by file
		const updatesByFile = new Map<string, PackageUpdate[]>();
		for (const update of allSelectedUpdates) {
			if (!updatesByFile.has(update.packagePath)) {
				updatesByFile.set(update.packagePath, []);
			}
			const fileUpdates = updatesByFile.get(update.packagePath);
			if (fileUpdates) {
				fileUpdates.push(update);
			}
		}

		// Apply updates
		console.log("\n🔄 Applying selected updates...\n");
		let totalUpdated = 0;

		for (const [filePath, updates] of updatesByFile) {
			const workspaceName = updates[0]?.workspace || "unknown";
			console.log(`📦 Updating ${workspaceName}/package.json:`);
			await updatePackageJson(filePath, updates);
			totalUpdated += updates.length;
			console.log("");
		}

		console.log(`🎉 Updated ${totalUpdated} packages!`);
		console.log(
			"💡 Run 'bun install' at the root to install the updated packages.",
		);
	} catch (error) {
		console.error("❌ Error running bun outdated:", error);
		console.log("Falling back to manual package checking...");
	}
}

main().catch(console.error);
