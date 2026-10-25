# syntax=docker/dockerfile:1

FROM node:20-alpine AS deps
WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

FROM node:20-alpine AS builder
WORKDIR /app

# Install git and git-lfs for binary assets
RUN apk add --no-cache git git-lfs && git lfs install

COPY --from=deps /app/node_modules ./node_modules
COPY package*.json ./

COPY . .

# Ensure LFS files are pulled if the build context only had pointers
RUN if [ -d .git ]; then git lfs pull; fi

ARG NODE_ENV=production

# NEXT_PUBLIC_* values are inlined into the browser bundle at build time, so
# they must be present here and not only at runtime. A whitelabel image built
# without NEXT_PUBLIC_WHITELABEL_MODE=true still redirects to nulink-root SSO.
ARG NEXT_PUBLIC_WHITELABEL_MODE
ARG NEXT_PUBLIC_API_URL

ENV NODE_ENV=${NODE_ENV}
ENV NEXT_TELEMETRY_DISABLED=1
ENV NEXT_PUBLIC_WHITELABEL_MODE=${NEXT_PUBLIC_WHITELABEL_MODE}
ENV NEXT_PUBLIC_API_URL=${NEXT_PUBLIC_API_URL}

# The partner API key and demo credentials are read at runtime, never baked in.
# Pass them to `docker run` / the container platform as plain env vars.
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

RUN chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
