-- 1. Fix showcase_items: prevent anon/authenticated write
DROP POLICY IF EXISTS "Service role can manage showcase items" ON public.showcase_items;
CREATE POLICY "Service role can manage showcase items"
ON public.showcase_items
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- 2. Storage: replace bucket-wide SELECT (which allows listing all files) with owner-scoped SELECT.
-- Direct CDN URLs continue to work because the buckets are public:true; the SELECT policy only
-- gates the list/download API.
DROP POLICY IF EXISTS "Anyone can view user images" ON storage.objects;
CREATE POLICY "Users can list own user-images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'user-images' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read spreadsheets" ON storage.objects;
CREATE POLICY "Users can list own spreadsheets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'spreadsheets' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Anyone can read slide presentations" ON storage.objects;
CREATE POLICY "Users can list own slide-presentations"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'slide-presentations' AND (storage.foldername(name))[1] = auth.uid()::text);