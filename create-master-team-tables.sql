-- Create Master Team Tables
-- Run this SQL script to create the required tables for master team functionality

-- Create TeamType enum if not exists
DO $$ BEGIN
    CREATE TYPE "TeamType" AS ENUM ('MANAGED_SERVICE', 'PRODUCT', 'PROJECT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create master_team table
CREATE TABLE IF NOT EXISTS "master_team" (
    "id" SERIAL PRIMARY KEY,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "type" "TeamType" NOT NULL DEFAULT 'PRODUCT',
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "master_team_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "master_team"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes for master_team
CREATE INDEX IF NOT EXISTS "master_team_parent_id_idx" ON "master_team"("parent_id");
CREATE INDEX IF NOT EXISTS "master_team_type_idx" ON "master_team"("type");
CREATE INDEX IF NOT EXISTS "master_team_is_active_idx" ON "master_team"("is_active");

-- Create master_team_member table
CREATE TABLE IF NOT EXISTS "master_team_member" (
    "id" SERIAL PRIMARY KEY,
    "team_id" INTEGER NOT NULL,
    "pegawai_id" INTEGER NOT NULL,
    "role" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "master_team_member_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "master_team"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "master_team_member_pegawai_id_fkey" FOREIGN KEY ("pegawai_id") REFERENCES "pegawai"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "master_team_member_team_id_pegawai_id_key" UNIQUE ("team_id", "pegawai_id")
);

-- Create indexes for master_team_member
CREATE INDEX IF NOT EXISTS "master_team_member_team_id_idx" ON "master_team_member"("team_id");
CREATE INDEX IF NOT EXISTS "master_team_member_pegawai_id_idx" ON "master_team_member"("pegawai_id");

-- Create project_group table
CREATE TABLE IF NOT EXISTS "project_group" (
    "id" SERIAL PRIMARY KEY,
    "nama" VARCHAR(255) NOT NULL,
    "deskripsi" TEXT,
    "team_id" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "project_group_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "master_team"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create indexes for project_group
CREATE INDEX IF NOT EXISTS "project_group_team_id_idx" ON "project_group"("team_id");
CREATE INDEX IF NOT EXISTS "project_group_is_active_idx" ON "project_group"("is_active");

-- Create project_group_item table
CREATE TABLE IF NOT EXISTS "project_group_item" (
    "id" SERIAL PRIMARY KEY,
    "group_id" INTEGER NOT NULL,
    "project_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "project_group_item_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "project_group"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_group_item_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "proyek"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_group_item_group_id_project_id_key" UNIQUE ("group_id", "project_id")
);

-- Create indexes for project_group_item
CREATE INDEX IF NOT EXISTS "project_group_item_group_id_idx" ON "project_group_item"("group_id");
CREATE INDEX IF NOT EXISTS "project_group_item_project_id_idx" ON "project_group_item"("project_id");

-- Add team_id column to proyek table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proyek' AND column_name = 'team_id') THEN
        ALTER TABLE "proyek" ADD COLUMN "team_id" INTEGER;
        ALTER TABLE "proyek" ADD CONSTRAINT "proyek_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "master_team"("id") ON DELETE SET NULL ON UPDATE CASCADE;
        CREATE INDEX "proyek_team_id_idx" ON "proyek"("team_id");
    END IF;
END $$;

-- Add isActive column to proyek table if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'proyek' AND column_name = 'isActive') THEN
        ALTER TABLE "proyek" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
    END IF;
END $$;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_master_team_updated_at ON "master_team";
CREATE TRIGGER update_master_team_updated_at 
    BEFORE UPDATE ON "master_team" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_master_team_member_updated_at ON "master_team_member";
CREATE TRIGGER update_master_team_member_updated_at 
    BEFORE UPDATE ON "master_team_member" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_project_group_updated_at ON "project_group";
CREATE TRIGGER update_project_group_updated_at 
    BEFORE UPDATE ON "project_group" 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO "master_team" ("nama", "deskripsi", "type") VALUES 
('Frontend Team', 'Tim yang menangani pengembangan frontend aplikasi', 'PRODUCT'),
('Backend Team', 'Tim yang menangani pengembangan backend dan API', 'PRODUCT'),
('Mobile Team', 'Tim yang menangani pengembangan aplikasi mobile', 'PRODUCT')
ON CONFLICT DO NOTHING;

-- Show created tables
SELECT 
    schemaname,
    tablename,
    tableowner
FROM pg_tables 
WHERE tablename IN ('master_team', 'master_team_member', 'project_group', 'project_group_item')
ORDER BY tablename;