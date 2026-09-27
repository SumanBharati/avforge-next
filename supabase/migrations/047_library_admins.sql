-- ============================================================
-- AVGenix: only library admins can change the shared AVGenix Library.
-- ============================================================
-- av_products is the shared catalog every organization reads from. 008 let
-- any signed-in user insert, update or delete it, so any customer could edit
-- or wipe products for everyone. Writes are now limited to users listed in
-- library_admins; everyone signed in can still read it. Each organization's
-- own equipment_library is unaffected and stays theirs to manage.
--
-- Admins are listed by user id (not email), so the grant survives an email
-- change and can't be claimed by someone who later registers that address.

CREATE TABLE IF NOT EXISTS public.library_admins (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.library_admins ENABLE ROW LEVEL SECURITY;

-- Users can only see whether they themselves are an admin. No client write
-- policies: admins are added or removed from the SQL editor.
DROP POLICY IF EXISTS library_admins_select_own ON public.library_admins;
CREATE POLICY library_admins_select_own ON public.library_admins
  FOR SELECT USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.is_library_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.library_admins WHERE user_id = auth.uid());
$$;

REVOKE ALL ON FUNCTION public.is_library_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_library_admin() TO authenticated;

DROP POLICY IF EXISTS "av_products_insert" ON public.av_products;
CREATE POLICY "av_products_insert" ON public.av_products
  FOR INSERT WITH CHECK (public.is_library_admin());

DROP POLICY IF EXISTS "av_products_update" ON public.av_products;
CREATE POLICY "av_products_update" ON public.av_products
  FOR UPDATE USING (public.is_library_admin()) WITH CHECK (public.is_library_admin());

DROP POLICY IF EXISTS "av_products_delete" ON public.av_products;
CREATE POLICY "av_products_delete" ON public.av_products
  FOR DELETE USING (public.is_library_admin());

-- The one library admin for now.
INSERT INTO public.library_admins (user_id)
SELECT id FROM auth.users WHERE email = 'er.vikasmodi@gmail.com'
ON CONFLICT (user_id) DO NOTHING;
