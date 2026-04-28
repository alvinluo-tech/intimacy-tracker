-- Restrict feedback storage read to file owner only
DROP POLICY IF EXISTS "Feedback objects are publicly readable" ON storage.objects;

CREATE POLICY "Users can read own feedback objects"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'feedback'
    AND split_part(name, '/', 1) = auth.uid()::text
  );
