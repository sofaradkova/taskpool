# Stage 1: Builder
FROM node:20-slim AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

# Copy workspace manifests first for better layer caching
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# Copy all source
COPY tsconfig.base.json ./
COPY apps/api ./apps/api
COPY packages/db ./packages/db
COPY packages/types ./packages/types

# Generate Prisma client, then build packages in dependency order
RUN pnpm --filter @taskpool/db exec prisma generate
RUN pnpm --filter @taskpool/types build
RUN pnpm --filter @taskpool/db build
RUN pnpm --filter @taskpool/api build

# Create a self-contained production bundle (resolves workspace deps, no symlinks)
RUN pnpm deploy --filter @taskpool/api --prod /app/deploy

# pnpm deploy copies package files but not the compiled dist — copy it explicitly
RUN cp -r /repo/apps/api/dist /app/deploy/dist

# Workspace packages land in node_modules as their built state; copy their dists
RUN cp -r /repo/packages/types/dist /app/deploy/node_modules/@taskpool/types/dist
RUN cp -r /repo/packages/db/dist    /app/deploy/node_modules/@taskpool/db/dist

# Copy the generated Prisma client into the deploy bundle
RUN cp -r /repo/node_modules/.prisma /app/deploy/node_modules/.prisma


# Stage 2: Distroless — no shell, minimal attack surface
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app

COPY --from=builder /app/deploy/node_modules ./node_modules
COPY --from=builder /app/deploy/dist         ./dist

EXPOSE 3001

# distroless ENTRYPOINT is /nodejs/bin/node; CMD provides the script argument
CMD ["dist/index.js"]
