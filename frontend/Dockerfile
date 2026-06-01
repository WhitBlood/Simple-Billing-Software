FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
RUN npm init -y && npm install express
COPY --from=build /app/dist ./dist
COPY server.js ./
EXPOSE 3000
CMD ["node", "server.js"]
