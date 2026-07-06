-- CreateTable
CREATE TABLE "bacara_log" (
    "id" SERIAL NOT NULL,
    "endpoint" VARCHAR(255) NOT NULL,
    "http_method" VARCHAR(10) NOT NULL,
    "request_url" TEXT,
    "request_headers" JSONB,
    "request_params" JSONB,
    "response_status_code" INTEGER,
    "response_headers" JSONB,
    "response_time_ms" INTEGER,
    "is_error" BOOLEAN NOT NULL DEFAULT false,
    "error_message" TEXT,
    "error_code" VARCHAR(50),
    "project_id" INTEGER,
    "ba_id" INTEGER,
    "module_id" INTEGER,
    "task_id" INTEGER,
    "user_id" INTEGER,
    "user_name" VARCHAR(255),
    "user_ip" VARCHAR(50),
    "user_agent" TEXT,
    "session_id" VARCHAR(255),
    "request_id" VARCHAR(255),
    "action_type" VARCHAR(50) NOT NULL,
    "action_description" TEXT,
    "status_ba" VARCHAR(50),
    "old_status_ba" VARCHAR(50),
    "new_status_ba" VARCHAR(50),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bacara_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bacara_log_ba_id_idx" ON "bacara_log"("ba_id");

-- CreateIndex
CREATE INDEX "bacara_log_project_id_idx" ON "bacara_log"("project_id");

-- CreateIndex
CREATE INDEX "bacara_log_action_type_idx" ON "bacara_log"("action_type");

-- CreateIndex
CREATE INDEX "bacara_log_status_ba_idx" ON "bacara_log"("status_ba");

-- CreateIndex
CREATE INDEX "bacara_log_created_at_idx" ON "bacara_log"("created_at");

-- CreateIndex
CREATE INDEX "bacara_log_user_id_idx" ON "bacara_log"("user_id");

-- AddForeignKey
ALTER TABLE "bacara_log" ADD CONSTRAINT "bacara_log_ba_id_fkey" FOREIGN KEY ("ba_id") REFERENCES "bacara"("id") ON DELETE SET NULL ON UPDATE CASCADE;
