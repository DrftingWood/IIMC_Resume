# Phase 1 — accounts, university groups, and bullet-level review

Design for the first backend. Reviewable on paper: nothing here has been
deployed, and no credentials are needed to read it.

The SQL lives in `supabase/migrations/`. It is tested — see [Verification](#verification).

---

## What this phase delivers

1. **Google login**, with university membership derived from the email domain.
2. **Cloud-saved resumes** with a version timeline, replacing localStorage-only.
3. **Bullet-level review**: ask for feedback on one resume point, get comments
   and one-click-acceptable suggestions back.

Everything else discussed — batch feeds, reciprocity credits, anonymised
benchmarks — is deliberately out of scope and has no tables here.

---

## The three decisions that shape everything

### 1. Membership is earned from a verified email, never asserted by the client

`memberships` has **no INSERT policy**. The only way in is
`public.claim_membership()`, a `SECURITY DEFINER` function that reads the email
off `auth.users` (populated by Google, not by the browser), checks it is
confirmed, and matches the domain against `university_domains`.

A client that could `INSERT` into `memberships` could join any university it
liked and read every university-visible resume in it. So it cannot.

Domain matching is suffix-based: listing `iimcal.ac.in` also admits
`someone@email.iimcal.ac.in`, which is the form the existing sample data uses.

### 2. Reviewers get *no row access* to resumes

This is the non-obvious one, and it is the reason the schema looks the way it
does.

Row-level security is the wrong granularity for bullet-level sharing. A resume
is **one row** holding one JSON document. Any policy permissive enough to let a
reviewer `SELECT` that row hands them the entire thing — CGPA, phone number,
email, and every bullet you did not ask about. There is no RLS policy that says
"this user may read field `positions[0].bullets[1].text` and nothing else".

So reviewers are absent from the `resumes` read policy entirely. They read
through `public.get_review_payload(request_id)`, which:

- checks the caller is actually a participant in that review,
- reads the **pinned version**, not the live draft,
- returns only the entities named in `entity_ids`,
- and reduces each one to its **scalar fields only**.

That last point is a security control rather than tidiness. If a caller names a
bullet-*group* id, returning the object wholesale would ship every sibling
bullet nested inside it. Dropping nested arrays and objects makes that
structurally impossible, so the worst case for a mis-specified id is *too
little* data.

### 3. Autosave and versions are different things

The editor autosaves continuously. One version per keystroke would be useless.

- `resumes.draft_data` — the live working copy, overwritten on every autosave.
  Only ever visible to the owner.
- `resume_versions` — immutable snapshots, created deliberately (an explicit
  "save version", or on PDF export). This is the F1 → F2 → F3 timeline.

Reviews pin to a `version_id`, so feedback cannot drift while you keep editing,
and a comment always records which text its author was actually looking at.
`resume_versions` has no UPDATE or DELETE policy — snapshots are immutable.

---

## Tables

| Table | Purpose |
|---|---|
| `universities`, `university_domains` | Reference data; mirrors `src/lib/universities.ts`, authoritative for membership |
| `profiles` | Display name, avatar, headline. Visible to people you share a university with |
| `memberships` | Who belongs to which university, with role and how they were verified |
| `resumes` | One row per resume: owner, template, visibility, live draft |
| `resume_versions` | Immutable snapshots; the version timeline |
| `review_requests` | One ask: which version, which bullets, what question, who can answer |
| `review_invitees` | Who was asked. Supports users *and* bare emails for people without accounts |
| `comments` | Threaded feedback anchored to a bullet id, optionally carrying a suggestion |
| `share_links` | Tokenised links. Only the **hash** is stored |
| `university_invites` | For people who cannot domain-verify: alumni, external mentors |

### How comments anchor to bullets

A comment stores `(resume_id, entity_id)` where `entity_id` is the stable
bullet id minted in Phase 0. Resolution is client-side: find the bullet with
that id in the document.

The alternative — normalising every bullet into its own table — was rejected
for now. It buys server-side querying across bullets, which only Phase 3's
benchmark features need, and costs a sync problem on every keystroke. The
upgrade path stays open: a `resume_bullets` projection can be added later
without touching the comment model, because comments key on `entity_id` either
way.

`comments.version_id` records which snapshot the author was reading. That is
what makes it possible to show a comment as *outdated* once the bullet changes,
rather than silently misattributing old feedback to new text.

### Suggestion mode

`comments.suggested_text` holds a proposed replacement. The owner accepting it
writes that text into the bullet in `draft_data` and flips the comment to
`accepted`. This one interaction is the thing that makes review here better
than a screenshot in a WhatsApp group.

---

## A note on policy recursion

`review_requests`' read policy needs to know about invitees; `review_invitees`'
read policy needs to know about requests. Written as plain subqueries, each
re-enters the other's policy and Postgres aborts with *"infinite recursion
detected in policy"*.

This was not theoretical — the first version of these migrations hit it, and
the test suite caught it. The fix is to run those lookups inside
`SECURITY DEFINER` helpers (`is_review_participant`, `is_review_requester`,
`can_comment_on_request`), which bypass RLS on the way in and cut the loop.

Consequence worth knowing: **do not enable `FORCE ROW LEVEL SECURITY`** on
these tables. It would apply RLS to the table owner too, and the recursion
comes straight back.

---

## Verification

`scripts/test-schema.sh` applies every migration to a throwaway Postgres
database and runs `supabase/tests/01_rls_test.sql` — 22 assertions, each of
which raises on failure.

```bash
DATABASE_URL=postgres://localhost/scratch scripts/test-schema.sh
```

Covered:

- subdomain email → correct university; personal email → refused; **unconfirmed
  email → refused**
- direct `INSERT` into `memberships` is blocked
- private resumes are invisible to same-batch peers
- `university` visibility is readable by that university and no other
- an invited reviewer gets **zero rows** from `resumes` and `resume_versions`
- ...but gets exactly the one bullet they were asked about
- the payload contains no sibling bullet, no CGPA, no email, no name
- a non-participant calling `get_review_payload` is refused
- an uninvited user cannot comment; the owner sees the comment; an unrelated
  peer does not
- you cannot create a resume owned by someone else
- versions are immutable

The suite was mutation-tested: weakening the resume read policy to `using
(true)` and making the payload return the whole document were each introduced
deliberately and each caught. It is not vacuous.

`supabase/tests/00_auth_shim.sql` stands in for the pieces Supabase provides
(`auth.users`, `auth.uid()`, the `anon`/`authenticated` roles). It is test-only
and must never be applied to a real project.

---

## Decisions

All five open questions have been answered by the owner. Recorded here so the
reasoning is not lost.

1. **Email domain** — *resolved.* `iimcal.ac.in` is correct. Suffix matching
   already covers `@email.iimcal.ac.in` and any other subdomain. No change.

2. **Placement committee rules** — *resolved: out of scope.* Owner's call. No
   per-batch gating is built; `university` visibility remains a plain
   owner-chosen setting on each resume.

3. **Alumni continuity** — *resolved.* Alumni keep their institute addresses,
   so they verify by domain exactly like current students. No secondary-email
   flow needed, and `university_invites` narrows to genuinely external people
   (industry mentors, recruiters) rather than being the alumni on-ramp.

   One consequence to be aware of: if alumni and students share a domain, the
   domain alone cannot tell them apart, so `claim_membership()` assigns
   `role = 'student'` to everyone. Distinguishing them needs a second signal —
   the simplest is asking for batch year at onboarding and deriving the role
   from it. Not built yet; it only matters once the UI wants to badge a
   reviewer as an alumnus.

4. **Storing grades and contacts** — *resolved: yes, store them.* Unchanged;
   the schema always did. DPDP does not restrict what may be stored here — the
   only thing it adds is that when a user asks to delete their account, the
   erasure has to be real rather than a `deleted_at` flag. That is one cascade
   function, not a constraint on the data model, and it is not built yet.

5. **Google `hd` claim** — *resolved: do not gate on it.* Since alumni keep
   institute addresses, requiring a Workspace-managed account risks locking out
   the most valuable reviewers if those accounts are ever downgraded. Email
   domain stays the gate. Record `hd` when Google sends it, require nothing.

---

## What I need from you to build it

I cannot create a Supabase project or hold credentials. You would need to:

1. Create the project, run the migrations in `supabase/migrations/` in order.
2. Enable Google as an auth provider.
3. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` as Vercel env vars.

Once those exist I can write the client against them: auth, the resume library,
sync replacing `src/lib/storage.ts`, and the review UI.
