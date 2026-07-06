-- Add approval tracking fields to task_ba_blueprint table
ALTER TABLE task_ba_blueprint 
ADD COLUMN is_approved BOOLEAN DEFAULT FALSE,
ADD COLUMN approved_at TIMESTAMP NULL,
ADD COLUMN approved_by INTEGER NULL,
ADD COLUMN tasklist_id INTEGER NULL;

-- Add indexes for better performance
CREATE INDEX idx_task_ba_blueprint_is_approved ON task_ba_blueprint(is_approved);
CREATE INDEX idx_task_ba_blueprint_tasklist_id ON task_ba_blueprint(tasklist_id);

-- Add comment for documentation
COMMENT ON COLUMN task_ba_blueprint.is_approved IS 'Indicates if this task has been approved and converted to tasklist';
COMMENT ON COLUMN task_ba_blueprint.approved_at IS 'Timestamp when the task was approved';
COMMENT ON COLUMN task_ba_blueprint.approved_by IS 'ID of user who approved the task';
COMMENT ON COLUMN task_ba_blueprint.tasklist_id IS 'ID of the created tasklist after approval';