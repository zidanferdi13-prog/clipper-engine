FROM node:18-alpine

# Install Python, FFmpeg, yt-dlp, and other dependencies
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    && pip3 install yt-dlp openai-whisper

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/raw /app/storage/audio /app/storage/clips /app/storage/thumbnails /app/storage/temp

CMD ["npm", "run", "dev"]
