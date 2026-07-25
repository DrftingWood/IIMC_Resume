-- RLS and review-projection tests. Run with scripts/test-schema.sh.
--
-- Every check raises on failure, and the runner uses ON_ERROR_STOP, so a silent
-- pass means every assertion below actually held.

\set ON_ERROR_STOP on

/* ------------------------------- fixtures --------------------------------- */

insert into public.universities (id, name, short_name, country) values
  ('iimb', 'Indian Institute of Management Bangalore', 'IIM Bangalore', 'IN')
on conflict (id) do nothing;
insert into public.university_domains (university_id, domain) values
  ('iimb', 'iimb.ac.in')
on conflict do nothing;

-- owner and peer are IIMC (owner via a subdomain address, to exercise suffix
-- matching); outsider is IIMB; mentor has no institute address at all.
insert into auth.users (id, email, email_confirmed_at) values
  ('11111111-1111-1111-1111-111111111111', 'owner@email.iimcal.ac.in', now()),
  ('22222222-2222-2222-2222-222222222222', 'peer@iimcal.ac.in',        now()),
  ('33333333-3333-3333-3333-333333333333', 'outsider@iimb.ac.in',      now()),
  ('44444444-4444-4444-4444-444444444444', 'mentor@gmail.com',         now()),
  ('55555555-5555-5555-5555-555555555555', 'unverified@iimcal.ac.in',  null);

insert into public.profiles (id, display_name) values
  ('11111111-1111-1111-1111-111111111111', 'Owner'),
  ('22222222-2222-2222-2222-222222222222', 'Peer'),
  ('33333333-3333-3333-3333-333333333333', 'Outsider'),
  ('44444444-4444-4444-4444-444444444444', 'Mentor');

/* --------------------- 1. membership is earned, not asserted -------------- */

set role authenticated;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
declare m public.memberships;
begin
  m := public.claim_membership();
  if m.university_id <> 'iimc' then
    raise exception 'FAIL 1a: subdomain email should map to iimc, got %', m.university_id;
  end if;
  if m.verified_via <> 'domain' then
    raise exception 'FAIL 1b: expected domain verification';
  end if;
end $$;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
select public.claim_membership() \gset ignored_
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
select public.claim_membership() \gset ignored_

-- A personal address matches no university, so no membership is granted.
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
do $$
begin
  perform public.claim_membership();
  raise exception 'FAIL 2: gmail.com should not map to a university';
exception when sqlstate '42501' then null;
end $$;

-- An unconfirmed email must never be trusted, even on a known domain.
set request.jwt.claim.sub = '55555555-5555-5555-5555-555555555555';
do $$
begin
  perform public.claim_membership();
  raise exception 'FAIL 3: unverified email must not grant membership';
exception when sqlstate '28000' then null;
end $$;

-- Direct insert is the attack this design exists to stop.
set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
do $$
begin
  insert into public.memberships (user_id, university_id, verified_via)
  values (auth.uid(), 'iimc', 'domain');
  raise exception 'FAIL 4: client must not be able to self-grant membership';
exception when insufficient_privilege then null;
end $$;

reset role;

/* ------------------------------ 2. resume data ---------------------------- */

insert into public.resumes (id, owner_id, university_id, template_id, title, visibility, draft_data)
values (
  'aaaaaaaa-0000-0000-0000-00000000000a',
  '11111111-1111-1111-1111-111111111111',
  'iimc', 'iimc', 'F1 Resume', 'private',
  '{}'::jsonb
);

insert into public.resume_versions (id, resume_id, version_no, data, created_by)
values (
  'bbbbbbbb-0000-0000-0000-00000000000b',
  'aaaaaaaa-0000-0000-0000-00000000000a',
  1,
  $json$
  {
    "name": "ROHAN SENGUPTA",
    "email": "rohan.sengupta@email.iimcal.ac.in",
    "education": [
      {"id": "edu-1", "degree": "MBA", "institute": "IIMC", "gpa": "7.62/9", "year": "2026"}
    ],
    "positions": [
      {"id": "pos-1", "title": "Secretary", "year": "2025",
       "bullets": [
         {"id": "b-1", "text": "Led a 5-member team to cut SKU wastage by 18%"},
         {"id": "b-2", "text": "SECRET SIBLING BULLET"}
       ]}
    ]
  }
  $json$::jsonb,
  '11111111-1111-1111-1111-111111111111'
);

update public.resumes
   set head_version_id = 'bbbbbbbb-0000-0000-0000-00000000000b'
 where id = 'aaaaaaaa-0000-0000-0000-00000000000a';

-- Owner asks the mentor about one bullet only.
insert into public.review_requests (id, resume_id, requester_id, version_id, scope, entity_ids, question, audience)
values (
  'cccccccc-0000-0000-0000-00000000000c',
  'aaaaaaaa-0000-0000-0000-00000000000a',
  '11111111-1111-1111-1111-111111111111',
  'bbbbbbbb-0000-0000-0000-00000000000b',
  'selection', array['b-1'], 'Is the impact quantified well enough?', 'invited'
);

insert into public.review_invitees (request_id, user_id)
values ('cccccccc-0000-0000-0000-00000000000c', '44444444-4444-4444-4444-444444444444');

/* --------------------------- 3. whole-document reads ---------------------- */

set role authenticated;

set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
begin
  if (select count(*) from public.resumes) <> 1 then
    raise exception 'FAIL 5: owner should see their own resume';
  end if;
end $$;

-- Private means private, even to your own batch.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  if (select count(*) from public.resumes) <> 0 then
    raise exception 'FAIL 6: a private resume must not be visible to peers';
  end if;
end $$;

reset role;
update public.resumes set visibility = 'university'
 where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set role authenticated;

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  if (select count(*) from public.resumes) <> 1 then
    raise exception 'FAIL 7: same-university peer should see a university resume';
  end if;
end $$;

set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
do $$
begin
  if (select count(*) from public.resumes) <> 0 then
    raise exception 'FAIL 8: another university must not see it';
  end if;
end $$;

reset role;
update public.resumes set visibility = 'private'
 where id = 'aaaaaaaa-0000-0000-0000-00000000000a';
set role authenticated;

/* ------------------- 4. the bullet-level sharing guarantee ---------------- */

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';

-- The invited reviewer gets no row access at all: no draft_data, no PII.
do $$
begin
  if (select count(*) from public.resumes) <> 0 then
    raise exception 'FAIL 9: reviewers must not have row access to resumes';
  end if;
  if (select count(*) from public.resume_versions) <> 0 then
    raise exception 'FAIL 10: reviewers must not have row access to versions';
  end if;
end $$;

-- ...but they can read exactly the bullet they were asked about.
do $$
declare
  payload  jsonb;
  entities jsonb;
  blob     text;
begin
  payload  := public.get_review_payload('cccccccc-0000-0000-0000-00000000000c');
  entities := payload->'entities';

  if jsonb_array_length(entities) <> 1 then
    raise exception 'FAIL 11: expected exactly 1 bullet, got %', jsonb_array_length(entities);
  end if;
  if entities->0->>'id' <> 'b-1' then
    raise exception 'FAIL 12: wrong bullet returned: %', entities->0->>'id';
  end if;
  if entities->0->>'text' not like 'Led a 5-member team%' then
    raise exception 'FAIL 13: bullet text missing';
  end if;
  if payload->'resume' <> 'null'::jsonb then
    raise exception 'FAIL 14: selection scope must not return the whole resume';
  end if;

  -- Nothing the reviewer was not asked about may appear anywhere in the payload.
  blob := payload::text;
  if blob like '%SECRET SIBLING BULLET%' then
    raise exception 'FAIL 15: sibling bullet leaked';
  end if;
  if blob like '%7.62/9%' or blob like '%rohan.sengupta@%' or blob like '%ROHAN SENGUPTA%' then
    raise exception 'FAIL 16: personal data leaked into a bullet-only review';
  end if;
end $$;

-- A stranger cannot read the payload just by knowing the request id.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  perform public.get_review_payload('cccccccc-0000-0000-0000-00000000000c');
  raise exception 'FAIL 17: non-participant must be refused';
exception when sqlstate '42501' then null;
end $$;

/* -------------------------------- 5. comments ----------------------------- */

set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
do $$
begin
  insert into public.comments (resume_id, request_id, entity_id, version_id, author_id, body, suggested_text)
  values (
    'aaaaaaaa-0000-0000-0000-00000000000a',
    'cccccccc-0000-0000-0000-00000000000c',
    'b-1',
    'bbbbbbbb-0000-0000-0000-00000000000b',
    auth.uid(),
    'Quantify the baseline too.',
    'Led a 5-member team to cut SKU wastage 18% (from 22% to 4%) across 3 warehouses'
  );
end $$;

-- A peer who was never invited cannot comment.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  insert into public.comments (resume_id, request_id, entity_id, version_id, author_id, body)
  values (
    'aaaaaaaa-0000-0000-0000-00000000000a',
    'cccccccc-0000-0000-0000-00000000000c',
    'b-1',
    'bbbbbbbb-0000-0000-0000-00000000000b',
    auth.uid(),
    'let me in'
  );
  raise exception 'FAIL 18: uninvited user must not be able to comment';
exception when insufficient_privilege then null;
end $$;

-- The owner sees the review comment on their own resume.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
begin
  if (select count(*) from public.comments where entity_id = 'b-1') <> 1 then
    raise exception 'FAIL 19: owner should see the reviewer comment';
  end if;
end $$;

-- ...and an unrelated peer does not.
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  if (select count(*) from public.comments) <> 0 then
    raise exception 'FAIL 20: comments must not leak to non-participants';
  end if;
end $$;

/* --------------------------- 6. ownership integrity ----------------------- */

set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$
begin
  insert into public.resumes (owner_id, template_id, title)
  values ('11111111-1111-1111-1111-111111111111', 'iimc', 'not mine');
  raise exception 'FAIL 21: must not be able to create a resume owned by someone else';
exception when insufficient_privilege then null;
end $$;

-- Versions are immutable; there is no update policy or grant.
set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$
begin
  update public.resume_versions set data = '{}'::jsonb
   where id = 'bbbbbbbb-0000-0000-0000-00000000000b';
  raise exception 'FAIL 22: resume versions must be immutable';
exception when insufficient_privilege then null;
end $$;

reset role;

\echo 'ALL SCHEMA TESTS PASSED'
