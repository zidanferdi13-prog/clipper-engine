# Use ARM64-compatible base image
FROM node:18-alpine

# Set platform for multi-arch support
ARG TARGETPLATFORM
ARG BUILDPLATFORM

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
