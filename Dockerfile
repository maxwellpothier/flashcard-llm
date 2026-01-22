FROM node:20-slim

# Install curl and zstd (required by Ollama installer)
RUN apt-get update && apt-get install -y curl zstd && rm -rf /var/lib/apt/lists/*

# Install Ollama
RUN curl -fsSL https://ollama.com/install.sh | sh

# Pre-pull the model during build
RUN ollama serve & sleep 5 && ollama pull llama3.2:3b; kill %1 || true

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm install

COPY server.js .

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Start Ollama + API
CMD ["sh", "-c", "ollama serve & sleep 3 && node server.js"]
