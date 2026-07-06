-- Create blueprint_module table
CREATE TABLE IF NOT EXISTS public.blueprint_module (
    id SERIAL PRIMARY KEY,
    "projectId" INTEGER NOT NULL,
    "baId" INTEGER NOT NULL,
    "parentId" INTEGER,
    nama VARCHAR(255) NOT NULL,
    kode VARCHAR(50),
    level INTEGER NOT NULL DEFAULT 1, -- 1 = main module, 2 = sub module
    "order" INTEGER DEFAULT 0,
    version VARCHAR(50) DEFAULT '0.0.1',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_blueprint_module_ba FOREIGN KEY ("baId") REFERENCES public.business_analyst(id) ON DELETE CASCADE,
    CONSTRAINT fk_blueprint_module_parent FOREIGN KEY ("parentId") REFERENCES public.blueprint_module(id) ON DELETE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_blueprint_module_project_id ON public.blueprint_module("projectId");
CREATE INDEX IF NOT EXISTS idx_blueprint_module_ba_id ON public.blueprint_module("baId");
CREATE INDEX IF NOT EXISTS idx_blueprint_module_parent_id ON public.blueprint_module("parentId");
CREATE INDEX IF NOT EXISTS idx_blueprint_module_level ON public.blueprint_module(level);