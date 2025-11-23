# Use Node.js 18 as base (your project uses Node 18)
FROM node:18-slim

# Install Python3 and FFmpeg
RUN apt-get update && \
    apt-get install -y python3 ffmpeg && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy package files first (for better caching)
COPY package*.json ./

# Install Node dependencies
RUN npm install --production

# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p /app/tmp/downloads /app/bin

# Expose the port (Railway will set PORT env variable)
EXPOSE 3000

# Start the application
CMD ["node", "server.js"]
