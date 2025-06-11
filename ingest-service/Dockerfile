# Use an official Node.js runtime as a parent image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install any needed packages
RUN npm install

# Copy the rest of the application's source code from your host to your image filesystem.
COPY . .

# Build TypeScript code
RUN npm run build

# Make port 8080 available to the world outside this container
EXPOSE 8080

# Run the app when the container launches
CMD ["npm", "run", "serve"] 