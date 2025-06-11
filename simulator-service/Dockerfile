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

# Environment variables
ENV TARGET_URL=http://ingest-service:8080/ingest
ENV AZURE_OPENAI_KEY=""
ENV AZURE_OPENAI_ENDPOINT=""
ENV AZURE_OPENAI_API_VERSION=""
ENV AZURE_OPENAI_DEPLOYMENT=""

# Run the app when the container launches
CMD ["npm", "run", "serve"] 