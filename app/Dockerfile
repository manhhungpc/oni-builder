FROM node:22.12.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Expose Vite dev server port
EXPOSE 5170

# Configure Vite to listen on all interfaces
ENV HOST=0.0.0.0

# Start command is in docker-compose.yml