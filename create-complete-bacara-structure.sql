-- Complete setup script to create bacara tables from scratch
-- This will create all necessary tables for BusinessAnalyst functionality

-- Step 1: Create required enums
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BAStatus') THEN
        CREATE TYPE "BAStatus" AS ENUM (
            'DRAFT',
            'PENGAJUAN', 
            'REVIEW',
            'RFC',
            'CED',
            'KIRIM_OK',
            'DEVELOPMENT',
            'UAT_INTERNAL',
            'UAT_EXTERNAL',
            'SELESAI'
        );
        RAISE NOTICE 'Created BAStatus enum';
    ELSE
        RAISE NOTICE 'BAStatus enum already exists';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BAType') THEN
        CREATE TYPE "BAType" AS ENUM (
            'BLUEPRINT',
            'BERITA_ACARA'
        );
        RAISE NOTICE 'Created BAType enum';
    ELSE
        RAISE NOTICE 'BAType enum already exists';
    END IF;
END $$;

-- Step 2: Create bacara table (main BusinessAnalyst table)
CREATE TABLE IF NOT EXISTS bacara (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    nama VARCHAR(255) NOT NULL,
    version VARCHAR(50) NOT NULL DEFAULT '0.0.1',
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    deskripsi TEXT,
    status "BAStatus" NOT NULL DEFAULT 'DRAFT',
    type "BAType" NOT NULL DEFAULT 'BERITA_ACARA',
    file_rfc VARCHAR(255),
    file_ced VARCHAR(255),
    file_ok VARCHAR(255)
);

-- Step 3: Create bacara_module table
CREATE TABLE IF NOT EXISTS bacara_module (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "baId" INTEGER NOT NULL,
    "parentId" INTEGER,
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(100),
    level INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL DEFAULT 0,
    version VARCHAR(50) NOT NULL DEFAULT '0.0.1',
    is_app_module BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 4: Create bacara_task table
CREATE TABLE IF NOT EXISTS bacara_task (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    "programmerId" INTEGER,
    jadwal_mulai TIMESTAMP,
    kompleksitas VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    is_approved BOOLEAN NOT NULL DEFAULT false,
    approved_at TIMESTAMP,
    approved_by INTEGER,
    tasklist_id INTEGER,
    "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 5: Create ba_doc table (for document attachments)
CREATE TABLE IF NOT EXISTS ba_doc (
    id SERIAL PRIMARY KEY,
    ba_id INTEGER NOT NULL,
    type VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size INTEGER NOT NULL,
    is_latest BOOLEAN NOT NULL DEFAULT true,
    uploaded_by INTEGER,
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Step 6: Create indexes for performance
-- Bacara table indexes
CREATE INDEX IF NOT EXISTS idx_bacara_project_id ON bacara("projectId");
CREATE INDEX IF NOT EXISTS idx_bacara_project_nama ON bacara("projectId", nama);
CREATE INDEX IF NOT EXISTS idx_bacara_project_type ON bacara("projectId", type);
CREATE INDEX IF NOT EXISTS idx_bacara_type ON bacara(type);

-- Bacara_module table indexes
CREATE INDEX IF NOT EXISTS idx_bacara_module_ba_id ON bacara_module("baId");
CREATE INDEX IF NOT EXISTS idx_bacara_module_parent_id ON bacara_module("parentId");
CREATE INDEX IF NOT EXISTS idx_bacara_module_project_id ON bacara_module("projectId");
CREATE INDEX IF NOT EXISTS idx_bacara_module_is_app_module ON bacara_module(is_app_module);
CREATE INDEX IF NOT EXISTS idx_bacara_module_level ON bacara_module(level);

-- Bacara_task table indexes
CREATE INDEX IF NOT EXISTS idx_bacara_task_module_id ON bacara_task("moduleId");
CREATE INDEX IF NOT EXISTS idx_bacara_task_programmer_id ON bacara_task("programmerId");
CREATE INDEX IF NOT EXISTS idx_bacara_task_project_id ON bacara_task("projectId");
CREATE INDEX IF NOT EXISTS idx_bacara_task_is_approved ON bacara_task(is_approved);
CREATE INDEX IF NOT EXISTS idx_bacara_task_tasklist_id ON bacara_task(tasklist_id);

-- Ba_doc table indexes
CREATE INDEX IF NOT EXISTS idx_ba_doc_ba_id ON ba_doc(ba_id);
CREATE INDEX IF NOT EXISTS idx_ba_doc_type ON ba_doc(type);
CREATE INDEX IF NOT EXISTS idx_ba_doc_is_latest ON ba_doc(is_latest);
CREATE INDEX IF NOT EXISTS idx_ba_doc_uploaded_by ON ba_doc(uploaded_by);

-- Step 7: Add foreign key constraints
DO $$
BEGIN
    -- Bacara to Proyek
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_projectId_fkey'
    ) THEN
        ALTER TABLE bacara 
        ADD CONSTRAINT bacara_projectId_fkey 
        FOREIGN KEY ("projectId") REFERENCES proyek(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added bacara -> proyek foreign key';
    END IF;

    -- Bacara_module to Bacara
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_module_baId_fkey'
    ) THEN
        ALTER TABLE bacara_module 
        ADD CONSTRAINT bacara_module_baId_fkey 
        FOREIGN KEY ("baId") REFERENCES bacara(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added bacara_module -> bacara foreign key';
    END IF;

    -- Bacara_module self-reference (parent)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_module_parentId_fkey'
    ) THEN
        ALTER TABLE bacara_module 
        ADD CONSTRAINT bacara_module_parentId_fkey 
        FOREIGN KEY ("parentId") REFERENCES bacara_module(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added bacara_module -> bacara_module (parent) foreign key';
    END IF;

    -- Bacara_task to Bacara_module
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_task_moduleId_fkey'
    ) THEN
        ALTER TABLE bacara_task 
        ADD CONSTRAINT bacara_task_moduleId_fkey 
        FOREIGN KEY ("moduleId") REFERENCES bacara_module(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added bacara_task -> bacara_module foreign key';
    END IF;

    -- Bacara_task to Pegawai (programmer)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'bacara_task_programmerId_fkey'
    ) THEN
        ALTER TABLE bacara_task 
        ADD CONSTRAINT bacara_task_programmerId_fkey 
        FOREIGN KEY ("programmerId") REFERENCES pegawai(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added bacara_task -> pegawai (programmer) foreign key';
    END IF;

    -- Ba_doc to Bacara
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ba_doc_ba_id_fkey'
    ) THEN
        ALTER TABLE ba_doc 
        ADD CONSTRAINT ba_doc_ba_id_fkey 
        FOREIGN KEY (ba_id) REFERENCES bacara(id) ON DELETE CASCADE;
        RAISE NOTICE 'Added ba_doc -> bacara foreign key';
    END IF;

    -- Ba_doc to Pegawai (uploader)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'ba_doc_uploaded_by_fkey'
    ) THEN
        ALTER TABLE ba_doc 
        ADD CONSTRAINT ba_doc_uploaded_by_fkey 
        FOREIGN KEY (uploaded_by) REFERENCES pegawai(id) ON DELETE SET NULL;
        RAISE NOTICE 'Added ba_doc -> pegawai (uploader) foreign key';
    END IF;
END $$;

-- Step 8: Verify the created structure
SELECT 'Created tables successfully!' AS status;

SELECT 'Final table structure:' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name IN ('bacara', 'bacara_module', 'bacara_task', 'ba_doc')
ORDER BY table_name;

-- Show column structure for bacara table
SELECT 'Bacara table columns:' AS info;
SELECT column_name, data_type, udt_name, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'bacara' 
ORDER BY ordinal_position;