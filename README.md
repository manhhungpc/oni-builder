# ONI Builders

Design your base in Oxygen not Included right on the web. It's fast, easy!

## Development

### Prerequisites

-   Node.js 18+ installed
-   MongoDB running locally or a MongoDB connection URL
-   Environment variables configured

### Manual setup

Create `.env` from `.env.example` in both server/ and app/ directory:

```bash
cp .env.example .env
```

#### Server

```bash
cd server
npm install

# Push database schema and generate client
npm run db:push
npm run db:generate

# Seed the database
npm run db:seed

#Start development server
npm run dev
```

The server will run on http://localhost:3003

#### App

```bash
cd app
npm install

# Start development server
npm run dev
```

The app will run on http://localhost:5170

### With docker

⚠️ WARNING: Docker with this project is unstable !!! (for now)

```bash
# Start all services
docker-compose up --build

# Start services in detached mode
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild specific service
docker-compose build server
docker-compose build app

# Run commands in containers
docker-compose exec server npm run db:seed
docker-compose exec app npm run build
```

## Resources

1. [OniExtract2024](https://github.com/cnctemaR/OniExtract2024): Export data from game Oxygen Not Included.

## Known issues

1. [Prisma needs to perform transactions, which requires your MongoDB server to be run as a replica set](https://github.com/prisma/prisma/discussions/18958)

    This happen when run seed, because Prisma will run bulk create, which run on transactions
