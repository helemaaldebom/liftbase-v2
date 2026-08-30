# Document Upload Setup Instructies

De document upload functionaliteit is toegevoegd maar vereist database setup.

## Stap 1: Open Supabase Dashboard

1. Ga naar je Supabase project: https://supabase.com/dashboard
2. Klik op je project
3. Ga naar **SQL Editor** in het linker menu

## Stap 2: Voer Database Migratie Uit

1. Klik op **New Query** in de SQL Editor
2. Kopieer en plak de onderstaande SQL:

```sql
-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dossier_id uuid NOT NULL REFERENCES dossiers(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text NOT NULL,
  file_size bigint NOT NULL,
  display_order integer DEFAULT 0,
  uploaded_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Authenticated users can view documents"
  ON documents FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert documents"
  ON documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can update their own documents"
  ON documents FOR UPDATE TO authenticated
  USING (auth.uid() = uploaded_by) WITH CHECK (auth.uid() = uploaded_by);

CREATE POLICY "Users can delete their own documents"
  ON documents FOR DELETE TO authenticated USING (auth.uid() = uploaded_by);

CREATE POLICY "Managers can delete any document"
  ON documents FOR DELETE TO authenticated USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'
    )
  );

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_documents_dossier_id ON documents(dossier_id);
CREATE INDEX IF NOT EXISTS idx_documents_display_order ON documents(dossier_id, display_order);

-- Add updated_at trigger
CREATE TRIGGER update_documents_updated_at
  BEFORE UPDATE ON documents FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();
```

3. Klik op **Run** (of druk Ctrl/Cmd + Enter)

## Stap 3: Maak Storage Bucket Aan

1. Maak een **nieuwe query** aan in de SQL Editor
2. Kopieer en plak de onderstaande SQL:

```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'dossier-documents',
  'dossier-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Authenticated users can upload documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'dossier-documents');

CREATE POLICY "Authenticated users can read documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'dossier-documents');

CREATE POLICY "Users can delete their own documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'dossier-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Managers can delete any document"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'dossier-documents' AND
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid() AND user_profiles.role = 'manager'
    )
  );
```

3. Klik op **Run**

## Klaar!

Na het uitvoeren van beide SQL queries:
- Refresh de applicatie in je browser
- Ga naar een dossier
- Je ziet nu de "Documenten" sectie onder de foto's
- Upload PDF, Word of Excel bestanden tot 50MB

## Ondersteunde Bestandstypen

- PDF (.pdf)
- Word (.doc, .docx)
- Excel (.xls, .xlsx)
- Maximale bestandsgrootte: 50MB
