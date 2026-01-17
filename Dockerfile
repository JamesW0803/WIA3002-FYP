# [MANDATORY EXAM REQUIREMENT]
# Repository Link: https://github.com/JamesW0803/WIA3002-FYP

FROM node:18-alpine

WORKDIR /app

COPY backend/package.json ./

RUN npm install

COPY backend/ .

RUN rm -rf node_modules
RUN npm install

EXPOSE 5000

CMD ["node", "server.js"]