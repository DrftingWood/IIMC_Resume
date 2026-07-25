-- Phase 1 core schema: accounts, university groups, resumes, versions, review.
--
-- Targets a Supabase project, so `auth.users`, `auth.uid()`, and the
-- `authenticated` / `anon` roles are assumed to exist.

create extension if not exists pgcrypto;

/* ----------------------------- universities ------------------------------ */

create table public.universities (
  id          text primary key,           -- matches the client registry id, e.g. 'iimc'
  name        text not null,
  short_name  text not null,
  country     text not null default 'IN',
  created_at  timestamptz not null default now()
);

-- Apex domains only. Subdomains match by suffix, so listing 'iimcal.ac.in'
-- also admits 'email.iimcal.ac.in'.
create table public.university_domains (
  university_id text not null references public.universities(id) on delete cascade,
  domain        text not null check (domain = lower(domain) and domain not like '@%'),
  primary key (university_id, domain)
);

/* -------------------------------- people --------------------------------- */

create table public.profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text not null default '',
  avatar_url   text,
  headline     text,                       -- "PGP 2026 · ex-ZS" — shown next to reviews
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create type public.member_role         as enum ('student','alumni','mentor','admin');
create type public.verification_method as enum ('domain','invite','manual');
create type public.membership_status   as enum ('active','revoked');

-- Membership is never inserted by the client. It is granted server-side by
-- public.claim_membership(), which reads the verified email off auth.users.
create table public.memberships (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  university_id text not null references public.universities(id) on delete cascade,
  role          public.member_role not null default 'student',
  verified_via  public.verification_method not null,
  batch_year    int check (batch_year between 1950 and 2100),
  status        public.membership_status not null default 'active',
  created_at    timestamptz not null default now(),
  unique (user_id, university_id)
);

create index memberships_university_idx on public.memberships(university_id) where status = 'active';

/* -------------------------------- resumes -------------------------------- */

create type public.resume_visibility as enum ('private','university','link');

create table public.resumes (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references auth.users(id) on delete cascade,
  university_id   text references public.universities(id) on delete set null,
  template_id     text not null,           -- matches the client template registry id
  title           text not null default 'Untitled resume',
  visibility      public.resume_visibility not null default 'private',
  -- Live autosave target, overwritten continuously by the editor. Never
  -- exposed to anyone but the owner — reviewers read a pinned version.
  draft_data      jsonb not null default '{}'::jsonb,
  head_version_id uuid,                    -- FK added after resume_versions exists
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);

create index resumes_owner_idx on public.resumes(owner_id) where deleted_at is null;
create index resumes_university_idx on public.resumes(university_id)
  where visibility = 'university' and deleted_at is null;

-- Immutable snapshots. The F1 -> F2 -> F3 timeline, and the thing a reviewer
-- is pinned to so feedback cannot drift while the owner keeps editing.
create table public.resume_versions (
  id         uuid primary key default gen_random_uuid(),
  resume_id  uuid not null references public.resumes(id) on delete cascade,
  version_no int not null check (version_no > 0),
  data       jsonb not null,
  label      text,                         -- "F1 final", "sent to Bain"
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  unique (resume_id, version_no)
);

alter table public.resumes
  add constraint resumes_head_version_fk
  foreign key (head_version_id) references public.resume_versions(id) on delete set null;

/* -------------------------------- review --------------------------------- */

create type public.review_scope    as enum ('resume','selection');
create type public.review_audience as enum ('invited','university');
create type public.review_status   as enum ('open','answered','closed');
create type public.invitee_status  as enum ('pending','accepted','declined');

create table public.review_requests (
  id           uuid primary key default gen_random_uuid(),
  resume_id    uuid not null references public.resumes(id) on delete cascade,
  requester_id uuid not null references auth.users(id) on delete cascade,
  version_id   uuid not null references public.resume_versions(id) on delete cascade,
  scope        public.review_scope not null,
  -- Bullet ids from the resume JSON. Empty for scope='resume'.
  entity_ids   text[] not null default '{}',
  question     text not null default '',
  audience     public.review_audience not null default 'invited',
  status       public.review_status not null default 'open',
  created_at   timestamptz not null default now(),
  expires_at   timestamptz,
  constraint selection_needs_entities
    check (scope <> 'selection' or cardinality(entity_ids) > 0)
);

create index review_requests_resume_idx on public.review_requests(resume_id);

create table public.review_invitees (
  id         uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.review_requests(id) on delete cascade,
  user_id    uuid references auth.users(id) on delete cascade,
  email      text,                         -- for people without an account yet
  status     public.invitee_status not null default 'pending',
  created_at timestamptz not null default now(),
  constraint invitee_identified check (user_id is not null or email is not null)
);

create unique index review_invitees_user_uq
  on public.review_invitees(request_id, user_id) where user_id is not null;
create unique index review_invitees_email_uq
  on public.review_invitees(request_id, lower(email)) where email is not null;

create type public.comment_status as enum ('open','accepted','rejected','outdated');

create table public.comments (
  id             uuid primary key default gen_random_uuid(),
  resume_id      uuid not null references public.resumes(id) on delete cascade,
  request_id     uuid references public.review_requests(id) on delete cascade,
  parent_id      uuid references public.comments(id) on delete cascade,
  -- The bullet this comment is about. NULL means whole-resume.
  entity_id      text,
  -- Which snapshot the commenter was looking at, so stale feedback is visible
  -- as stale rather than silently misattributed.
  version_id     uuid not null references public.resume_versions(id),
  author_id      uuid not null references auth.users(id) on delete cascade,
  body           text not null default '',
  -- Suggestion mode: proposed replacement text the owner accepts in one click.
  suggested_text text,
  status         public.comment_status not null default 'open',
  resolved_by    uuid references auth.users(id),
  resolved_at    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  constraint comment_has_content
    check (length(body) > 0 or suggested_text is not null)
);

create index comments_resume_entity_idx on public.comments(resume_id, entity_id)
  where deleted_at is null;
create index comments_request_idx on public.comments(request_id) where deleted_at is null;

/* ---------------------------- links and invites --------------------------- */

-- Only the hash is stored; the raw token lives in the URL and nowhere else, so
-- a database leak does not hand out working share links.
create table public.share_links (
  id         uuid primary key default gen_random_uuid(),
  resume_id  uuid not null references public.resumes(id) on delete cascade,
  token_hash text not null unique,
  scope      public.review_scope not null,
  entity_ids text[] not null default '{}',
  version_id uuid references public.resume_versions(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

-- For people who cannot prove membership by email domain: alumni who lost
-- their institute address, external mentors.
create table public.university_invites (
  id            uuid primary key default gen_random_uuid(),
  university_id text not null references public.universities(id) on delete cascade,
  email         text not null,
  role          public.member_role not null default 'alumni',
  invited_by    uuid not null references auth.users(id) on delete cascade,
  token_hash    text not null unique,
  accepted_at   timestamptz,
  accepted_by   uuid references auth.users(id),
  expires_at    timestamptz not null default now() + interval '30 days',
  created_at    timestamptz not null default now()
);

/* ------------------------------- housekeeping ----------------------------- */

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger resumes_touch before update on public.resumes
  for each row execute function public.touch_updated_at();
create trigger comments_touch before update on public.comments
  for each row execute function public.touch_updated_at();
