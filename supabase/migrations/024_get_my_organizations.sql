-- AVGenix: reliable organization lookup without recursive membership RLS

CREATE OR REPLACE FUNCTION public.get_my_organizations()
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'id', org.id,
        'name', org.name,
        'slug', org.slug,
        'logo_url', org.logo_url,
        'role', member.role,
        'member_roles', org.member_roles,
        'subscription_status', org.subscription_status,
        'trial_started_at', org.trial_started_at,
        'trial_ends_at', org.trial_ends_at
      )
      ORDER BY org.created_at
    ),
    '[]'::jsonb
  )
  FROM public.organization_members member
  JOIN public.organizations org ON org.id = member.org_id
  WHERE member.user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.get_my_organizations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_organizations() TO authenticated;

COMMENT ON FUNCTION public.get_my_organizations() IS
  'Returns organizations belonging to the authenticated user without triggering recursive organization_members RLS policies.';
