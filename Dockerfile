FROM node:22-alpine
WORKDIR /app
COPY package.json server.js ./
COPY data/initial.json ./data/initial.json
COPY public/ ./public/
COPY scripts/ ./scripts/
EXPOSE 3000
CMD ["node", "server.js"]
