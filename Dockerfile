FROM node:14-alpine

WORKDIR /app
COPY package*.json ./

RUN apk add libxml2 libxslt git imagemagick python3 make g++
RUN npm install

COPY . .

RUN npx grunt prepare

EXPOSE 8080

CMD ["node", "server.js"]

