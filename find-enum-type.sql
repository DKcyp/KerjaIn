-- Find all enum types in the database
SELECT 
    t.typname as enum_name,
    e.enumlabel as enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
WHERE t.typname LIKE '%status%' OR t.typname LIKE '%Status%' OR t.typname LIKE '%BA%'
ORDER BY t.typname, e.enumsortorder;

-- This will show all enums with "status" or "BA" in the name
