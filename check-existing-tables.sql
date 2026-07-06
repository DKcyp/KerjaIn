-- Check what BA-related tables exist in the database
SELECT 'Existing tables:' AS info;
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (
    table_name LIKE '%bacara%' 
    OR table_name LIKE '%business_analyst%' 
    OR table_name LIKE '%ba_%'
  )
ORDER BY table_name;

-- Check if any data exists in business_analyst table (if it exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'business_analyst') THEN
        RAISE NOTICE 'business_analyst table exists - checking data...';
        -- You can uncomment the next line to see data count
        -- PERFORM (SELECT COUNT(*) FROM business_analyst);
    ELSE
        RAISE NOTICE 'business_analyst table does NOT exist';
    END IF;
END $$;