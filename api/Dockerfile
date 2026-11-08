# Build context is the repo root: the api compiles ../shared into dist/shared.
FROM node:24-alpine AS build

WORKDIR /app

RUN npm install -g pnpm

COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml api/
COPY shared/package.json shared/pnpm-lock.yaml shared/pnpm-workspace.yaml shared/
RUN pnpm -C api install --frozen-lockfile --ignore-scripts \
	&& pnpm -C shared install --frozen-lockfile --ignore-scripts

COPY api/ api/
COPY shared/ shared/
RUN pnpm -C api build

FROM node:24-alpine AS deps

WORKDIR /app

RUN npm install -g pnpm

COPY api/package.json api/pnpm-lock.yaml api/pnpm-workspace.yaml api/
COPY shared/package.json shared/pnpm-lock.yaml shared/pnpm-workspace.yaml shared/
RUN pnpm -C api install --frozen-lockfile --prod --ignore-scripts \
	&& pnpm -C shared install --frozen-lockfile --prod --ignore-scripts

FROM node:24-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV TZ=UTC

COPY api/package.json ./
COPY --from=deps /app/api/node_modules ./node_modules
COPY --from=build /app/api/dist ./dist
# dist/shared resolves its own deps (zod) from here
COPY --from=deps /app/shared/node_modules ./dist/shared/node_modules

EXPOSE 8115

CMD ["node", "dist/api/src/server.js"]
