FROM node:22-slim

RUN npm install -g pnpm@10.33.0

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY lib/ lib/
COPY artifacts/ artifacts/
COPY scripts/ scripts/
COPY tsconfig.base.json tsconfig.json ./

RUN pnpm install --frozen-lockfile

# CMS base path: "/cms/" for Railway test domain, "/" for cms.yourdomain.com subdomain
ARG CMS_BASE_PATH=/cms/
ENV CMS_BASE_PATH=${CMS_BASE_PATH}

# Build each production artifact explicitly. The previous recursive workspace
# command also selected the root package, whose build script recursively ran
# the workspace build again. Explicit targets avoid that ambiguity and fail the
# image build if any runtime artifact is missing.
RUN pnpm run typecheck
RUN pnpm --filter @workspace/api-server run build \
    && pnpm --filter @workspace/cms run build \
    && pnpm --filter @workspace/tmh-platform run build \
    && test -f artifacts/api-server/dist/index.cjs \
    && test -f artifacts/cms/dist/public/index.html \
    && test -f artifacts/tmh-platform/dist/public/index.html

EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.cjs"]
