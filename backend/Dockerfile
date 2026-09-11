FROM node:22-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source code and Prisma schema
COPY tsconfig*.json nest-cli.json ./
COPY prisma ./prisma
COPY src ./src

# Generate Prisma Client & Build NestJS
RUN npx prisma generate
RUN npm run build

# Production Runner stage
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY prisma ./prisma
RUN npx prisma generate

COPY --from=builder /app/dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
