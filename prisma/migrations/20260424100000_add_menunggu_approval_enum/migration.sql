-- Step 1: Add the new enum value (must be in its own transaction)
ALTER TYPE "BAStatus" ADD VALUE IF NOT EXISTS 'MENUNGGU_APPROVAL';
