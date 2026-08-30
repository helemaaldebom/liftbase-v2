-- Delete corrupt photos (less than 100 bytes)
-- These are invalid and should be removed

SELECT
  id,
  filename,
  file_size_bytes,
  storage_path,
  dossier_id
FROM photos
WHERE file_size_bytes < 100
ORDER BY created_at DESC;

-- To delete them, uncomment this:
-- DELETE FROM photos WHERE file_size_bytes < 100;
