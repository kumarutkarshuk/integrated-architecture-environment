FROM oven/bun:1.3.14 AS base
WORKDIR /app

FROM base AS deps
COPY package.json bun.lock* ./
COPY prisma ./prisma
RUN bun install --frozen-lockfile || bun install
RUN bunx prisma generate

FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bun run build

FROM base AS runner
ENV NODE_ENV=production
ENV HOST=0.0.0.0
COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY package.json ./
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh

EXPOSE 4000
ENTRYPOINT ["./docker-entrypoint.sh"]
