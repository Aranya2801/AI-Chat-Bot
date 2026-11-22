FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
# the server only uses Node built-ins, so no node_modules needed at runtime
COPY --from=build /app/dist ./dist
COPY server ./server
COPY package.json ./
EXPOSE 8787
CMD ["node", "server/index.js"]
