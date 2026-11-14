# Production image: builds the React client and serves it from the Node API server.
FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY agent/package.json agent/
RUN npm ci
COPY client client
RUN npm run build -w client

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production PORT=3001
COPY package.json package-lock.json ./
COPY server/package.json server/
COPY client/package.json client/
COPY agent/package.json agent/
RUN npm ci --omit=dev -w server && npm cache clean --force
COPY server server
COPY --from=build /app/client/dist client/dist
USER node
EXPOSE 3001
HEALTHCHECK --interval=30s --timeout=5s CMD wget -qO- http://127.0.0.1:3001/api/config >/dev/null || exit 1
CMD ["node", "server/src/index.js"]
