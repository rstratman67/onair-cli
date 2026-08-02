FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json tsconfig.json ./
COPY src ./src
COPY public ./public

RUN npm ci
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/package-lock.json ./
COPY --from=builder /app/bin ./bin
COPY --from=builder /app/dist ./dist

RUN npm ci --omit=dev

EXPOSE 8081
CMD ["node", "bin/server.js"]
