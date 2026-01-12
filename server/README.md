# Server

## Sync schema:

```bash
npm run db:push
```

## Database Seeding

To populate the database with building data, use the seed command:

```bash
# Default - upserts from data/database_base/building.json (updates existing, adds new)
npm run db:seed

# Clear database before seeding (start fresh)
npm run db:seed -- --blank

# Seed from a specific JSON file
npm run db:seed -- --file data/database_base/building.json

# Clear database and seed from specific file
npm run db:seed -- --file data/database_base/building.json --blank

# Seed from a directory containing multiple JSON files
npm run db:seed -- --folder data/database_base/
```

If `--file` and `--folder` argument in the same command, onlym`--file` argument will take effect

> **Note: On Windows, command with arguments must be run in `Git Bash` command line, or else it won't work**

## Production Deployment (PM2)

Use `pm2.sh` to manage production and development server instances.

### Prerequisites

```bash
# Install PM2 globally
npm install -g pm2

# Create environment files
cp .env.example .env.prod  # Production config (port 3003)
cp .env.example .env.dev   # Development config (port 3004)

# Make script executable
chmod +x pm2.sh
```

### Usage

```bash
# Start servers
./pm2.sh dev      # Start development server (port 3004)
./pm2.sh prod     # Start production server (port 3003)
./pm2.sh all      # Start both servers

# Stop servers
./pm2.sh stop          # Stop all servers
./pm2.sh stop dev      # Stop development only
./pm2.sh stop prod     # Stop production only

# Restart servers
./pm2.sh restart       # Restart all servers
./pm2.sh restart dev   # Restart development only
./pm2.sh restart prod  # Restart production only

# Monitoring
./pm2.sh status        # Show server status
./pm2.sh logs          # Show all logs
./pm2.sh logs dev      # Show development logs
./pm2.sh logs prod     # Show production logs

# Build only
./pm2.sh build         # Build without starting
```

### Environment Files

| File        | Port | Description             |
| ----------- | ---- | ----------------------- |
| `.env.prod` | 3003 | Production environment  |
| `.env.dev`  | 3004 | Development environment |

### Auto-start on Reboot

```bash
pm2 startup
pm2 save
```
