/*
  # Create update_updated_at function
  
  Creates a reusable function for automatically updating the updated_at timestamp
  when a row is modified.
*/

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;