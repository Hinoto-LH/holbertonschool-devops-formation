FROM node:22-alpine

WORKDIR /app

# Dependency manifest first, so the install layer stays cached.
COPY package*.json ./
RUN npm install --omit=dev

COPY . .

EXPOSE 3000

CMD ["node", "index.js"]
