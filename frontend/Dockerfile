# Use Node 20 image as base
FROM node:20-alpine

# Set working directory in container
WORKDIR /app

# Install bash for script execution
RUN apk add --no-cache bash

# Copy frontend package files
COPY package*.json ./

# Install frontend dependencies
RUN npm install

# Copy the rest of the frontend code
COPY . .

# In development mode, proxy API calls to the backend service
# In production, you would build and serve the static files

# Expose port 3000 (internal) that will be mapped to 5000
EXPOSE 3000

# Start the Next.js development server
CMD ["sh", "-c", "npx next dev -p 3000"]