-- Fix PostgreSQL sequence untuk table pegawai dan proyek
-- Jalankan script ini di PostgreSQL untuk reset sequence

-- Reset sequence pegawai
SELECT setval(pg_get_serial_sequence('pegawai', 'id'), (SELECT COALESCE(MAX(id), 1) FROM pegawai));

-- Reset sequence proyek  
SELECT setval(pg_get_serial_sequence('proyek', 'id'), (SELECT COALESCE(MAX(id), 1) FROM proyek));

-- Verify sequences
SELECT 
    'pegawai' as table_name,
    last_value as current_sequence_value,
    (SELECT MAX(id) FROM pegawai) as max_id_in_table
FROM pegawai_id_seq
UNION ALL
SELECT 
    'proyek' as table_name,
    last_value as current_sequence_value,
    (SELECT MAX(id) FROM proyek) as max_id_in_table
FROM proyek_id_seq;
