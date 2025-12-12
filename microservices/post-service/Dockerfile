FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm install --production
RUN npx prisma generate

COPY . .

EXPOSE 3002

CMD ["sh", "-c", "npx prisma migrate deploy && node src/app.js"]
