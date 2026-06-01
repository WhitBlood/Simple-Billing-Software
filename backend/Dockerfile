FROM node:18-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# This command installs the dependencies defined in package.json. The --omit=dev flag is not used here because we need the development dependencies to build the project.
RUN npm ci 
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package.json package-lock.json ./
# This command installs only the production dependencies, which are needed to run the application. The development dependencies are not included in the final image, which helps to reduce its size and improve security.
RUN npm ci --omit=dev 
# This copies the compiled JavaScript output from Stage 1 into Stage 2. The keyword --from=build means "take files from the first stage named build", not from your local machine.
COPY --from=build /app/dist ./dist 
EXPOSE 4000
CMD ["node", "dist/index.js"]
