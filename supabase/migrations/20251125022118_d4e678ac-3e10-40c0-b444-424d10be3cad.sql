-- Create storage bucket for news media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-images', 'chat-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create storage policies for chat-images bucket
CREATE POLICY "Anyone can view chat images"
ON storage.objects FOR SELECT
USING (bucket_id = 'chat-images');

CREATE POLICY "Authenticated users can upload chat images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'chat-images' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Users can update their own chat images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');

CREATE POLICY "Users can delete their own chat images"
ON storage.objects FOR DELETE
USING (bucket_id = 'chat-images' AND auth.role() = 'authenticated');