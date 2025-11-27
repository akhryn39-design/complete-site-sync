-- Add support telegram setting
INSERT INTO public.system_settings (key, value, category, description)
VALUES ('support_telegram', '"@Heart83frozen"', 'support', 'آیدی تلگرام پشتیبانی')
ON CONFLICT (key) DO NOTHING;