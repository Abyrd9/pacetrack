FROM oven/bun:1-alpine AS base
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy the entire monorepo to handle workspace dependencies
COPY . .

# Install dependencies (including workspace dependencies)
RUN bun install

# Build the server application
WORKDIR /app/packages/server
RUN bun run build

# Expose port
EXPOSE 4000

# Start the application
WORKDIR /app/packages/server
CMD ["bun", "run", "start"] 