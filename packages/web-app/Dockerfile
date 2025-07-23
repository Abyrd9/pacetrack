FROM oven/bun:1-alpine AS base
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Copy the entire monorepo to handle workspace dependencies
COPY . .

# Install dependencies (including workspace dependencies)
RUN bun install

# Set environment variables (from railway)
ARG VITE_API_DOMAIN
RUN echo $VITE_API_DOMAIN

# Build the server application
WORKDIR /app/packages/web-app
RUN bunx vite build

# Expose port
EXPOSE 3000

# Start the application
WORKDIR /app/packages/web-app
CMD ["bun", "run", ".output/server/index.mjs"]