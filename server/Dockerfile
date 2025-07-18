FROM node:22.12.0-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Create directories for mounted volumes
RUN mkdir -p /data /shared

# Expose port
EXPOSE 3003

# Start command is in docker-compose.yml