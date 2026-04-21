# Use ARM64-compatible base image
FROM node:18-alpine

# Set platform for multi-arch support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /app

# Install system dependencies in SEPARATE steps to reduce memory usage
# Critical for Raspberry Pi ARM64
RUN apk add --no-cache python3

RUN apk add --no-cache py3-pip

RUN apk add --no-cache ffmpeg

# Install yt-dlp separately to avoid memory issues
RUN pip3 install --no-cache-dir --break-system-packages yt-dlp

# Install Node dependencies
COPY package*.json ./
RUN npm install --prefer-offline --no-audit

# Copy source code
COPY . .

# Create storage directories
RUN mkdir -p /app/storage/raw /app/storage/audio /app/storage/clips /app/storage/thumbnails /app/storage/temp

CMD ["npm", "run", "dev"]