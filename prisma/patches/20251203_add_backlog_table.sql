-- Backlog table creation (idempotent, safe). PostgreSQL.

-- Create table if not exists (base shape)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = current_schema() AND table_name = 'backlog'
  ) THEN
    CREATE TABLE public.backlog (
      id INTEGER,
      title TEXT NOT NULL,
      note TEXT NOT NULL,
      projectId INTEGER,
      moduleId INTEGER,
      assignedTo INTEGER,
      isDeleted BOOLEAN NOT NULL DEFAULT false,
      deletedAt TIMESTAMP(3),
      createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updatedAt TIMESTAMP(3) NOT NULL
    );
  END IF;
END
$$;

-- Ensure required columns exist (for partially created tables)
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE public.backlog ALTER COLUMN title DROP DEFAULT; -- keep NOT NULL without default insert side-effects
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS note TEXT NOT NULL DEFAULT '';
ALTER TABLE public.backlog ALTER COLUMN note DROP DEFAULT;
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS projectId INTEGER;
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS moduleId INTEGER;
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS assignedTo INTEGER;
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS isDeleted BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS deletedAt TIMESTAMP(3);
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS createdAt TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE public.backlog ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMP(3) NOT NULL;

-- Ensure id column + sequence + default + PK
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = current_schema() AND table_name = 'backlog' AND column_name = 'id'
  ) THEN
    ALTER TABLE public.backlog ADD COLUMN id INTEGER;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_class WHERE relkind = 'S' AND relname = 'backlog_id_seq'
  ) THEN
    CREATE SEQUENCE public.backlog_id_seq;
  END IF;

  ALTER SEQUENCE public.backlog_id_seq OWNED BY public.backlog.id;
  ALTER TABLE public.backlog ALTER COLUMN id SET DEFAULT nextval('public.backlog_id_seq'::regclass);

  PERFORM setval(
    'public.backlog_id_seq',
    GREATEST(1, COALESCE((SELECT MAX(id)+1 FROM public.backlog), 1)),
    false
  );

  ALTER TABLE public.backlog ALTER COLUMN id SET NOT NULL;

  BEGIN
    ALTER TABLE public.backlog ADD CONSTRAINT backlog_pkey PRIMARY KEY (id);
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END
$$;

-- Indexes
CREATE INDEX IF NOT EXISTS backlog_projectId_idx ON public.backlog(projectId);
CREATE INDEX IF NOT EXISTS backlog_moduleId_idx ON public.backlog(moduleId);
CREATE INDEX IF NOT EXISTS backlog_assignedTo_idx ON public.backlog(assignedTo);
CREATE INDEX IF NOT EXISTS backlog_isDeleted_updatedAt_idx ON public.backlog(isDeleted, updatedAt);
