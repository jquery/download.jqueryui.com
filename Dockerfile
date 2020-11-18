FROM node:current-alpine

WORKDIR /app
COPY package*.json ./

RUN apk add libxml2 libxslt git imagemagick python3 make g++
RUN npm install
RUN npm install -g grunt-cli grunt modern-syslog

COPY . .

RUN grunt prepare

RUN test -e /var/run || ln -s /run /var/run

EXPOSE 8080

CMD ["node", "server.js"]

