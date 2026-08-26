FROM oven/bun:1.3.14-alpine AS build

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run lint
RUN bun run typecheck

FROM oven/bun:1.3.14-alpine AS production

WORKDIR /app

COPY package.json bun.lock* ./
RUN bun install --production --frozen-lockfile

COPY --from=build /app/apps ./apps
COPY --from=build /app/tsconfig.json ./tsconfig.json

ARG GIT_SHA=unknown
ARG APP_VERSION=dev
ARG GIT_BRANCH=unknown
ARG BUILD_TIME=unknown
ARG SOURCE_URL=https://github.com/AlenHay/personal-roles-bot

LABEL org.opencontainers.image.revision=$GIT_SHA \
      org.opencontainers.image.version=$APP_VERSION \
      org.opencontainers.image.ref.name=$GIT_BRANCH \
      org.opencontainers.image.created=$BUILD_TIME \
      org.opencontainers.image.source=$SOURCE_URL

ENV GIT_SHA=$GIT_SHA \
    APP_VERSION=$APP_VERSION \
    GIT_BRANCH=$GIT_BRANCH \
    BUILD_TIME=$BUILD_TIME \
    NODE_ENV=production

# /app/data backs a named volume; pre-create it owned by the runtime user so a
# fresh volume inherits writable ownership (docker copies ownership from the
# image path on first mount).
RUN mkdir -p /app/data && chown bun:bun /app/data

USER bun

CMD ["bun", "apps/discord-gateway/src/index.ts"]
