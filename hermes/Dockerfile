FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npx tsc -p tsconfig.json
RUN npm run build:widget
RUN npm prune --omit=dev

FROM node:20-alpine
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/widget ./widget
COPY --from=build /app/migrations ./migrations
COPY --from=build /app/fixtures ./fixtures
COPY --from=build /app/package.json ./
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh
EXPOSE 3000
HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1
ENTRYPOINT ["/docker-entrypoint.sh"]
