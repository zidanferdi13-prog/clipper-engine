FROM node:18-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    ffmpeg \
    curl \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Install Deno (default JS runtime yt-dlp uses for YouTube n/sig challenge solving)
RUN curl -fsSL https://github.com/denoland/deno/releases/latest/download/deno-x86_64-unknown-linux-gnu.zip \
      -o /tmp/deno.zip \
    && unzip -q /tmp/deno.zip -d /usr/local/bin \
    && chmod +x /usr/local/bin/deno \
    && rm /tmp/deno.zip

# Install yt-dlp
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Install Node dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Copy source code
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/raw \
             /app/storage/audio \
             /app/storage/clips \
             /app/storage/thumbnails \
             /app/storage/temp

CMD ["node", "src/index.js"]