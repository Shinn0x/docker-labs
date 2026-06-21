FROM node:20-alpine AS builder

WORKDIR /build-app

COPY package.json .

RUN npm install


FROM node:20-alpine

WORKDIR /app

COPY --from=builder /build-app/node_modules ./node_modules

COPY . .

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=3s --start-period=60s --start-interval=10s CMD node ./src/healthcheck.js

CMD ["npm", "start"]
