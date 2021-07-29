FROM node:lts-alpine as builder

WORKDIR /app

RUN apk add --no-cache make gcc g++ python3
COPY package.json package-lock.json ./

RUN npm ci --prod

FROM node:lts-alpine

WORKDIR /app

COPY --from=builder /app .
COPY . .

ENTRYPOINT ["npm", "run"]
CMD ["start"]
