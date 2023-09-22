FROM node:20-alpine

# Add working directory in the docker container
WORKDIR /usr/src/app

# Add package file
COPY package*.json ./

# Install deps
RUN yarn install

# Copy source
COPY . .

# Build dist
RUN yarn run build

# Expose port 80
EXPOSE 80

CMD yarn run start
