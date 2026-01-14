# Use official Node.js runtime as base image
FROM node:22

# Set working directory inside container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json (if available)
# This is done before copying the entire codebase to leverage Docker cache layers
COPY package*.json ./

RUN npm install

# Copy application code
COPY . .

# Expose port (should match the port your app listens on)
EXPOSE 5000

# Start the application
CMD ["node", "server.js"]