
FROM node:alpine

COPY . .

RUN npm install --production

EXPOSE 80

ENTRYPOINT ["npm", "start"]