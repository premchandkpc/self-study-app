FROM node:20-alpine

WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm ci --omit=dev

# Copy source
COPY src/ ./src/
COPY data/ ./data/

EXPOSE 4000

CMD ["node", "src/index.js"]
