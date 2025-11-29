-- Fix news table RLS policies for admin insert
DROP POLICY IF EXISTS "Only admins can manage news" ON public.news;

-- Create separate policies for each operation
CREATE POLICY "Admins can insert news" 
ON public.news 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update news" 
ON public.news 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete news" 
ON public.news 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can select all news" 
ON public.news 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Fix advertisements table RLS policies
DROP POLICY IF EXISTS "Only admins can manage ads" ON public.advertisements;

CREATE POLICY "Admins can insert ads" 
ON public.advertisements 
FOR INSERT 
TO authenticated 
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update ads" 
ON public.advertisements 
FOR UPDATE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete ads" 
ON public.advertisements 
FOR DELETE 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can select all ads" 
ON public.advertisements 
FOR SELECT 
TO authenticated 
USING (public.has_role(auth.uid(), 'admin'::app_role));