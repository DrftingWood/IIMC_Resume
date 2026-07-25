-- Access helpers.
--
-- Everything here is SECURITY DEFINER and therefore runs as the table owner,
-- which bypasses RLS. That is deliberate: RLS policies call these helpers, and
-- if they ran under the caller's policies the resumes policy would recurse into
-- itself. Do NOT enable `force row level security` on these tables.
--
-- The rule for reviewers is the important one. Row-level security is the wrong
-- granularity for bullet-level sharing: a resume is a single row, so any policy
-- that lets a reviewer SELECT it hands them the whole document — CGPA, phone,
-- email, and every unrelated bullet. Reviewers therefore get no row access at
-- all. They read through public.get_review_payload(), which returns only the
-- bullets they were actually asked about.

/* ------------------------------ domain lookup ----------------------------- */

create or replace function public.university_for_email(p_email text)
returns text
language sql
stable
set search_path = public
as $$
  select ud.university_id
  from public.university_domains ud
  where lower(split_part(p_email, '@', 2)) = ud.domain
     or lower(split_part(p_email, '@', 2)) like '%.' || ud.domain
  -- Longest domain wins, so a department-specific entry beats the apex.
  order by length(ud.domain) desc
  limit 1;
$$;

/* ------------------------------- membership ------------------------------- */

-- Grants the caller membership of whichever university owns their verified
-- email domain. The client cannot insert into memberships directly; this is
-- the only path in, and it trusts auth.users (populated by the identity
-- provider) rather than anything the client asserts.
create or replace function public.claim_membership()
returns public.memberships
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  v_email     text;
  v_confirmed timestamptz;
  v_uni       text;
  v_row       public.memberships;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select u.email, u.email_confirmed_at
    into v_email, v_confirmed
    from auth.users u
   where u.id = auth.uid();

  if v_confirmed is null then
    raise exception 'email not verified' using errcode = '28000';
  end if;

  v_uni := public.university_for_email(v_email);
  if v_uni is null then
    raise exception 'email domain not recognised' using errcode = '42501';
  end if;

  insert into public.memberships (user_id, university_id, verified_via)
  values (auth.uid(), v_uni, 'domain')
  on conflict (user_id, university_id)
    do update set status = 'active'
  returning * into v_row;

  return v_row;
end;
$$;

create or replace function public.is_member_of(p_university text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.memberships m
    where m.user_id = auth.uid()
      and m.university_id = p_university
      and m.status = 'active'
  );
$$;

/* --------------------------------- resumes -------------------------------- */

-- Whole-document read access. Owners always; university-visible resumes to
-- active members of that university. Review invitees are deliberately absent —
-- see the header note.
create or replace function public.can_read_resume(p_resume uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.resumes r
    where r.id = p_resume
      and r.deleted_at is null
      and (
        r.owner_id = auth.uid()
        or (
          r.visibility = 'university'
          and r.university_id is not null
          and public.is_member_of(r.university_id)
        )
      )
  );
$$;

create or replace function public.is_resume_owner(p_resume uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.resumes r
    where r.id = p_resume and r.owner_id = auth.uid() and r.deleted_at is null
  );
$$;

/* ---------------------------- review membership --------------------------- */

-- These three exist to break a policy cycle. review_requests' policy needs to
-- know about invitees and review_invitees' policy needs to know about requests;
-- expressed as plain subqueries each one re-enters the other's policy and
-- Postgres aborts with "infinite recursion detected in policy". Running the
-- lookups as the definer sidesteps RLS on the way in, which cuts the loop.

create or replace function public.is_review_requester(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.review_requests rr
    where rr.id = p_request and rr.requester_id = auth.uid()
  );
$$;

create or replace function public.is_review_participant(p_request uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.review_requests rr
    join public.resumes r on r.id = rr.resume_id
    left join public.review_invitees ri
      on ri.request_id = rr.id and ri.user_id = auth.uid()
    where rr.id = p_request
      and (
        rr.requester_id = auth.uid()
        or ri.id is not null
        or (
          rr.audience = 'university'
          and r.university_id is not null
          and public.is_member_of(r.university_id)
        )
      )
  );
$$;

-- Commenting additionally requires the request to still be open, and the
-- comment's resume_id to match the request's — otherwise a participant in one
-- review could attach comments to an unrelated resume.
create or replace function public.can_comment_on_request(p_request uuid, p_resume uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.review_requests rr
    join public.resumes r on r.id = rr.resume_id
    left join public.review_invitees ri
      on ri.request_id = rr.id and ri.user_id = auth.uid()
    where rr.id = p_request
      and rr.resume_id = p_resume
      and rr.status = 'open'
      and (
        rr.requester_id = auth.uid()
        or ri.id is not null
        or (
          rr.audience = 'university'
          and r.university_id is not null
          and public.is_member_of(r.university_id)
        )
      )
  );
$$;

/* ---------------------------- review projection --------------------------- */

-- Collect every object in a JSON document whose "id" is in p_ids, reduced to
-- its scalar fields only.
--
-- Dropping nested arrays/objects is a security control, not tidiness: if a
-- caller names a bullet-group id, returning the object wholesale would ship
-- every sibling bullet inside it. Scalars-only makes that structurally
-- impossible, so the worst case for a mis-specified id is too little data.
create or replace function public.jsonb_collect_entities(p_node jsonb, p_ids text[])
returns jsonb
language plpgsql
immutable
as $$
declare
  v_out    jsonb := '[]'::jsonb;
  v_scalar jsonb;
  v_value  jsonb;
begin
  if p_node is null then
    return v_out;
  end if;

  if jsonb_typeof(p_node) = 'object' then
    if p_node ? 'id' and (p_node->>'id') = any(p_ids) then
      select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)
        into v_scalar
        from jsonb_each(p_node)
       where jsonb_typeof(value) in ('string', 'number', 'boolean', 'null');
      v_out := v_out || jsonb_build_array(v_scalar);
    end if;

    for v_value in select value from jsonb_each(p_node) loop
      v_out := v_out || public.jsonb_collect_entities(v_value, p_ids);
    end loop;

  elsif jsonb_typeof(p_node) = 'array' then
    for v_value in select value from jsonb_array_elements(p_node) loop
      v_out := v_out || public.jsonb_collect_entities(v_value, p_ids);
    end loop;
  end if;

  return v_out;
end;
$$;

-- The only way a reviewer reads someone else's resume.
--
-- For scope='selection' this returns just the requested bullets, so a reviewer
-- asked about one line never sees the owner's grades or contact details. For
-- scope='resume' the owner has explicitly shared the whole document, so the
-- pinned snapshot is returned in full.
create or replace function public.get_review_payload(p_request uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_req      public.review_requests;
  v_resume   public.resumes;
  v_data     jsonb;
  v_allowed  boolean;
  v_requester text;
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  select * into v_req from public.review_requests where id = p_request;
  if v_req.id is null then
    raise exception 'review request not found' using errcode = 'P0002';
  end if;

  select * into v_resume from public.resumes where id = v_req.resume_id;
  if v_resume.deleted_at is not null then
    raise exception 'review request not found' using errcode = 'P0002';
  end if;

  v_allowed :=
       v_req.requester_id = auth.uid()
    or exists (
         select 1 from public.review_invitees ri
         where ri.request_id = v_req.id and ri.user_id = auth.uid()
       )
    or (
         v_req.audience = 'university'
         and v_resume.university_id is not null
         and public.is_member_of(v_resume.university_id)
       );

  if not v_allowed then
    raise exception 'not a participant in this review' using errcode = '42501';
  end if;

  if v_req.expires_at is not null and v_req.expires_at < now() then
    raise exception 'review request has expired' using errcode = '42501';
  end if;

  select rv.data into v_data
    from public.resume_versions rv
   where rv.id = v_req.version_id;

  select p.display_name into v_requester
    from public.profiles p
   where p.id = v_req.requester_id;

  return jsonb_build_object(
    'request_id', v_req.id,
    'scope',      v_req.scope,
    'question',   v_req.question,
    'status',     v_req.status,
    'version_id', v_req.version_id,
    'template_id', v_resume.template_id,
    'requester',  jsonb_build_object('display_name', coalesce(v_requester, '')),
    'entities',   case
                    when v_req.scope = 'selection'
                      then public.jsonb_collect_entities(v_data, v_req.entity_ids)
                    else '[]'::jsonb
                  end,
    'resume',     case when v_req.scope = 'resume' then v_data else null end
  );
end;
$$;

/* --------------------------------- grants --------------------------------- */

revoke execute on function public.jsonb_collect_entities(jsonb, text[]) from public, anon, authenticated;

grant execute on function public.claim_membership()                    to authenticated;
grant execute on function public.is_member_of(text)                    to authenticated;
grant execute on function public.is_resume_owner(uuid)                 to authenticated;
grant execute on function public.can_read_resume(uuid)                 to authenticated;
grant execute on function public.is_review_requester(uuid)             to authenticated;
grant execute on function public.is_review_participant(uuid)           to authenticated;
grant execute on function public.can_comment_on_request(uuid, uuid)    to authenticated;
grant execute on function public.get_review_payload(uuid)              to authenticated;
grant execute on function public.university_for_email(text)            to authenticated;
