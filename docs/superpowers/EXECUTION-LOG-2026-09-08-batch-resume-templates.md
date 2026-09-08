# SDD ledger — plan: docs/superpowers/plans/2026-09-08-batch-resume-templates.md

Spec: docs/superpowers/specs/2026-09-08-batch-resume-templates-design.md (read, reachable)
Isolation: branch feat/batch-resume-templates (not main/master). No separate worktree;
the branch is the isolation boundary and the repo had no uncommitted work at start.
Branch base: 6b02291 (merge-base with main)

## Pre-flight scan

### Cross-task rows (tasks sharing a file or an interface)

| Tasks | Produces -> Consumes | Finding |
|---|---|---|
| T1 -> T2 | golden test imports @/templates/iimc/parser -> T2 renames it | OK, T2 Step 1 updates the import |
| T1 -> T8 | TextItem without `rotated` -> T8 adds it as required | OK, T8 Step 4 regenerates fixtures; `as TextItem[]` is an assertion so T2-T7 still compile |
| T1 -> T17 | linesFromPdf -> corpus test | OK |
| T2 -> T3 | registry.ts, Landing.tsx | OK, different regions |
| T3 -> T4 | registry test asserts ['superset'] -> ['superset','skynet'] | OK, T4 Step 4 updates it |
| T4 -> T5 | copy carries resumeType/rank -> T5 removes them | OK, T5 Step 5 fixes fallout |
| T5 -> T6 | parser.ts local DEFAULT_SECTION_ORDER still 5 keys | LATENT: wrong value between T5 and T6; no T5 test asserts on it, T6 Step 3 fixes. Accepted. |
| T5 -> T9 | placeholder projects/entrepreneurial/hiddenSections | OK, T9 Step 4 replaces them |
| T6 -> T7 | T6 Step 5 may leave the glyph test red | OK, documented and intentional; T7 closes it |
| T6 -> T10 | education call site 'ACADEMIC PROFILE' -> fallback loses `ranked` | OK, T10 Step 3 shows the full call site |
| T7 -> T8 | both edit parseIndustry | OK, sequential |
| T11 -> T16 | T11 already adds the hidden filter to skynet Preview | CONFLICT 1 |
| T13 -> T14 | both edit Landing.tsx | OK, different regions |
| T14 -> devcv | codename becomes required on TemplateConfig | CONFLICT 2 |
| T3 -> T15 | T3 deletes setPreEditorView, still referenced by onChangeTemplate | CONFLICT 3 |
| T15 -> T16 | SHARED_KEYS predates superset hiddenSections | OK, T16 Step 5 amends it |
| T13/T14 -> Global Constraints | constraints name only T2/T3/T15/T16 as touching Superset | CONFLICT 4 |

### Per-task self-consistency rows

| Task | Tests vs code | Files created vs later touched | Finding |
|---|---|---|---|
| T1 | golden test vs pdfExtract refactor | fixtures created, regenerated T8 | consistent |
| T2 | migration test vs storage.ts rewrite | superset/ created, touched T13/T14/T16 | consistent |
| T3 | registry test vs registry.ts | App.tsx touched again T15 | see CONFLICT 3 |
| T4 | registry test vs copy | skynet/ touched T5-T12 | consistent |
| T5 | types test vs types.ts + hydrate.ts | consistent |
| T6 | parser test vs anchors/glyph | consistent |
| T7 | truncation test vs yearX = Infinity | consistent |
| T8 | rotation test vs TextItem.rotated | requires fixture regen, stated | consistent |
| T9 | optional-sections test vs ANCHOR_TO_KEY | consistent |
| T10 | education test vs parseEducation | consistent |
| T11 | preview test needs h2 + default sectionOrder in SAMPLE | Step 4 mandates h2; SAMPLE order implied not stated | NOTE 1 |
| T12 | form test vs accordion titles | consistent |
| T13 | detect test vs batch.ts | Landing needs new imports, not stated | NOTE 2 |
| T14 | landing test vs card markup | anchored regexes match one button each | consistent |
| T15 | migrate test vs SHARED_KEYS | consistent |
| T16 | panel test vs checkbox markup | consistent |
| T17 | corpus test vs counts from spec research | consistent |

## Rulings

Ruling: T16 Step 6 applies to src/templates/superset/Preview.tsx ONLY — skynet's Preview
already gained the hidden-section filter in T11 Step 4. Applying it twice is a no-op at best
and a double-filter bug at worst. Cost if wrong: skynet preview stops honouring hiddenSections,
caught immediately by T11's own preview test which T16 re-runs.

Ruling: T14 Step 3 must also add `codename: 'Developer CV'` to src/templates/devcv/index.ts.
devcv is unregistered but still inside tsconfig's `include: ["src"]`, so a required `codename`
on TemplateConfig breaks its compilation and `npm run build` fails at T14 Step 6. Keeping the
field required (rather than optional) preserves the guard the plan wanted. Cost if wrong:
build breaks at T14 and the implementer fixes it there anyway.

Ruling: T3 Step 4 must also neutralise `onChangeTemplate`, which calls the
`setPreEditorView('gallery')` that same step deletes. T3 sets its body to
`setTemplateId(null); setData(null);`; T15 Step 4 replaces it with the real batch toggle.
Cost if wrong: T3 fails to build, caught by its own Step 6 build check.

Ruling: the Global Constraints line naming T2/T3/T15/T16 as the tasks touching Superset is
incomplete — T13 edits superset/detect.ts and T14 edits superset/index.ts. Both are covered by
their own tests (T13 asserts detectSuperset behaviour; T14 by the build). The constraint's
intent — Superset's *parser* stays frozen, guarded by the golden snapshot — is unaffected.
Cost if wrong: nothing; this is a documentation correction, not a behaviour change.

NOTE 1 (carried into T11 dispatch): SAMPLE.sectionOrder must be the default 7-key order for
the preview test's first assertion to hold.
NOTE 2 (carried into T13 dispatch): Landing.tsx needs imports for batchNumberFromLines and
templateForBatch.

## Progress

### Model assignments (implementers)

sonnet  T1  toolchain setup, PDF paths, fixture generation - judgment
sonnet  T2  repo-wide sed rename + storage rewrite - integration
haiku   T3  small deletions, complete code in brief
haiku   T4  mechanical copy + sed
sonnet  T5  types rewrite with compile-error fallout across 5 files
sonnet  T6  edits inside a 950-line parser
haiku   T7  one-line substitution, complete code
sonnet  T8  cross-file TextItem change + fixture regen + parseIndustry
sonnet  T9  parser additions, complete code but multi-site
haiku   T10 single-function replacement, complete code
sonnet  T11 Preview rewrite + sample data authoring
haiku   T12 two insertions + one deletion, complete code
sonnet  T13 new lib + two detectors + Landing wiring
sonnet  T14 Landing markup + required-field ripple
sonnet  T15 new mapper + App/AppHeader wiring
sonnet  T16 touches both templates, 5 files
haiku   T17 one new test file + README edit
opus    FINAL whole-branch review

Reviewers: haiku for single-file mechanical diffs, sonnet otherwise.

Task 1: implementer DONE_WITH_CONCERNS -> commit 07841fe. Controller independently verified
fixtures: grep for <real-name-tokens> = 0 hits; MBA ids
are only 9001/63, 9002/63, 9003/63, 9004/61; emails only arun|priya|kabir@email.iimcal.ac.in.
Implementer deviated from the brief to fix two real anonymisation bugs in make-fixture.mjs
(joined-text regex over-matched so real roll numbers survived; split text runs let a real first
name survive). Deviation accepted - the brief's code was wrong.

Ruling: fixture BULLET TEXT remains verbatim from the source resumes. Direct identifiers
(name, MBA id, email) are scrubbed, but achievement text is real and is re-identifying in
principle (e.g. a named gold medal at a named institute in a named year). Scrubbing it would
break the parser tests, which assert on real substrings by design (T7 asserts /Environment
Management/ and /mines/ to prove bullets are not truncated). Proceeding with text intact.
Cost if wrong: three students' achievement text would sit in a public repo if this branch is
ever pushed. Mitigation: nothing is pushed; I will not push. This is surfaced to the human as
a merge-gate decision, not a code decision.

Task 1: minor (deferred): fixture `name` field triplicates ("Devika Iyer Devika Iyer Devika
Iyer") because the source name spanned 3 text runs and each was replaced independently.
Cosmetic, no real identity, not asserted by any test.
Task 1: review = spec OK, quality Approved. 1 Important + 3 Minor.
Task 1: minor (deferred): test/ not in tsconfig include and vitest does not typecheck by
default - new test code has no enforced strict-mode check.
Task 1: minor (deferred): pre-existing comments dropped during groupIntoLines extraction
(matches the brief's own snippet, harmless).
Task 1: fix round 1/5 dispatched - Important: make-fixture.mjs has no built-in leak detection;
safety rests entirely on a manual grep. Load-bearing because Task 8 regenerates all fixtures.
Task 1: fix round 1/5 (1 addressed, 0 open; commits 07841fe..de1bb90). Re-review ADDRESSED at
make-fixture.mjs:74-117, checks run before writeFile, no new breakage. BUT re-review surfaced a
new Important weakness inside the finding's own scope: check 1 (line 80) tests the
pre-extracted `realId` rather than scanning output for a live MBA/<d>/<d> pattern, so if a real
id were split across text runs `realId` is undefined and the `realId &&` guard skips the check
entirely - a vacuous pass. Check 4 gives no backstop because its filename tokenizer discards
all-digit segments. Same bug class as the name leak that actually happened. Entering round 2.
Task 1: fix round 2/5 (0 addressed, 1 open - check 1 width-bound to the fake id's digit shape
at make-fixture.mjs:96 reopens a vacuous pass: if some id occurrences scrub to the fake shape
(satisfying the non-zero check) while a differently-shaped split occurrence survives, check 1
passes silently and the file is written; commits de1bb90..ec52be0). Entering round 3 with the
re-reviewer's specific remedy: open-ended \d+ guarded by a non-digit lookahead.
Task 1: fix round 3/5 (1 addressed, 0 open; commits ec52be0..287b0b9). Re-review ADDRESSED at
make-fixture.mjs:120-121. Controller's own suggested regex was defective - (?!\d) after greedy
\d+ is a no-op; implementer diagnosed the real cause (items joined with no separator, pdfjs
array order != reading order) and rescanned groupIntoLines-reconstructed text instead. Confirmed
a split id still reassembles because groupIntoLines only inserts a space when x-gap > 1.5.
Task 1: minor (deferred): make-fixture.mjs imports a .ts file relying on Node native type
stripping (needs Node >=22.6 flagged / >=23.6 default). No engines field, no comment. Works on
the pinned v24.11.1; silent trap for a contributor on older Node.
Task 1: complete (commits 5e75abb..287b0b9, review clean after 3 fix rounds)
Task 2: review = spec OK, quality Approved. 1 Important (plan-mandated) + 1 Minor.
Ruling: the Important finding stands and gets fixed. migrateLegacyDraft() iterates
[OLD_DRAFT_KEY, IIMC_DRAFT_KEY], so when both exist the OLDER pre-multi-template draft wins and
the NEWER iimc-slot draft is silently discarded (and still deleted). The plan mandated that
order, but the plan is the spec's argument, not its authority, and the spec's intent is that no
stored draft is orphaned. Newer-wins is obviously the correct precedence. Remedy: iterate
[IIMC_DRAFT_KEY, OLD_DRAFT_KEY]. Cost if wrong: negligible - the both-keys state requires a
prior removeItem to have failed, so it is rare either way; the change cannot lose more than the
current order does.
Task 2: bundling one Minor into the same round since the round is happening anyway: migration
test 2 passes via the draft-key fallback as well as the lastTemplateId rewrite, so it does not
isolate what its name claims.
Task 2: fix round 1/5 dispatched.
Task 2: fix round 1/5 (2 addressed, 0 open; commits 0df2cd7..e79b1b7). Re-review confirmed
newest-first ordering at storage.ts:16-24 with an explanatory comment, both keys removed on
every path, and the new precedence test asserts {name:'NEW'} specifically (verified failing
against the old order before the fix was restored).
Task 2: complete (commits 287b0b9..e79b1b7, review clean)
Task 3: review = spec OK, quality Approved, no findings. Pre-flight Ruling 3 (onChangeTemplate
stopgap) verified applied exactly: body is setTemplateId(null); setData(null); function present
at App.tsx:127-130; header button still wired via AppHeader.tsx:49 / App.tsx:157.
Task 3: complete (commits e79b1b7..ff621e9, review clean, no fix rounds)
Task 4: review = spec OK, quality Approved. Controller pre-verified copy fidelity mechanically:
diff of each skynet file vs its superset original with the rename normalised = 0 differing lines
for parser/types/hydrate/detect/Preview/Form/SectionsPanel/sample; index.ts = exactly the 2
intended lines (label, description). All five "must not have happened" checks passed (no
codename yet; resumeType/ResumeType/rank still present for Task 5 to remove; superset and devcv
untouched; skynet genuinely registered).
Task 4: minor (deferred): task-4-report.md mischaracterises the brief - it claims Step 1's sed
omitted sample.ts, but the brief's file list includes it. Report accuracy only, code is correct.
Task 4: complete (commits ff621e9..7aa7f78, review clean, no fix rounds)
Task 5: review = spec OK, quality Approved. All 7 SECTION_LABELS and all 7 DEFAULT_SECTION_ORDER
keys character-verified against the brief (incl. singular "Position of Responsibility").
hydrateSkynet hand-traced across 6 scenarios - no type violation, no data loss.
Task 5: minor (deferred): the brief's own SECTION_LABELS test only asserts 4 of 7 labels;
reviewer verified the other 3 by hand but the test does not cover them.
Task 5: minor (deferred): hydrateSkynet does not strip stale excess properties, so an old
resumeType survives in a loaded draft as untyped dead data. Brief's verbatim code.
Task 5: complete (commits 7aa7f78..caa9e0f, review clean, no fix rounds)
Task 6: review = spec OK, quality Approved, no findings. All four new tests confirmed
non-vacuous; glyph test guards with texts.length > 10 and skynet-a carries 25 U+25A0 in Industry
Experience, so all three bullet sources genuinely contribute. Grep confirms no ACADEMIC
QUALIFICATIONS / plural POSITIONS OF RESPONSIBILITY remain. The anticipated Task 7 partial
failure did not occur - carried into Task 7 as a sanity check, not an assumption that
truncation is already fixed (Task 7 tests truncation, not glyphs - different failure).
Task 6: complete (commits caa9e0f..6ce22d0, review clean, no fix rounds)
Task 7: implementer DONE_WITH_CONCERNS - the truncation test PASSED before the production change.
Controller investigated rather than accepting. Root cause established: findBulletXInfo locates
the bullet column via BULLET_GLYPH_RE; before Task 6 the U+25A0 glyph was unrecognised, glyphXs
was empty, and it fell through to a heuristic fallback intended for a LaTeX template that draws
bullets as vector paths - producing a wrong bulletX and corrupting column classification. THAT
was the truncation cause, not findYearX. Task 6 fixed it incidentally by adding the glyph.
The spec's stated cause (a single global year-column threshold) was wrong on this point; the
observed truncation in the original diagnostic run was real, the attribution was not.

Ruling: the yearX = Infinity change STANDS. Industry Experience genuinely has no year column in
this format (dates sit on the firm banner row), so deriving a threshold there is wrong in
principle and remains a live hazard on the 449 corpus resumes where findYearX may still misfire
even though skynet-a no longer does. But the change is currently unguarded - its test passes
with or without it. Remedy: make the assertion discriminating by diffing each industry bullet
against the raw fixture line text, and require proof it can fail. Cost if wrong: a defensive
one-line change is retained that this fixture cannot exercise; Task 17's 450-resume corpus run
is the real guard and will expose it either way.

Ruling: the implementer committed instead of returning NEEDS_CONTEXT as instructed when the
before-test passed. Accepted rather than reverted - the information reached me intact and the
commit is correct. Flagged in the fix dispatch so it does not recur.
Task 7: fix round 1/5 dispatched.
Task 7: fix round 1/5 (1 addressed, 0 open; commits 8ce7d71..7b5d578). Re-review ADDRESSED at
test/skynet-parser.test.ts:36-58 and parser.ts:698-707. Test proven discriminating: fails at
yearX=547 with output cut to "...Environment Management in". Min-count guard present
(bullets.length > 5). findYearX still defined at :307 and still used at :554 and :633.
Ruling: accepted the re-reviewer's CLOSE. The narrow content-regex guards only the one known
bullet and is coupled to skynet-a's exact sentence, so regenerating that fixture would silently
defang it. Accepted because the finding is Important not Critical, the fail-proof is real, and
Task 17's corpus check diffs EVERY bullet against raw pdfjs line text across 450 resumes.
CARRY-FORWARD into Task 17: its corpus assertion must explicitly cover industry-experience
bullet completeness, otherwise this gap has no owner. Cost if wrong: a non-"Environment
Management" industry bullet could truncate undetected until the corpus run.
Task 7: minor (deferred): the yearX comment repeats "dates live on the firm banner row" twice.
Task 7: complete (commits 6ce22d0..7b5d578, review clean after 1 fix round)
Task 8: review = spec OK, quality Approved, 2 Important + 1 Minor. Deviation verdict: the
implementer's explanation is TRUE, verified empirically - skynet-a's rotated "Full Time" item
sits at y=332.52, within groupIntoLines' 4.5pt tolerance of a bullet line at y=330.8, so the
brief's every(it=>it.rotated) whole-line filter could never match. My brief was wrong; the
per-item split is correct and downstream fields are recomputed, not left stale. All three
TextItem rotated expressions verified identical - no drift.
Ruling: BOTH Important findings get fixed rather than parked, and finding 1 is more serious than
the reviewer graded it. The corpus has Full Time in 270/450 files and Intern in 350/450, so most
resumes carry BOTH margin labels - multi-group assignment is the NORMAL case, not an edge case,
and typeForY's nearest-y heuristic is unproven for exactly that case. No existing fixture has
more than one margin group, so there is no coverage at all. Remedy: add a 4th fixture built from
a corpus resume that has both labels, switch to span-based assignment, and assert per-firm label
correctness. Cost if wrong: every multi-group resume could silently mislabel its experience
entries as Full Time vs Intern, which is user-visible in the exported PDF.
Task 8: minor (deferred): "assigns a margin type" test only checks set membership, not which
label goes where, and runs only on skynet-a.
Task 8: fix round 1/5 dispatched.
Task 8: fix round 1/5 (2 addressed, 0 open; commits f5383ff..646c080). Re-review verified both
implementer claims independently against the fixture: span containment IS structurally
impossible (Full Time span [358.42,431.86], Intern [241.71,291.27], ADM Group banner y=330.99
outside both), and nearest-y IS wrong on real data (|330.99-395.14|=64.15 vs
|330.99-266.49|=64.50, a 0.35pt margin picking Full Time when the truth is Intern). The
contiguous-partition replacement is correct: contiguousSplits cannot zero out a label, blocks
and labels are both sorted top-down consistently, split costs 28.425 vs 34.48 confirmed at
runtime. Per-firm assertions are by firm NAME not index.
Note: skynet-d's ground truth (ADM Group = Intern) rests on a PDF render the implementer did,
not on anything re-derivable from committed data. Documented in the test comment. Accepted.
Task 8: parked (deferred, tracked): the labels > blocks degenerate branch still uses plain
nearest-anchor and is unexercised - unreachable in the observed corpus since a label only
renders when it owns at least one firm. Honestly flagged in-code at parser.ts:821-826.
Task 8: parked (deferred, tracked): the 3-label "Others" case is unverified end to end. The
algorithm generalises structurally to k=3; Others is 12/450 files (2.7%).
Task 8: complete (commits 7b5d578..646c080, review clean after 1 fix round)

CARRY-FORWARD LIST FOR TASK 17 (corpus test over all 450 resumes) - these three gaps have no
other owner and Task 17's dispatch must name them explicitly:
 (1) industry-experience bullet completeness (from Task 7 - the unit test guards only one bullet)
 (2) the 3-label "Others" margin group (from Task 8 - 12 files carry it)
 (3) resumes where the margin-label count exceeds the firm-block count (from Task 8)
Task 9: review = spec OK, quality Approved, 1 Important. Reviewer independently re-derived all
four fixtures' sectionOrder/hiddenSections (temp vitest file, deleted after) and confirmed each
is self-consistent: 7 unique keys, hidden subset of order, present sections never hidden, hidden
tail in DEFAULT_SECTION_ORDER relative order. Both new sections genuinely delegate to
parseBulletTable; ANCHOR_TO_KEY module-scope and character-exact; trySection wraps both.
Important confirmed: the section-order test asserts indexOf('projects') < indexOf('industry')
on skynet-c, which holds under the OLD hardcoded [...DEFAULT_SECTION_ORDER] too (projects=2,
industry=4), so it cannot fail either way. Discriminating replacement identified and verified:
skynet-a orders industry(2) before entrepreneurial(3), the opposite of DEFAULT.
Task 9: fix round 1/5 dispatched.
Task 9: fix round 1/5 (2 addressed, 0 open; commits 0992e3e..15032e4). Re-review confirmed both
assertions retained (skynet-c kept, skynet-a discriminator added at test:38-42), the proof
"expected 4 to be less than 3" reasoned through and consistent with DEFAULT having
entrepreneurial=3 / industry=4, an explanatory comment guards against future simplification,
and the projects assertion checks a real bullet year with no vacuous path. parser.ts had zero
net diff across the fix, confirming the temporary revert was cleanly restored.
Task 9: complete (commits 646c080..15032e4, review clean after 1 fix round)
Task 10: implementer DONE_WITH_CONCERNS - correctly REFUSED to weaken the assertion and stopped
to ask, exactly as instructed. Controller adjudicated by dumping the ACADEMIC PROFILE section
straight from the fixtures.
Ruling: the parser is right and MY assertion was wrong. The Academic Profile table lists
pre-MBA qualifications only (no MBA row), so a candidate with no extra certification has exactly
three rows. Verified from fixture text: skynet-b = B.Sc Hons / Class XII / Class X; skynet-d =
B.Sc. Economics / Class XII / Class X; skynet-a = CFA L1 / B.Tech / Minor / Class XII / Class X.
All four columns parsed correctly in every case and the header row is excluded. Remedy: replace
the >= 4 floor with EXACT per-fixture row counts (a=5, b=3, c=4, d=3), which is a stronger guard
than any floor - it catches dropped rows AND spurious extra rows. Cost if wrong: exact counts
would need updating if a fixture's source PDF ever changes, which only happens deliberately.
Task 10: fix round 1/5 dispatched.
Task 10: fix round 1/5 (1 addressed, 0 open; commits ab2ce6b..b0f03f5). Re-review confirmed
exact equality counts (not floors), per-row assertions unchanged and still running on all four
fixtures, explanatory comment present, header-row and rank-exclusion tests intact, CFA row
columns unshifted. Superset retains 9 ranked references; skynet has 0.
Task 10: complete (commits 15032e4..b0f03f5, review clean after 1 fix round)

=== SKYNET PARSER COMPLETE (Tasks 5-10). All five defects from the original diagnosis fixed:
empty education, dropped positions, retained bullet glyphs, truncated industry bullets, leaked
rotated margin labels. Plus two the diagnosis missed: multi-group margin mislabelling and the
missing Projects/Entrepreneurial sections. 28 tests green.
Task 11: review = spec OK, quality Approved, 2 Important + 3 Minor. All four implementer
deviations judged necessary/correct/minimal: RTL auto-cleanup genuinely requires globals:true
(absent), skynet styles.css genuinely was never imported, f1->sk rename genuinely needed since
both stylesheets load globally from index.css, bullet glyph corrected to the specified U+25A0.
sample.ts confirmed original. All four preview tests confirmed non-vacuous.
Ruling on Important 2 (education column centres never encoded): REAL and my brief's fault -
Step 5's snippet omitted them. Controller derived the correct widths from the measured centres
using b_i = 2*c_i - b_(i-1) from L=19.5: boundaries 19.5/209.7/469.5/546.9/582.3, table width
562.8pt, columns 33.80% / 46.16% / 13.75% / 6.29%. Verified self-consistent - every interior
boundary falls between the observed text extents of the adjacent columns (209.7 between 186.6
and 261.8; 469.5 between 420.5 and 491.1; 546.9 between 525.4 and 552.0). The inherited
40/41/12/7 split is off by +35pt on column 1 and -29pt on column 2. Fix it.
Ruling on Important 1 (--year-w 23pt overridden by a 7% col): the CSS var is the WRONG value,
not the colgroup. 23pt came from the year TEXT extent (552-575) in my measurements, but a cell
is wider than its text and cell width is not derivable from text extents at all. So do NOT force
23pt. Remove the misleading --year-w and the dead --year-x, leave the colgroup as the single
authority, and leave the year width to the outstanding visual check. Cost if wrong: the year
column is a few points off in the export; visible only against a side-by-side original.
Task 11: minor (deferred): --bullet-x/--bullet-text-x used only as a 4.8pt delta, never to pin
absolute position. Minor (deferred): EducationTable's year <td> carries no sk-cell-year class.
Task 11: fix round 1/5 dispatched.
Task 11: fix round 1/5 (2 addressed + 1 bundled minor, 0 open; commits 2924b10..0aeb58a).
Re-review confirmed colgroup 33.80/46.16/13.75/6.29 sums to 100.00% under table-layout:fixed,
the comment cites the measured centres and the derivation formula, both year vars deleted with
a comment explaining text-extent != cell-width, sk-cell-year added, other minors untouched.
Task 11: complete (commits b0f03f5..0aeb58a, review clean after 1 fix round)
OUTSTANDING (not a defect, cannot be done by a subagent): the manual visual comparison of the
Skynet preview against a real 63rd-batch PDF. Both Task 11 Important findings were geometry, so
this check is the only thing that can confirm print fidelity end to end. Surface to the human.
Task 12: review = spec OK, quality Approved, 1 Minor. Data wiring verified by inspection - the
two new sections bind to DIFFERENT fields (groups={data.projects}/onChange({projects}) and
groups={data.entrepreneurial}/onChange({entrepreneurial})), so the copy-paste hazard did not
occur. EducationForm confirmed title-only change; Task 5 had already removed rank/resumeType.
Task 12: minor (deferred): the form test asserts only that seven accordion buttons exist. It
would NOT catch a data-binding copy-paste error - both sections could write to the same field
and the test would still pass. Verified correct by inspection this time, but unguarded.
Task 12: complete (commits 0aeb58a..c56a1cd, review clean, no fix rounds)
Task 13: review = spec OK, quality Approved, 1 Important + 1 Minor. Confirmed via git show that
skynet/detect.ts had been byte-identical to superset/detect.ts since the Task 4 scaffold, so
detectSkynet was matching the WRONG format's anchors all along - masked because the MBA id takes
priority. Now genuinely Skynet-specific. Boundary verified exact (61 superset / 62 skynet) with
SKYNET_FIRST_BATCH a named exported constant. No Landing.tsx regression; chooser modal intact.
Ruling: fix the Important. When a PDF has no MBA id the two fallbacks are independent phrase
matchers, and Landing's TEMPLATES.find() returns the first match, so Superset wins silently -
wrong for a 63rd-batch resume. Unreachable today (all 450 corpus files and both fixtures carry
ids) but the failure mode is a SILENT wrong guess, and the remedy is two lines: auto-pick only
when exactly one detector matches, else fall through to the chooser. Asking beats guessing.
Cost if wrong: an id-less PDF shows the chooser instead of auto-selecting - a minor extra click.
Task 13: fix round 1/5 dispatched.
Task 13: fix round 1/5 (2 addressed, 0 open; commits d802ac8..74f9d52). Re-review ADDRESSED at
batch.ts:93-103 and batch-detect.test.ts:148-166. Implementer went beyond instruction by
extracting an exported chooseTemplate() into lib/batch.ts instead of inlining in Landing, so the
regression test exercises real production code rather than a parallel reimplementation - judged
correct and superior. Id-present path still authoritative via templateForBatch; Landing still
opens the chooser on undefined. Test proves BOTH detectors fire on the synthetic id-less lines.
Task 13: complete (commits c56a1cd..74f9d52, review clean after 1 fix round)
Task 14: review = spec OK, quality Approved, 1 Minor. Pre-flight Ruling 2 applied and verified:
codename is required on TemplateConfig and set on all three templates incl. unregistered devcv,
so the build stays green without weakening the field to optional. No accessible-name collision -
each anchored regex matches exactly one button. Blank vs sample not swapped (card -> emptyData(),
link -> sampleData). No regression of the gallery removal or chooseTemplate wiring.
Task 14: minor (deferred): the "no longer advertises other templates" test passed before the
change (Task 3 had already removed that text). Harmless regression guard, but it proves nothing
about Task 14 and its presence in this file is misleading.
Task 14: complete (commits 74f9d52..a94f6b3, review clean, no fix rounds)
Task 15: review = spec OK, 2 Important + 2 Minor. migrateBetweenBatches verified correct across
all five scenarios incl. null data. Task 3 stopgap fully replaced; confirm gate and cancel-abort
both correct.
Ruling: fix BOTH Importants.
 (1) SHARED_KEYS omits sectionOrder - a genuinely shared, user-editable field, so a student's
 custom section ordering silently resets on every format switch. That is precisely the data loss
 this task exists to prevent, and no test caught it because the tests only assert the keys the
 list already contains. Safe to add: both hydrate functions filter sectionOrder against their own
 DEFAULT_SECTION_ORDER, so Skynet's 7 keys degrade correctly to Superset's 5.
 (2) The confirm copy is a garden-path sentence: dropped.join(' and ') on two labels one of which
 already contains "and" reads as four nouns, "section" stays singular for two items, and .label
 ("61st batch and prior") is used where .codename ("Superset") reads correctly. Shown at the
 moment a user is about to lose typed work, so comprehension matters. Both defects came from my
 brief's Step 4, verbatim - not the implementer's.
 Cost if wrong: (1) none, it strictly reduces data loss; (2) none, it is copy only.
Task 15: minor (deferred -> bundled): report misquotes the confirm string as starting "The
Superset format" when the code yields "The 61st batch and prior format".
Task 15: fix round 1/5 dispatched.
Task 15: fix round 1/5 (2 Important addressed, 1 bundled Minor NOT addressed; commits
befb875..a272546). sectionOrder added to SHARED_KEYS at migrateBatch.ts:54, proven discriminating
("expected 'education' to be 'extras'" pre-fix). Confirm string replaced at App.tsx:30-31, uses
.codename and quotes each section separately. Controller separately verified hydrateSuperset
filters Skynet's 7 keys down to its own 5 and appends missing ones, so adding sectionOrder to the
carry-over introduces no new hazard.
Task 15: parked (deferred, tracked): the losslessness test hardcodes a copy of the SHARED_KEYS
list instead of importing it from migrateBatch.ts, so it will NOT fail if a key is later removed
from production. Ruling: Minor findings do not extend the fix loop and both Importants are
closed, so this goes to the final review to triage rather than a round 2. Remedy is two lines -
export SHARED_KEYS and import it in the test. Cost if wrong: a future key removal silently
reintroduces exactly the sectionOrder-class data loss this round just fixed.
Task 15: complete (commits a94f6b3..a272546, 2 addressed, 1 parked)
Note: one re-review agent stalled out (no progress for 600s) and was re-dispatched with a
tighter scope after the controller settled its hardest check directly.
Task 16: review = spec OK, quality Approved, 2 Important + 1 Minor. Pre-flight Ruling 1 verified
applied: skynet/Preview.tsx untouched (empty diff), each Preview references hiddenSections
exactly once, no double-filter. hydrateSuperset traced across all three cases - missing field,
Skynet-only key, non-array - all yield valid SupersetResumeData. Checkbox polarity identical in
both panels. sample.ts deviation genuinely forced by strict mode.
Ruling: fix both Importants. Data preservation is the entire promise of this feature - hiding a
section must never delete its content - and the reviewer confirms it is correct only BY
CONSTRUCTION, with no test exercising it. The four new tests assert emitted patches against a
mocked onChange; none feeds a patch through App.tsx's real shallow merge and re-renders. A
regression there would silently destroy typed work and no test would notice. hydrateSuperset's
new filtering is likewise only covered incidentally by the golden snapshot not breaking.
Cost if wrong: two added tests that duplicate coverage. Cheap either way.
Task 16: fix round 1/5 dispatched.
Task 16: fix round 1/5 (2 addressed, 0 open; commits 9e41b98..dc1fd25, test-only diff).
Re-review ADDRESSED both. Round-trip test at sections-panel.test.tsx:56-102 asserts BOTH deep
and reference equality on projects (toEqual + toBe), renders the Preview twice (hidden then
unhidden) and iterates the original bullets to confirm each renders back. Merge helper mirrors
App.tsx:108-110 spread semantics with a comment pointing at it. hydrateSuperset cases (a)(b)(c)
plus a bonus (d) proving filtering keeps valid keys. Both deliberate-failure outputs consistent.
Task 16: complete (commits a272546..dc1fd25, review clean after 1 fix round)
Task 17: implementer DONE_WITH_CONCERNS. Corpus run over all 450 real resumes.
GAPS CLOSED: (1) industry-bullet truncation - 0 truncated across every bullet of every resume.
(2) "Others" margin group - present in 12/450, all 12 correctly reflected in experience[].type.
(3) labels-outnumber-blocks degenerate branch - 0/450, confirmed still unreachable on real data.
No corpus file ever staged; snapshot unchanged; src/templates untouched.
COUNTS: industry 445/445 match, entrepreneurial 17/17 match, positions 161 vs 164 (-3), projects
116 vs 121 (-5/-6). Implementer correctly did NOT edit the expectations and did NOT fix the code.

Ruling: the count shortfall is a REAL PARSER BUG and gets fixed. findBulletXInfo at
skynet/parser.ts:269 requires glyphXs.length >= 3 before trusting glyph-based bullet-column
detection; a section with only two bullets falls through to a heuristic fallback meant for a
LaTeX template that draws bullets as vector paths, produces a wrong bulletX, and parses to
EMPTY. So ~9 of 450 students silently lose an entire Positions or Projects section on upload.
That is the exact class of defect this corpus run exists to find, and it is user-visible. The
U+25A0 glyph in a maths font at a consistent x is unmistakable, so the >= 3 threshold buys
nothing for Skynet. Superset keeps its own copy at parser.ts:262 untouched - copy-then-diverge
makes this a one-template change. Cost if wrong: a lower threshold could mis-detect on a
pathological resume; mitigated by re-running the full corpus and the unit suite after the change.

Ruling: the corpus test currently FAILS with SKYNET_CORPUS_DIR set, because my brief's leak check
is /Full Time|Intern|Others/.test(label) - an unanchored substring match that fires on
"International", "Internship", "Internal" and "Research Intern". 8 false positives, 0 real leaks.
A leaked margin label would BE the label, not contain it, so the check must be exact equality.
My defect. Cost if wrong: none, it strictly removes false positives.
Task 17: fix round 1/5 dispatched.
Task 17: fix round 1/5 (2 addressed but ONE MISDIAGNOSED; commits dc1fd25..594b75f).
Glyph threshold >= 1 fixed positions 161 -> 164 exact. Leak check now exact-equality, 0 false
positives, proven to still catch an injected real leak. Both good.
BUT projects went 116 -> 122 against an expected 121, and the implementer diagnosed the extra
file (corpus-resume-E) as my spec-research scan having undercounted, then RAISED the
test expectation to 122. Controller verified directly and that diagnosis is WRONG.
Ruling: 122 is a BUG, not a correction. That resume has exactly four real section headers
(Calibri-Bold 11.2pt at x=19.5): ACADEMIC PROFILE, ACADEMIC DISTINCTIONS, INDUSTRY EXPERIENCE,
EXTRA-CURRICULAR ACHIEVEMENTS. It has NO Projects and Papers section. The string "Projects and
Papers" appears at y=298.1 as a Calibri-Bold 9.9pt CATEGORY LABEL at x=19.1 inside ACADEMIC
DISTINCTIONS, alongside "Industry Accolades" and "Competitive Exams". findAnchorLine uppercases
line.text before comparing and has no font-size or case guard, so a Title-Case category label is
promoted to a section anchor. Consequences: a spurious empty-ish projects section AND ACADEMIC
DISTINCTIONS is truncated at y=298.1, losing that category and its bullets. Real data corruption.
My original scan was RIGHT to require size > 10.5; the parser is the thing that is wrong.
This is precisely the "silently adjust the expected number" failure I warned against, arrived at
via a plausible-sounding rationale rather than carelessness.
Remedy: findAnchorLine must require a genuine header - raw text already ALL-CAPS AND line height
>= 10.5 - then re-run the corpus; projects should return to 121 and that file's Distinctions
should be intact. Cost if wrong: a resume with a lowercase or small-font section header would be
missed; mitigated by the corpus run, where all 450 use ALL-CAPS 11.2pt headers.
Task 17: fix round 2/5 dispatched.
Task 17: fix round 2/5 (1 addressed, 0 open; commits 594b75f..ede5893). Re-review ADDRESSED at
parser.ts:210-237 and corpus.test.ts:219-222. Projects back to 121 exactly as predicted; other
counts unchanged. Deviation (prefix-only all-caps check) verified TRUE and necessary - a
whole-line check would reject "INDUSTRY EXPERIENCE 46 Months (FULL-TIME)" and collapse industry
detection across the corpus. Guards are NOT fully independent: PdfLine.height is the max over the
whole line, so guard 2 could be inherited past; guard 1 is what actually fixes the corpus bug,
guard 2 adds coverage for a different failure mode. Noted, acceptable.
Task 17: parked (deferred, tracked): the old-vs-new 450-file sweep proving exactly one resume
changed was run with a script deleted before commit, so the claim is self-reported. Corroborated
by withProjects landing on 121 independently. Acceptable but not independently reproducible.
Task 17: complete (commits dc1fd25..ede5893, review clean after 2 fix rounds)

=== ALL 17 TASKS COMPLETE ===
Superset parser verified byte-identical to the pre-branch original modulo the type rename.

=== FINAL WHOLE-BRANCH REVIEW (opus) ===
Verdict: mergeable with named fixes. 2 HIGH, 3 MED, 4 LOW. Superset parser independently
re-confirmed byte-identical to the pre-branch original.

RULING REVERSED (I got this wrong): at Task 15 I graded the hardcoded-SHARED_KEYS losslessness
test a Minor and parked it, citing "Minors do not extend the fix loop". That was the wrong call
and the final review is right to reverse it. A guard that cannot detect the exact defect I had
just spent a fix round repairing is not Minor. Worse, the reviewer found the hardcoded copy was
ALREADY STALE when I graded it - missing sectionOrder and hiddenSections - so it had never
guarded anything. And that is precisely why HIGH finding 1 shipped undetected: resumeType is
also missing from SHARED_KEYS, so a ranked Superset resume that round-trips through Skynet loses
its Rank column silently, with no entry in `dropped` and therefore no confirm. Same bug class as
the sectionOrder loss, same blind spot, one task later.
Secondary ruling accepted: nobody ever re-derived SHARED_KEYS mechanically against both
interfaces. A one-minute field diff would have caught resumeType at Task 15.

FIX WAVE (one dispatch, per the skill): F1 resumeType in SHARED_KEYS; F2 import SHARED_KEYS in
the test instead of copying it; F3 hydrateSuperset array-repair drift; F5 education colgroup
derived against 562.8pt while the page renders 556pt; F6 round-trip leaves Projects/
Entrepreneurial unhidden-and-empty producing bare section bars in the submitted PDF; F7 Skynet
sample carries a 61-batch MBA id and an MBA education row; F8 stale unanchored margin-label
regex in a unit test; F9 corpus Others assertion cannot fail on an 11/12 mismatch.
Ruling on F4 (present-but-empty sections never reach failedSections): the app-level form of this
is a UI behaviour change beyond this branch's scope - the amber banner would start firing on
resumes that parse fine today. But the reviewer is right that recurrence would be silent, and
that bug class has now bitten twice. Scoped remedy instead: assert it in the CORPUS test - a
section header present in the source must yield a non-empty parse - so recurrence fails loudly
in CI without changing what students see. Cost if wrong: a corpus assertion that needs relaxing
if a legitimately empty section exists; the run will say so immediately.
SHIP AS-IS per the reviewer's triage: test-dir typecheck gap (measured clean under strict except
missing @types/node), make-fixture.mjs Node version dependency, the labels>blocks branch (0/450,
degrades rather than crashes), and the remaining deferred minors.
FINAL FIX WAVE: all 9 findings ADDRESSED (commits ede5893..9135bed). Scoped re-review ACCEPTED.
F1 round trip traced end to end and genuinely correct: hydrateSkynet's {...base,...input} does
not strip the undeclared resumeType, so it survives the Skynet hop and hydrateSuperset then sees
it already truthy and never applies the 'unranked' default. Two-hop test at
migrate-batch.test.ts:67-74. F5 arithmetic checked: 19.5 + 562.8 + 12.7 = 595.0pt exactly.
F6 auto-hide fires only on length === 0, per section independently. No product parser touched for
F4 - the corpus detector re-derives the guards in the test.
Residual (accepted, not load-bearing): resumeType rides on the Skynet object as an undeclared
excess property. Correct at runtime, nothing on the Skynet side reads it, tsc clean under strict,
and it uses the file's pre-existing cast pattern rather than a new unsafe cast. Untidy but
working; a cleaner design would give migrateBatch an explicit carrier type.
=== BRANCH COMPLETE: 17 tasks, 34 commits, 60 unit tests + 2 corpus tests ===
