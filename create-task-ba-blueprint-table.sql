-- Create task_ba_blueprint table
CREATE TABLE IF NOT EXISTS public.task_ba_blueprint (
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
    CONSTRAINT fk_task_ba_blueprint_module FOREIGN KEY ("moduleId") REFERENCES public.blueprint_module(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_ba_blueprint_programmer FOREIGN KEY ("programmerId") REFERENCES public.pegawai(id) ON DELETE SET NULL
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_task_ba_blueprint_project_id ON public.task_ba_blueprint("projectId");
CREATE INDEX IF NOT EXISTS idx_task_ba_blueprint_module_id ON public.task_ba_blueprint("moduleId");
CREATE INDEX IF NOT EXISTS idx_task_ba_blueprint_programmer_id ON public.task_ba_blueprint("programmerId");
CREATE INDEX IF NOT EXISTS idx_task_ba_blueprint_kompleksitas ON public.task_ba_blueprint(kompleksitas);