FROM node:18-alpine

WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg

# Install yt-dlp
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Install Node dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/raw \
             /app/storage/audio \
             /app/storage/clips \
             /app/storage/thumbnails \
             /app/storage/temp

CMD ["node", "src/index.js"]

CMD ["npm", "run", "dev"]