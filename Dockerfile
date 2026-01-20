# Repository: https://github.com/NKHon831/WIA3002-FYP

# Use Node.js official image as Base Image
FROM node:20

# Set working directory inside container
WORKDIR /app

# Copy only backend package files first
COPY backend/package*.json ./backend/

# Install backend dependencies
WORKDIR /app/backend
RUN npm install

# Copy the rest of the backend files
COPY backend/ ./ 

# Expose backend port
EXPOSE 5000

# Define the run command
CMD ["npm", "start"]
