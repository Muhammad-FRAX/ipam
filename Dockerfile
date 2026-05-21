FROM node:20-alpine AS base

# Install python and make for some native dependencies (if any)
RUN apk add --no-cache python3 make g++

WORKDIR /usr/src/app

# Copy the monorepo config
COPY package*.json ./
COPY tsconfig.json ./

# Copy all packages and apps to get the package.json and tsconfig.json
COPY packages ./packages
COPY apps ./apps

# Install everything
RUN npm install

# Build packages using tsc directly since they don't have build scripts
RUN for dir in packages/*; do if [ -f "$dir/index.ts" ]; then npx tsc "$dir/index.ts"; fi; done

# Build everything (will use build script in root package.json if it exists, or we run loop)
RUN npm run build --workspaces --if-present

# Production image
FROM node:20-alpine AS production
WORKDIR /usr/src/app

ARG SERVICE_NAME

# We need the root node_modules for hoisted dependencies
COPY --from=base /usr/src/app/node_modules ./node_modules

# Overlay per-workspace node_modules (packages npm could not hoist, e.g. @nestjs/platform-express)
COPY --from=base /usr/src/app/apps/${SERVICE_NAME}/node_modules ./node_modules

# We need the built shared packages
COPY --from=base /usr/src/app/packages ./packages

# Copy the specific service dist and package.json
COPY --from=base /usr/src/app/apps/${SERVICE_NAME}/dist ./dist
COPY --from=base /usr/src/app/apps/${SERVICE_NAME}/package.json ./package.json

ENV NODE_ENV=production
ENV SERVICE_NAME=${SERVICE_NAME}

CMD ["node", "dist/main"]
