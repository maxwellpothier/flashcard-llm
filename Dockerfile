FROM node:20-slim

# Install curl
RUN apt-get update && apt-get install -y curl

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY server.js .

# Start Ollama + API (no model pull here)
CMD ["sh", "-c", "ollama serve & sleep 3 && node server.js"]

