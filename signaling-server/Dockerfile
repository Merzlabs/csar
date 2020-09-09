
FROM node:alpine

COPY . .

RUN npm install --production

EXPOSE 3000

ENTRYPOINT ["npm", "start"]