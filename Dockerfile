# syntax=docker/dockerfile:1

FROM node:24-bookworm-slim AS builder

ARG PNPM_VERSION=12.16.1

WORKDIR /app

RUN npm install --global "pnpm@${PNPM_VERSION}"

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/calculation-engine/package.json packages/calculation-engine/package.json
COPY packages/database/package.json packages/database/package.json
COPY packages/shared-types/package.json packages/shared-types/package.json
COPY packages/validation/package.json packages/validation/package.json

RUN pnpm install --frozen-lockfile

COPY apps ./apps
COPY packages ./packages

RUN pnpm build


FROM node:24-bookworm-slim AS runtime

ENV NODE_ENV=production \
    API_PORT=3130

WORKDIR /app

# Source dan dependency migration dipertahankan agar migration dapat
# dijalankan melalui container yang sama sebelum aplikasi diperbarui.

COPY --from=builder --chown=node:node /app /app

USER node

EXPOSE 3130

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD ["node", "-e", "fetch('http://127.0.0.1:3130/api/health').then(r => { if (!r.ok) process.exit(1) }).catch(() => process.exit(1))"]

# Lewati docker-entrypoint.sh bawaan image Node karena sebagian runtime
# container terbatas tidak mengizinkan eksekusi shell script entrypoint.
ENTRYPOINT ["node"]
CMD ["apps/api/dist/main.js"]