-- Safe patch: create tasklist_log if missing and add imagePath column if missing
CREATE TABLE IF NOT EXISTS public.tasklist_log (
  id SERIAL PRIMARY KEY,
  "taskId" INT NOT NULL,
  waktu TIMESTAMP NOT NULL DEFAULT NOW(),
  "userId" INT NOT NULL,
  keterangan TEXT NULL,
  status TEXT NULL,
  action TEXT NOT NULL
);

ALTER TABLE public.tasklist_log ADD COLUMN IF NOT EXISTS "imagePath" TEXT NULL;

CREATE INDEX IF NOT EXISTS idx_tasklist_log_task_waktu ON public.tasklist_log ("taskId", waktu DESC);
CREATE INDEX IF NOT EXISTS idx_tasklist_log_user ON public.tasklist_log ("userId");
