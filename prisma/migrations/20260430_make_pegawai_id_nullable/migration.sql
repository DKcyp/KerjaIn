-- Make pegawaiId nullable in tasklist table to support returning tasks to backlog
ALTER TABLE "tasklist" ALTER COLUMN "pegawaiId" DROP NOT NULL;
