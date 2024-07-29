#!/bin/sh

# Wait for the database to be ready
/app/wait-for-it.sh db:5432 -t 60

# Run Prisma migrations
npx prisma migrate deploy

# Start the application
npm start