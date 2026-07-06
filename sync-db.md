# Database Sync Guide

## Your local database is now configured!

Database: `richz_log_development` on `localhost:5432`

## To complete the setup:

### Step 1: Stop the dev server
Press `Ctrl+C` in the terminal running the logbook dev server

### Step 2: Regenerate Prisma Client
```bash
cd logbook
npx prisma generate
```

### Step 3: Restart the dev server
```bash
npm run dev -- --port=3002
```

## Database is ready! ✅

Your local database schema is now in sync with the Prisma schema, including:
- All tables (pegawai, proyek, tasklist, etc.)
- The `dep_id` column in tasklist
- All indexes and relationships

## Next time you need to sync:

```bash
# Stop dev server (Ctrl+C)
npx prisma db push
npx prisma generate
npm run dev -- --port=3002
```

## Seed the database (optional):

If you want to add sample data:
```bash
npx prisma db seed
```

## Check database:

```bash
# Open Prisma Studio to view/edit data
npx prisma studio
```

This will open a web interface at http://localhost:5555 where you can view and edit your database.
