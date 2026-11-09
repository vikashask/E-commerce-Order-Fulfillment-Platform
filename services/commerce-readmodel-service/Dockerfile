FROM node:20-alpine AS build
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts
COPY tsconfig.json ./
COPY src/ src/
COPY migrations/ migrations/
RUN pnpm run build

FROM node:20-alpine
RUN corepack enable && corepack prepare pnpm@9 --activate
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --ignore-scripts --prod
COPY --from=build /app/dist dist/
COPY migrations/ migrations/
USER node
EXPOSE ${PORT}
CMD ["node", "dist/main.js"]
