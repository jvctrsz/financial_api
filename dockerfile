FROM node:24
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./

RUN npm ci
COPY . .

RUN npm run build

CMD ["npm", "run", "start:prod"]
