/*
  # Add trigger to auto-create user profiles

  1. Changes
    - Create function to automatically create user_profile when auth.users record is created
    - Add trigger to call this function on new user signup
    - Default new users to 'verkoper' role

  2. Security
    - Trigger runs with SECURITY DEFINER to bypass RLS during profile creation
    - Only creates profile if one doesn't already exist
*/

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, active)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'Nieuwe Gebruiker'),
    COALESCE(NEW.raw_user_meta_data->>'role', 'verkoper'),
    true
  )
  ON CONFLICT (id) DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
