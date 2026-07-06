-- Migration: Add global_onof_getjadwal table
-- Description: Table untuk mengontrol fitur pengambilan jadwal dari JWT (on/off switch)
-- Date: 2025-01-XX

-- Create table
CREATE TABLE IF NOT EXISTS global_onof_getjadwal (
    id SERIAL PRIMARY KEY,
    is_enabled BOOLEAN NOT NULL DEFAULT true,
    description VARCHAR(255),
    updated_by INTEGER,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add comment to table
COMMENT ON TABLE global_onof_getjadwal IS 'Global on/off switch untuk fitur pengambilan jadwal dari JWT/RichzSpot API';

-- Add comments to columns
COMMENT ON COLUMN global_onof_getjadwal.is_enabled IS 'Status aktif/nonaktif fitur get jadwal dari JWT';
COMMENT ON COLUMN global_onof_getjadwal.description IS 'Deskripsi atau catatan perubahan';
COMMENT ON COLUMN global_onof_getjadwal.updated_by IS 'ID user yang melakukan update terakhir';

-- Insert default record (enabled by default)
INSERT INTO global_onof_getjadwal (is_enabled, description, updated_by)
VALUES (true, 'Initial setup - fitur get jadwal dari JWT aktif', NULL)
ON CONFLICT DO NOTHING;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_global_onof_getjadwal_enabled ON global_onof_getjadwal(is_enabled);
