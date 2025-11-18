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

### Commands

Ngork: `ngrok http 3003 --config "/path/to/ngrok-personal.yml"`
