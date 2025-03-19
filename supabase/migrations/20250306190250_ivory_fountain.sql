/*
  # Storage Policies Configuration

  1. Security Policies
    - Public read access for published content
    - Write access control for videos and documents
    - User-specific document management

  2. Access Control
    - Videos: Admin-only uploads
    - Documents: User-specific uploads with path restrictions
*/

-- Videos bucket policies
CREATE POLICY "Public read access for published videos"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM videos v
    WHERE v.url = storage.objects.name
  )
);

CREATE POLICY "Admin users can upload videos"
ON storage.objects FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'videos' AND
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.role = 'ADMIN'
  )
);

-- Documents bucket policies
CREATE POLICY "Public read access for published documents"
ON storage.objects FOR SELECT
TO public
USING (
  bucket_id = 'documents' AND
  EXISTS (
    SELECT 1 FROM documents d
    WHERE d.file_url = storage.objects.name
  )
);

CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);