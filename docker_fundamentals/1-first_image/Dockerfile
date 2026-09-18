# Base image: a small official Node.js image (Alpine Linux, ~50 MB).
FROM node:22-alpine

# All following instructions run from /app inside the image.
WORKDIR /app

# Copy the dependency manifest FIRST, on its own, so the npm install layer
# stays cached as long as package.json does not change.
COPY package*.json ./

# Install dependencies inside the image (never by hand on the host).
RUN npm install --omit=dev

# Now copy the application source code.
COPY . .

# Documents the port the app actually listens on (see PORT in app.js).
EXPOSE 3000

# The command that runs when a container starts from this image.
CMD ["node", "app.js"]
