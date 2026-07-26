# Multi-stage build for deploying the Next.js app (frontend + API routes) to a
# container platform (Render, Railway, Fly.io) as an alternative to Vercel.
# Relies on `output: "standalone"` in next.config.ts to produce a minimal runtime bundle.

FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# MONGODB_URI is read at import time by src/lib/mongoose.ts, so a placeholder is needed
# for `next build` to succeed even though it's not used until the app actually runs.
ENV MONGODB_URI=mongodb://placeholder:27017/build
ENV JWT_SECRET=placeholder-build-secret
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
