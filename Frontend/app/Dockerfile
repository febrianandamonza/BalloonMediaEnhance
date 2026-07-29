FROM node:20-slim AS builder
WORKDIR /app

# Copy root package files to satisfy local file:.. dependency if needed
COPY package*.json ./
COPY . .

# Run npm install with legacy-peer-deps to avoid strict dependency resolution failures
RUN npm install --legacy-peer-deps
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
