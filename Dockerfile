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
RUN pnpm run typecheck && pnpm -r --filter="!./artifacts/mockup-sandbox" --if-present run build

EXPOSE 3000
CMD ["node", "artifacts/api-server/dist/index.cjs"]
