# Stage 1 — build TypeScript
FROM node:22-alpine AS builder
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

# Stage 2 — production dependencies only
FROM node:22-alpine AS prod-deps
RUN npm install -g pnpm
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Stage 3 — Lambda image
FROM public.ecr.aws/lambda/nodejs:22
COPY --from=builder   /app/dist         ${LAMBDA_TASK_ROOT}/dist
COPY --from=prod-deps /app/node_modules ${LAMBDA_TASK_ROOT}/node_modules
CMD ["dist/lambda.handler"]
