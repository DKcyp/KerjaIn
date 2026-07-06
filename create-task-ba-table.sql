-- Drop existing table if exists
DROP TABLE IF EXISTS public.task_ba CASCADE;

-- Create task_ba table
CREATE TABLE public.task_ba (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "moduleId" INTEGER NOT NULL,
    nama VARCHAR(255) NOT NULL,
    deskripsi TEXT,
    "programmerId" INTEGER,
    "jadwal_mulai" TIMESTAMP,
    kompleksitas VARCHAR(50) NOT NULL DEFAULT 'MEDIUM',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_ba_module FOREIGN KEY ("moduleId") REFERENCES public.proyek_module(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_ba_programmer FOREIGN KEY ("programmerId") REFERENCES public.pegawai(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX idx_task_ba_project_id ON public.task_ba("projectId");
CREATE INDEX idx_task_ba_module_id ON public.task_ba("moduleId");
CREATE INDEX idx_task_ba_programmer_id ON public.task_ba("programmerId");
CREATE INDEX idx_task_ba_kompleksitas ON public.task_ba(kompleksitas);
