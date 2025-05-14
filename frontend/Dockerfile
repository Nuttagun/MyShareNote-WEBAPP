# Use Node base image (แทนที่ Bun ด้วย Node)
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies with npm
COPY package.json package-lock.json ./ 
RUN npm install

# Copy the rest of the app
COPY . .

# Expose port 5173 (ถ้าใช้ Vite)
EXPOSE 5173

# Start Vite dev server with npm
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]