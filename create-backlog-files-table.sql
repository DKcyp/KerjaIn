-- Create backlog_files table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.backlog_files (
  id SERIAL PRIMARY KEY,
  "backlogId" INTEGER NOT NULL,
  "fileName" VARCHAR(255) NOT NULL,
  "originalName" VARCHAR(255) NOT NULL,
  "filePath" VARCHAR(500) NOT NULL,
  "fileType" VARCHAR(100) NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "uploadedBy" INTEGER,
  "uploadedAt" TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_backlog_files_backlog_id ON public.backlog_files("backlogId");
CREATE INDEX IF NOT EXISTS idx_backlog_files_uploaded_by ON public.backlog_files("uploadedBy");
CREATE INDEX IF NOT EXISTS idx_backlog_files_uploaded_at ON public.backlog_files("uploadedAt");

-- Add comment to table
COMMENT ON TABLE public.backlog_files IS 'Stores file attachments for backlog items';
COMMENT ON COLUMN public.backlog_files."backlogId" IS 'Reference to backlog.id';
COMMENT ON COLUMN public.backlog_files."fileName" IS 'Generated filename on server';
COMMENT ON COLUMN public.backlog_files."originalName" IS 'Original filename from user';
COMMENT ON COLUMN public.backlog_files."filePath" IS 'API path to access the file';
COMMENT ON COLUMN public.backlog_files."fileType" IS 'MIME type of the file';
COMMENT ON COLUMN public.backlog_files."fileSize" IS 'File size in bytes';
COMMENT ON COLUMN public.backlog_files."uploadedBy" IS 'User ID who uploaded the file';
COMMENT ON COLUMN public.backlog_files."uploadedAt" IS 'Timestamp when file was uploaded';