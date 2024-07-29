FROM node:18

WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy prisma directory
COPY prisma ./prisma

# Copy the rest of the application
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Copy the wait-for-it script
COPY wait-for-it.sh /wait-for-it.sh
RUN chmod +x /wait-for-it.sh

# Copy the start script
COPY start.sh /start.sh
RUN chmod +x /start.sh

EXPOSE 5000

# Use the start script as the entry point
CMD ["/start.sh"]