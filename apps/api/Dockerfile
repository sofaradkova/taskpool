FROM node:20-alpine

RUN apk add --no-cache openssl

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable

WORKDIR /app

# Copy manifests only first (better layer caching)
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY apps/api/package.json ./apps/api/
COPY packages/db/package.json ./packages/db/
COPY packages/types/package.json ./packages/types/

RUN pnpm install --frozen-lockfile

# Copy source
COPY tsconfig.base.json ./
COPY apps/api/ ./apps/api/
COPY packages/db/ ./packages/db/
COPY packages/types/ ./packages/types/

# Build
RUN pnpm --filter @taskpool/types build
RUN pnpm --filter @taskpool/db build
RUN pnpm --filter @taskpool/db exec prisma generate
RUN pnpm --filter @taskpool/api build

EXPOSE 3001
CMD ["node", "apps/api/dist/index.js"]
