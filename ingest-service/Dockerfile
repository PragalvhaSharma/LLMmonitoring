# Stage 1: Build
FROM node:20.11.1-slim as builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Stage 2: Production
FROM node:20.11.1-slim
WORKDIR /app

COPY --from=builder /app ./
RUN npm ci --omit=dev

EXPOSE 8080
CMD ["node", "dist/index.js"]
