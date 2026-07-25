-- Row-level security. Default posture is deny: every table below has RLS on
-- and grants nothing beyond what a policy explicitly allows.

alter table public.universities        enable row level security;
alter table public.university_domains  enable row level security;
alter table public.profiles            enable row level security;
alter table public.memberships         enable row level security;
alter table public.resumes             enable row level security;
alter table public.resume_versions     enable row level security;
alter table public.review_requests     enable row level security;
alter table public.review_invitees     enable row level security;
alter table public.comments            enable row level security;
alter table public.share_links         enable row level security;
alter table public.university_invites  enable row level security;

/* ------------------------- reference data (public) ------------------------ */

create policy universities_read on public.universities
  for select to authenticated, anon using (true);

create policy university_domains_read on public.university_domains
  for select to authenticated, anon using (true);

/* -------------------------------- profiles -------------------------------- */

-- Visible to people you share a university with, plus yourself.
create policy profiles_read on public.profiles
  for select to authenticated
  using (
    id = auth.uid()
    or exists (
      select 1
      from public.memberships mine
      join public.memberships theirs
        on theirs.university_id = mine.university_id
      where mine.user_id = auth.uid()
        and mine.status = 'active'
        and theirs.user_id = public.profiles.id
        and theirs.status = 'active'
    )
  );

create policy profiles_insert_self on public.profiles
  for insert to authenticated with check (id = auth.uid());

create policy profiles_update_self on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

/* ------------------------------- memberships ------------------------------ */

create policy memberships_read on public.memberships
  for select to authenticated
  using (user_id = auth.uid() or public.is_member_of(university_id));

-- No insert/update/delete policy on purpose. Membership is granted only by
-- public.claim_membership(), which verifies the email server-side. A client
-- that could INSERT here could join any university it liked.

/* --------------------------------- resumes -------------------------------- */

-- Note there is no reviewer clause here. Reviewers read through
-- public.get_review_payload(); giving them row access would expose draft_data
-- and every field they were not asked about.
create policy resumes_read on public.resumes
  for select to authenticated using (public.can_read_resume(id));

create policy resumes_insert_own on public.resumes
  for insert to authenticated with check (owner_id = auth.uid());

create policy resumes_update_own on public.resumes
  for update to authenticated
  using (owner_id = auth.uid() and deleted_at is null)
  with check (owner_id = auth.uid());

create policy resumes_delete_own on public.resumes
  for delete to authenticated using (owner_id = auth.uid());

/* ----------------------------- resume versions ---------------------------- */

create policy resume_versions_read on public.resume_versions
  for select to authenticated using (public.can_read_resume(resume_id));

create policy resume_versions_insert_own on public.resume_versions
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.is_resume_owner(resume_id)
  );

-- Versions are immutable: no update or delete policy.

/* ------------------------------ review requests --------------------------- */

create policy review_requests_read on public.review_requests
  for select to authenticated using (public.is_review_participant(id));

create policy review_requests_insert_own on public.review_requests
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and public.is_resume_owner(resume_id)
  );

create policy review_requests_update_own on public.review_requests
  for update to authenticated
  using (requester_id = auth.uid()) with check (requester_id = auth.uid());

/* ------------------------------ review invitees --------------------------- */

create policy review_invitees_read on public.review_invitees
  for select to authenticated
  using (user_id = auth.uid() or public.is_review_requester(request_id));

create policy review_invitees_insert on public.review_invitees
  for insert to authenticated
  with check (public.is_review_requester(request_id));

-- An invitee may accept or decline their own row.
create policy review_invitees_update_self on public.review_invitees
  for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

/* -------------------------------- comments -------------------------------- */

create policy comments_read on public.comments
  for select to authenticated
  using (
    deleted_at is null
    and (
      author_id = auth.uid()
      or public.is_resume_owner(resume_id)
      or (request_id is not null and public.is_review_participant(request_id))
    )
  );

-- You may comment if you own the resume, or if you are a participant in the
-- review request the comment belongs to.
create policy comments_insert on public.comments
  for insert to authenticated
  with check (
    author_id = auth.uid()
    and (
      public.is_resume_owner(resume_id)
      or (request_id is not null and public.can_comment_on_request(request_id, resume_id))
    )
  );

create policy comments_update_author on public.comments
  for update to authenticated
  using (author_id = auth.uid()) with check (author_id = auth.uid());

-- The resume owner resolves suggestions (accept / reject) on their own resume.
create policy comments_resolve_owner on public.comments
  for update to authenticated
  using (public.is_resume_owner(resume_id))
  with check (public.is_resume_owner(resume_id));

/* ------------------------- share links and invites ------------------------ */

-- Owner-only. Anonymous redemption happens through a definer RPC that takes the
-- raw token and compares against token_hash, never by selecting these rows.
create policy share_links_owner on public.share_links
  for all to authenticated
  using (public.is_resume_owner(resume_id))
  with check (created_by = auth.uid() and public.is_resume_owner(resume_id));

create policy university_invites_read on public.university_invites
  for select to authenticated
  using (invited_by = auth.uid() or public.is_member_of(university_id));

create policy university_invites_insert on public.university_invites
  for insert to authenticated
  with check (invited_by = auth.uid() and public.is_member_of(university_id));

/* --------------------------------- grants --------------------------------- */

grant usage on schema public to anon, authenticated;

grant select on public.universities, public.university_domains to anon, authenticated;
grant select, insert, update on public.profiles to authenticated;
grant select on public.memberships to authenticated;
grant select, insert, update, delete on public.resumes to authenticated;
grant select, insert on public.resume_versions to authenticated;
grant select, insert, update on public.review_requests to authenticated;
grant select, insert, update on public.review_invitees to authenticated;
grant select, insert, update on public.comments to authenticated;
grant select, insert, update, delete on public.share_links to authenticated;
grant select, insert on public.university_invites to authenticated;
