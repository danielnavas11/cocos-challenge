FROM node:22.13.0-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY src/ ./src
COPY tsconfig*.json ./
COPY nest-cli*.json ./
RUN npm install


RUN npm run build

FROM node:22.13.0-alpine

WORKDIR /app

COPY --from=builder /app/dist ./
COPY --from=builder /app/package*.json ./
RUN npm install --production

USER node

EXPOSE 8080
CMD ["node", "main"]
