# Stage 1: Dependencies
FROM node:20-slim AS deps
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/web/package.json ./apps/web/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile


# Stage 2: Builder
FROM node:20-slim AS builder
WORKDIR /repo

RUN corepack enable && corepack prepare pnpm@9.4.0 --activate

COPY --from=deps /root/.local/share/pnpm/store /root/.local/share/pnpm/store
COPY --from=deps /repo/node_modules ./node_modules
COPY --from=deps /repo/apps/web/node_modules ./apps/web/node_modules

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY tsconfig.base.json ./
COPY packages/types ./packages/types
COPY apps/web ./apps/web

RUN pnpm --filter @taskpool/types build
RUN pnpm --filter @taskpool/web build


# Stage 3: Runner — Next.js standalone output
FROM gcr.io/distroless/nodejs20-debian12
WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /repo/apps/web/.next/standalone ./
COPY --from=builder /repo/apps/web/.next/static     ./apps/web/.next/static
COPY --from=builder /repo/apps/web/public           ./apps/web/public

EXPOSE 3000

CMD ["apps/web/server.js"]
