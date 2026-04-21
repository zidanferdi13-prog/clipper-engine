# Use ARM64-compatible base image
FROM node:18-alpine

# Set platform for multi-arch support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

# Install Python, FFmpeg, yt-dlp, and other dependencies
# Alpine packages are compiled for the target architecture
RUN apk add --no-cache \
    python3 \
    py3-pip \
    ffmpeg \
    gcc \
    g++ \
    musl-dev \
    python3-dev \
    && pip3 install --no-cache-dir yt-dlp

WORKDIR /app

# Install Node dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/raw /app/storage/audio /app/storage/clips /app/storage/thumbnails /app/storage/temp

CMD ["npm", "run", "dev"]
