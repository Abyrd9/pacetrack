# Scripts

This directory contains utility scripts for the Pacetrack monorepo.

## check-updates.ts

A script to check for outdated packages across all `package.json` files in the `packages/` directory and update them inline.

### Usage

```bash
bun run check-updates
```

### What it does

1. Scans all `package.json` files in `packages/schema`, `packages/server`, and `packages/web-app`
2. Checks each dependency against the latest available version
3. Updates the version numbers in the `package.json` files while preserving version prefixes (^, ~, etc.)
4. Skips workspace dependencies (`workspace:*`)
5. Provides a summary of all updates made

### After running

After the script updates the package versions, run:

```bash
bun install
```

at the root of the project to install the updated packages.

### Features

- Preserves version prefixes (^, ~, >=, etc.)
- Handles dependencies, devDependencies, and peerDependencies
- Skips workspace dependencies
- Provides clear output showing what was updated
- Graceful error handling for packages that can't be checked

## check-updates-interactive.ts

An enhanced interactive version that uses `bun outdated` for accurate version detection and provides a beautiful TUI with checkboxes for package selection.

### Usage

```bash
bun run check-updates:interactive
```

### What it does

1. Uses `bun outdated --filter='*'` to get accurate version information from the registry
2. Parses the output to identify outdated packages across all workspaces
3. Displays a beautiful TUI with checkboxes for each package
4. Groups packages by workspace with clear headers
5. Updates only the selected packages while preserving version prefixes
6. Skips workspace dependencies (`workspace:*`)

### TUI Features

- **Workspace-by-workspace**: Each workspace is processed separately with its own selection interface
- **Clear workspace headers**: Shows the actual workspace name from Bun's output
- **Checkboxes**: Click space to toggle packages on/off within each workspace
- **Default selection**: All packages are checked by default
- **Clear version display**: Shows current → latest version with dependency type
- **Keyboard navigation**: Arrow keys to move, space to toggle, enter to confirm
- **Smart workspace inference**: Automatically maps workspace names to package.json paths

### Example interaction

```
🔍 Checking for outdated packages using bun outdated...

Found 2 outdated packages:

📦 pacetrack:
  • @biomejs/biome: 1.9.4 → ^2.1.2 (devDependencies)
✔ Select packages to update in pacetrack: › @biomejs/biome: 1.9.4 → ^2.1.2 (devDependencies)

📦 @pacetrack/app:
  • colord: 2.9.0 → ^2.9.3 (dependencies)
✔ Select packages to update in @pacetrack/app: › colord: 2.9.0 → ^2.9.3 (dependencies)
```

### After running

After the script updates the selected package versions, run:

```bash
bun install
```

at the root of the project to install the updated packages.

### Features

- **Native Bun integration**: Uses `bun outdated` for accurate version detection
- **Beautiful TUI**: Clean checkbox interface with workspace grouping
- **Smart parsing**: Automatically detects dependency types (dependencies, devDependencies, peerDependencies)
- **Workspace mapping**: Correctly maps workspace names to package.json paths
- **Preserves version prefixes**: Maintains ^, ~, >=, etc. in package.json
- **Error handling**: Graceful fallback if `bun outdated` fails
- **Default selection**: All packages checked by default for convenience 