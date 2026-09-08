# Batch resume templates: Superset (61 & prior) and Skynet (62 & later)

Date: 2026-09-08
Status: approved, ready for implementation planning

## Problem

The app ships one IIM Calcutta resume template (`src/templates/iimc/`), modelled
on the format used up to the 61st batch. The 62nd batch onward uses a materially
different format. The current parser does not reject the new format — it
*detects* it (three of five anchors still match) and then silently produces
wrong data.

Verified against `corpus-resume-A.pdf` using the real parser:

- `education: []` — total loss
- `positions: []` — total loss
- the `ENTREPRENEURIAL/NON-PROFIT VENTURE` header parsed as a *bullet* inside
  Industry Experience
- every bullet retained a literal `■ ` prefix
- industry bullets truncated mid-sentence: `"…Environment Management in **3**"`
  (lost "mines")
- a rotated margin label leaked into sub-section labels:
  `"Full Time\nInvestment\nExecution"`
- `failedSections: []` — the parser reported total success

A student on the current batch would upload their resume, see a plausible-looking
editor with their education silently missing and their bullets cut off, and
export it.

## Evidence base

**Skynet:** 450 PDFs in
`<a local path outside this repo>`.
All are `MBA_xxxx_63_*.pdf`, all single-page A4.

**Superset:** one file, `<a local path outside this repo>`
(`MBA/0166/61`), which uses `ACADEMIC QUALIFICATIONS` and
`POSITIONS OF RESPONSIBILITY` — confirming the existing template models the
Superset format.

## Format delta

| | Superset (61 & prior) | Skynet (62 & later) |
|---|---|---|
| Education header | `ACADEMIC QUALIFICATIONS` | `ACADEMIC PROFILE` (450/450) |
| Distinctions header | `ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS` | identical (450/450) |
| PoR header | `POSITIONS OF RESPONSIBILITY` | `POSITION OF RESPONSIBILITY`, singular (164/450) |
| Projects | — | `PROJECTS AND PAPERS` (121/450) |
| Venture | — | `ENTREPRENEURIAL/NON-PROFIT VENTURE` (17/450) |
| Industry header | `INDUSTRY EXPERIENCE` | identical (445/450) |
| Extras header | `EXTRA-CURRICULAR ACHIEVEMENTS` | identical (450/450) |
| Bullet glyph | `•` | `■` U+25A0, DejaVuMathTeXGyre-Regular 3.4pt |
| Education columns | 4, plus optional Rank | 4 fixed; **no Rank column in any of the 450** |
| Section order | fixed | varies — Projects appears before *or* after Industry |
| Margin label | — | rotated: `Full Time` (270), `Intern` (350), `Others` (12) |
| Industry right text | — | `N Months (FULL-TIME)` on the header row |

Section shapes are unchanged from the existing type vocabulary. Skynet needs no
new data structures, only more section keys:

| Skynet section | Shape |
|---|---|
| `ACADEMIC PROFILE` | `EducationRow[]` |
| `ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS` | `BulletGroup[]`, year per bullet |
| `PROJECTS AND PAPERS` | `BulletGroup[]`, year per bullet |
| `ENTREPRENEURIAL/NON-PROFIT VENTURE` | `BulletGroup[]`, year per bullet |
| `INDUSTRY EXPERIENCE` | `ExperienceEntry[]` + right text + rotated group label |
| `POSITION OF RESPONSIBILITY` | `PositionEntry[]`, one year per group, vertically centred |
| `EXTRA-CURRICULAR ACHIEVEMENTS` | `BulletGroup[]` |

## Measured Skynet geometry

Derived statistically across all 450 files (modal values; A4 595×842pt).

| Element | Value |
|---|---|
| Page | 595 × 842 pt |
| Section header | Calibri-Bold 11.2pt at x = 19.5 |
| Body text | Calibri / Calibri-Bold 9.9pt |
| Row pitch | 14.6pt (15.4pt in some sections) |
| Bullet glyph | `■` at x = 108.4 |
| Bullet text | starts x = 113.2 |
| Category label column | x 18.8 – 86.7, centred in cell |
| Year column | x 552 – 575 |
| Education column header centres | 114.6 / 339.6 / 508.2 / 564.6 |
| Footer | email then institute, centred, Calibri 8.2pt |

### Two bullet-column regimes

This is the cause of the truncation bug. The current parser derives a single
year-column x for the whole page; Skynet has two regimes:

- **Table sections** (distinctions, projects, entrepreneurial, positions,
  extras): text `113.2 → ~547`, year column `552 – 575`.
- **Industry Experience**: text `113.3 → 575.4` (full width, no year column);
  dates live on the firm header row at `516 – 573`.

Applying the table regime to Industry Experience clips every industry bullet at
~547.

## Design

### 1. Template layer

Full copy, then diverge — chosen deliberately over a shared core. Superset is
frozen and must not regress; duplication buys that guarantee at the cost of
fixing shared bugs twice.

```
src/templates/
  superset/      verbatim copy of iimc/, ids renamed
  skynet/        copy of iimc/, then diverged
  devcv/         stays on disk, dropped from TEMPLATES
  registry.ts    TEMPLATES = [supersetTemplate, skynetTemplate]
  types.ts       TemplateKey = 'superset' | 'skynet' | 'devcv'
```

`iimc/` is removed as a name; its content lives on as `superset/`. Only
`superset` and `skynet` are registered, so `TemplateGallery`,
`TemplateChooserModal`'s multi-template listing and "Browse other templates" all
disappear from the UI. Re-enabling `devcv` later is a one-line change to
`TEMPLATES`.

`migrateLegacyDraft()` in `src/lib/storage.ts` gains one more hop, so existing
`iimc-resume-builder:draft:iimc:v1` drafts land in the `superset` slot rather
than being orphaned.

### 2. Skynet divergence

**`parser.ts`**

- `ANCHORS` replaced with the seven Skynet header strings.
- `■` (U+25A0) added to `BULLET_GLYPHS`.
- Per-section column regimes replace the single global year-x. Industry
  Experience uses the full-width regime; every other section uses the
  table regime. Fixes bullet truncation.
- A rotated-run filter routes non-horizontal pdfjs items to
  `experience[].type` (`Full Time` / `Intern` / `Others`) instead of letting
  them contaminate sub-section labels. Fixes `"Full Time\nInvestment\nExecution"`.
- `parseEducation` fixed at four columns; ranked detection removed.
- `parseProjects` and `parseEntrepreneurial` added, both delegating to the
  existing `parseBulletTable`.
- Section order is read from the document rather than hardcoded.

**`types.ts`**

- `SectionKey = 'education' | 'distinctions' | 'projects' | 'entrepreneurial' | 'industry' | 'positions' | 'extras'`
- `SECTION_LABELS` carries the Skynet header strings.
- New `hiddenSections: SectionKey[]`.
- `ResumeType` and `resumeType` dropped — no ranked variant exists in Skynet.

**`detect.ts`**

The batch number in `MBA/nnnn/NN` is authoritative: `NN >= 62` → skynet,
`NN <= 61` → superset. Anchor vocabulary is the tiebreak only when no MBA ID is
present. A file matching neither falls through to the manual chooser.

**`Preview.tsx` / `styles.css`**

Rebuilt to the measured geometry above, including the rotated margin labels and
the right-aligned `N Months (FULL-TIME)` text on the Industry header row.

### 3. Landing (`src/components/Landing.tsx`)

The drop zone is unchanged. On upload the batch is auto-detected and the editor
opens directly; the chooser modal appears only when detection fails, and then
lists the two batches rather than a template gallery.

Below an `or start blank` divider sit two cards:

```
┌──────────────┐ ┌──────────────┐
│ 61st batch   │ │ 62nd batch   │
│  and prior   │ │  and later   │
│  Superset    │ │   Skynet     │
└──────────────┘ └──────────────┘
```

`Use sample` becomes a small tertiary link so either format can be sampled.
`Browse other templates` is removed.

### 4. Header switcher and carry-over

The `Template · <name>` button toggles Superset ↔ Skynet.

A `migrateBetweenBatches(from, to, data)` mapper copies the shared keys —
name, mbaId, taglines, education, distinctions, industry, positions, extras.
Skynet → Superset drops `projects` and `entrepreneurial`; a confirm fires
**only when those sections hold data**, naming exactly what will be lost.
Superset → Skynet is lossless and silent.

### 5. Sections panel

Each row gains a checkbox beside its ↑/↓ arrows, in both templates. Hidden
sections keep their data but are excluded from the preview and the print output.
On upload, sections absent from the source PDF start hidden — which is how a
Skynet resume with no Projects section arrives clean.

### 6. Testing

`scripts/parse-corpus.mjs` runs the Skynet parser across all 450 PDFs and
asserts:

- every file yields at least three education rows
- no bullet text retains a glyph prefix
- no bullet is truncated, diffed against the raw pdfjs line text
- per-section presence matches the independent header scan
  (`ACADEMIC PROFILE` 450, `INDUSTRY EXPERIENCE` 445,
  `POSITION OF RESPONSIBILITY` 164, `PROJECTS AND PAPERS` 121,
  `ENTREPRENEURIAL/NON-PROFIT VENTURE` 17, `EXTRA-CURRICULAR ACHIEVEMENTS` 450)
- `failedSections` is empty for every file

`0166_3_10_2025_fake.pdf` (`MBA/0166/61`) is the Superset regression fixture: it
must parse identically before and after the rename.

The existing `scripts/test-parse.mjs` needs a Windows path fix — it hardcodes
`/tmp` and calls bare `npx` — and `esbuild` must move into `devDependencies`,
since the harness shells out to it.

## Risks

**Superset has a sample size of one.** Copy-then-diverge protects it by
construction — the Superset parser is not edited — but the rename, the storage
migration and the new Sections-panel checkboxes all touch it. A folder of
61st-batch resumes would turn a single fixture into a real regression suite.

**Under-sampled Skynet elements.** `ENTREPRENEURIAL/NON-PROFIT VENTURE` appears
in only 17 of 450 files and `Others` as a margin label in only 12. Geometry for
these rests on a thin sample and may need adjustment against real use.

**`■` is a 3.4pt glyph in a maths font.** If a future Skynet revision changes the
bullet font, glyph-based detection breaks. The x-position heuristic (glyph at
108.4, text at 113.2) is the more durable signal and should be the primary test,
with the glyph as confirmation.
