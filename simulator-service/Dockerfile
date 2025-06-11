# Stage 1: Build
# Use the specific Node.js version you're using
FROM --platform=linux/amd64 node:20.11.1-slim as builder

# Set the working directory
WORKDIR /app

# Copy package.json and yarn.lock
COPY package.json yarn.lock ./

# Install dependencies using yarn
RUN yarn install --frozen-lockfile

# Copy the rest of the application source code
COPY . .

# Build the TypeScript code
RUN yarn build

# Stage 2: Production
# Use a lightweight base image for the final container
FROM --platform=linux/amd64 node:20.11.1-slim

# Set the working directory
WORKDIR /app

# Copy the built application from the builder stage
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/yarn.lock ./yarn.lock

# Install only production dependencies
RUN yarn install --production --frozen-lockfile

# Environment variables
ENV TARGET_URL=http://ingest-service:8080/ingest
ENV AZURE_OPENAI_KEY=""
ENV AZURE_OPENAI_ENDPOINT=""
ENV AZURE_OPENAI_API_VERSION=""
ENV AZURE_OPENAI_DEPLOYMENT=""

# The command to run the application
CMD [ "node", "dist/index.js" ] 