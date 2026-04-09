FROM oven/bun:1 AS base
WORKDIR /app

# Install dependencies
COPY package.json bun.lock ./
COPY packages/shared/package.json packages/shared/
COPY packages/config/package.json packages/config/
COPY packages/server/package.json packages/server/
COPY packages/worker/package.json packages/worker/
RUN bun install --frozen-lockfile

# Copy source
COPY . .

# Server target
FROM base AS server
EXPOSE 3000
CMD ["bun", "run", "packages/server/src/index.ts"]

# Worker target
FROM base AS worker
CMD ["bun", "run", "packages/worker/src/index.ts"]
