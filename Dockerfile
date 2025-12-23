FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json .
RUN npm ci

COPY tsconfig.json vitest.config.ts ./
COPY src ./src
COPY prisma ./prisma
COPY test ./test

RUN npm run build
RUN npm prune --omit=dev

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

EXPOSE 3000
CMD ["node", "dist/index.js"]
