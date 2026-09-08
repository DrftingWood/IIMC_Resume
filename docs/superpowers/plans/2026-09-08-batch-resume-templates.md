# Batch Resume Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single IIM Calcutta resume template into two batch variants — Superset (61st batch and prior) and Skynet (62nd and later) — and hide the generic multi-template gallery.

**Architecture:** `src/templates/iimc/` is renamed to `superset/` and copied to `skynet/`, which then diverges. The two are registered; `devcv/` stays on disk but is unregistered, which removes the gallery from the UI. Batch is auto-detected from the `MBA/nnnn/NN` id on upload. A new Vitest suite drives every parser change from real (anonymised) resume line data.

**Tech Stack:** Vite 5 · React 18 · TypeScript 5.5 (strict) · Tailwind 3 · pdfjs-dist 4.7.76 · Vitest (added in Task 1) · jsdom + @testing-library/react (added in Task 1)

**Spec:** `docs/superpowers/specs/2026-09-08-batch-resume-templates-design.md`

## Global Constraints

- **Never commit any file from the local corpus directory.** Those are 450 real students' resumes and this repo has a public GitHub remote. Fixtures are anonymised `PdfLine[]` JSON only; the raw corpus is reached solely through the `SKYNET_CORPUS_DIR` environment variable.
- TypeScript is `strict: true`. No `any` in new code except where mirroring an existing signature.
- Import alias is `@/*` → `src/*`, configured in both `tsconfig.json` and `vite.config.ts`. Vitest needs the same alias added.
- Superset's parser logic is **frozen**. Tasks 2, 3, 15 and 16 touch its file paths, ids and panel wiring; no task changes how it parses. The golden snapshot from Task 1 is the guard.
- Section label strings are exact and case-sensitive as they appear in the PDFs: `ACADEMIC PROFILE`, `ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS`, `PROJECTS AND PAPERS`, `ENTREPRENEURIAL/NON-PROFIT VENTURE`, `INDUSTRY EXPERIENCE`, `POSITION OF RESPONSIBILITY` (singular), `EXTRA-CURRICULAR ACHIEVEMENTS`.
- Skynet measured geometry (A4 595×842pt): section header Calibri-Bold 11.2pt at x=19.5; body Calibri 9.9pt; row pitch 14.6pt; bullet `■` U+25A0 at x=108.4; bullet text x=113.2; year column x=552–575; education column centres 114.6 / 339.6 / 508.2 / 564.6; footer Calibri 8.2pt.
- Commit after every task. Conventional-commit prefixes (`feat:`, `refactor:`, `test:`, `fix:`).

---

### Task 1: Test infrastructure and anonymised fixtures

Nothing else in this plan can be driven by tests until a runner exists. This task also extracts the line-grouping logic out of `pdfExtract.ts` so tests and the browser share one implementation rather than the duplicate that `scripts/test-parse.mjs` currently carries.

**Files:**
- Modify: `package.json` (devDependencies + `test` script)
- Create: `vitest.config.ts`
- Modify: `src/lib/pdfExtract.ts` (extract `groupIntoLines`)
- Create: `test/support/pdf.ts`
- Create: `scripts/make-fixture.mjs`
- Create: `test/fixtures/skynet-a.json`, `test/fixtures/skynet-b.json`, `test/fixtures/skynet-c.json`, `test/fixtures/superset-a.json`
- Create: `test/superset-golden.test.ts`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: nothing.
- Produces: `groupIntoLines(items: TextItem[]): PdfLine[]` from `@/lib/pdfExtract`; `loadFixture(name: string): PdfLine[]` from `test/support/pdf`; `linesFromPdf(path: string): Promise<PdfLine[]>` from `test/support/pdf`.

- [ ] **Step 1: Install the test toolchain**

```bash
npm i -D vitest@^2.1.0 jsdom@^25.0.0 @testing-library/react@^16.0.1 @testing-library/jest-dom@^6.5.0 @testing-library/user-event@^14.5.2
npm pkg set scripts.test="vitest run"
npm pkg set scripts.test:watch="vitest"
```

- [ ] **Step 2: Create the Vitest config**

`vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': resolve(__dirname, 'src') } },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts', 'test/**/*.test.tsx'],
    environmentMatchGlobs: [['test/**/*.test.tsx', 'jsdom']],
  },
});
```

- [ ] **Step 3: Extract `groupIntoLines` from `pdfExtract.ts`**

In `src/lib/pdfExtract.ts`, the body of `extractLines` after `extractTextItems` becomes an exported pure function. Replace the existing `extractLines` with:

```ts
/** Group raw text items into visual lines by y coordinate (small tolerance). */
export function groupIntoLines(items: TextItem[]): PdfLine[] {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: PdfLine[] = [];
  const TOL = 4.5;

  for (const it of sorted) {
    if (it.str === '') continue;
    const existing = lines.find((l) => Math.abs(l.y - it.y) <= TOL);
    if (existing) {
      existing.items.push(it);
      existing.startX = Math.min(existing.startX, it.x);
      existing.endX = Math.max(existing.endX, it.x + it.width);
      existing.height = Math.max(existing.height, it.height);
    } else {
      lines.push({
        y: it.y,
        startX: it.x,
        endX: it.x + it.width,
        height: it.height,
        items: [it],
        text: '',
      });
    }
  }

  for (const ln of lines) {
    ln.items.sort((a, b) => a.x - b.x);
    let prevEnd = -Infinity;
    let buf = '';
    for (const it of ln.items) {
      if (buf && it.x - prevEnd > 1.5 && !/\s$/.test(buf) && !/^\s/.test(it.str)) {
        buf += ' ';
      }
      buf += it.str;
      prevEnd = it.x + it.width;
    }
    ln.text = buf.replace(/\s+/g, ' ').trim();
  }

  return lines.filter((l) => l.text.length > 0).sort((a, b) => b.y - a.y);
}

export async function extractLines(file: File): Promise<PdfLine[]> {
  return groupIntoLines(await extractTextItems(file));
}
```

- [ ] **Step 4: Write the fixture generator**

`scripts/make-fixture.mjs`. It dumps a PDF to `PdfLine[]` JSON and scrubs identity. The scrubbing is why fixtures are safe to commit: names, the MBA serial, and emails are replaced, while every coordinate — the only thing the parser reasons about — is preserved exactly.

```js
/**
 * Dump a resume PDF to anonymised PdfLine[] JSON for use as a test fixture.
 * Usage: node scripts/make-fixture.mjs <input.pdf> <out.json> <FakeName> <MBA/9999/63>
 */
import { readFile, writeFile } from 'node:fs/promises';

const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
const [input, out, fakeName, fakeId] = process.argv.slice(2);
if (!input || !out || !fakeName || !fakeId) {
  console.error('usage: node scripts/make-fixture.mjs <in.pdf> <out.json> <FakeName> <MBA/9999/63>');
  process.exit(1);
}

const pdf = await pdfjs.getDocument({
  data: new Uint8Array(await readFile(input)),
  useSystemFonts: true,
}).promise;

const items = [];
for (let p = 1; p <= pdf.numPages; p++) {
  const content = await (await pdf.getPage(p)).getTextContent();
  for (const it of content.items) {
    if (typeof it.str !== 'string' || it.str === '') continue;
    items.push({
      str: it.str,
      x: it.transform?.[4] ?? 0,
      y: it.transform?.[5] ?? 0,
      height: Math.abs(it.transform?.[3] ?? it.height ?? 10),
      width: it.width ?? 0,
      fontName: it.fontName ?? '',
    });
  }
}

// Scrub identity. Coordinates are untouched so layout parsing is unaffected.
const realId = items.map((i) => i.str).join('').match(/MBA\/\d+\/\d+/)?.[0];
const first = fakeName.split(' ')[0];
for (const it of items) {
  if (realId && it.str.includes(realId)) it.str = it.str.replace(realId, fakeId);
  it.str = it.str.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g,
    `${first.toLowerCase()}2028@email.iimcal.ac.in`);
}

// The candidate name is the largest bold run in the top-right corner.
const maxSize = Math.max(...items.map((i) => i.height));
for (const it of items) {
  if (it.height === maxSize && it.x > 400 && !/MBA\//.test(it.str) && /[A-Za-z]/.test(it.str)) {
    it.str = fakeName;
  }
}

await writeFile(out, JSON.stringify(items, null, 1));
console.log(`wrote ${out} (${items.length} items)`);
```

- [ ] **Step 5: Write the fixture loader**

`test/support/pdf.ts`:

```ts
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { groupIntoLines } from '@/lib/pdfExtract';
import type { PdfLine, TextItem } from '@/lib/pdfExtract';

/** Load a committed, anonymised fixture and regroup it into lines. */
export function loadFixture(name: string): PdfLine[] {
  const path = resolve(__dirname, '..', 'fixtures', `${name}.json`);
  const items = JSON.parse(readFileSync(path, 'utf8')) as TextItem[];
  return groupIntoLines(items);
}

/** Extract lines from a real PDF on disk. Only used by the opt-in corpus test. */
export async function linesFromPdf(path: string): Promise<PdfLine[]> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const pdf = await pdfjs.getDocument({
    data: new Uint8Array(readFileSync(path)),
    useSystemFonts: true,
  }).promise;
  const items: TextItem[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const content = await (await pdf.getPage(p)).getTextContent();
    for (const it of content.items as any[]) {
      if (typeof it.str !== 'string' || it.str === '') continue;
      items.push({
        str: it.str,
        x: it.transform?.[4] ?? 0,
        y: it.transform?.[5] ?? 0,
        height: Math.abs(it.transform?.[3] ?? it.height ?? 10),
        width: it.width ?? 0,
        fontName: it.fontName ?? '',
      });
    }
  }
  return groupIntoLines(items);
}
```

- [ ] **Step 6: Generate the four fixtures**

Pick files that between them exercise every Skynet section. `skynet-a` has Entrepreneurial, `skynet-b` has Position of Responsibility, `skynet-c` has Projects and Papers.

```bash
CORPUS="$SKYNET_CORPUS_DIR"
mkdir -p test/fixtures
node scripts/make-fixture.mjs "$CORPUS/corpus-resume-A.pdf"  test/fixtures/skynet-a.json "Arun Mehta"   "MBA/9001/63"
node scripts/make-fixture.mjs "$CORPUS/corpus-resume-B.pdf"     test/fixtures/skynet-b.json "Priya Nair"   "MBA/9002/63"
node scripts/make-fixture.mjs "$CORPUS/corpus-resume-C.pdf" test/fixtures/skynet-c.json "Kabir Rao"    "MBA/9003/63"
node scripts/make-fixture.mjs "<a local 61st-batch resume PDF>" \
                                                                        test/fixtures/superset-a.json "Devika Iyer" "MBA/9004/61"
```

- [ ] **Step 7: Verify the fixtures carry no real identity**

```bash
grep -ol -E "<REAL-NAME-TOKENS>|@email\.iimcal\.ac\.in" test/fixtures/*.json
grep -o -E "MBA/[0-9]+/[0-9]+" test/fixtures/*.json | sort -u
```

Expected: the first command prints only files matched on the scrubbed `@email.iimcal.ac.in` domain (never a real given name); the second prints only `MBA/9001/63`, `MBA/9002/63`, `MBA/9003/63`, `MBA/9004/61`. **If any real name appears, stop and fix `make-fixture.mjs` before committing.**

- [ ] **Step 8: Write the Superset golden test**

This is the regression guard for every later task that touches Superset. `test/superset-golden.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { parseResume } from '@/templates/iimc/parser';

describe('superset parser (frozen)', () => {
  it('parses the 61st-batch fixture without failed sections', () => {
    const result = parseResume(loadFixture('superset-a'));
    expect(result.failedSections).toEqual([]);
    expect(result.data.mbaId).toBe('MBA/9004/61');
    expect(result.data.education!.length).toBeGreaterThanOrEqual(3);
    expect(result.data.distinctions!.length).toBeGreaterThan(0);
    expect(result.data.extras!.length).toBeGreaterThan(0);
  });

  it('matches its golden snapshot', () => {
    expect(parseResume(loadFixture('superset-a'))).toMatchSnapshot();
  });
});
```

- [ ] **Step 9: Run the suite and record the snapshot**

Run: `npx vitest run`
Expected: both tests PASS, and `test/__snapshots__/superset-golden.test.ts.snap` is written. Open the snapshot and confirm it contains parsed education rows and bullets, not empty arrays — a snapshot of broken output is worthless as a guard.

- [ ] **Step 10: Delete the superseded harness**

`scripts/test-parse.mjs` bundles the parser with `esbuild` to run it from Node, duplicates the line-grouping logic, and hardcodes `/tmp` and a bare `npx` (both broken on Windows). Vitest replaces all of it.

```bash
git rm scripts/test-parse.mjs
```

- [ ] **Step 11: Ignore corpus output**

Append to `.gitignore`:

```
.parser.bundled.mjs
corpus-report.json
```

- [ ] **Step 12: Commit**

```bash
git add package.json package-lock.json vitest.config.ts .gitignore \
        src/lib/pdfExtract.ts scripts/make-fixture.mjs \
        test/support/pdf.ts test/fixtures test/superset-golden.test.ts test/__snapshots__
git commit -m "test: add vitest, anonymised resume fixtures, superset golden snapshot"
```

---

### Task 2: Rename `iimc/` to `superset/`

Pure rename plus a storage migration hop. The golden snapshot from Task 1 proves nothing about the parse changed.

**Files:**
- Rename: `src/templates/iimc/` → `src/templates/superset/` (10 files plus `form-sections/`)
- Modify: `src/templates/types.ts`, `src/templates/registry.ts`, `src/lib/storage.ts`, `src/components/Landing.tsx`
- Modify: `test/superset-golden.test.ts` (import path)

**Interfaces:**
- Consumes: `loadFixture` (Task 1).
- Produces: `supersetTemplate` exported from `@/templates/superset`, with `id: 'superset'`; `TemplateKey` union now `'superset' | 'skynet' | 'devcv'`.

- [ ] **Step 1: Move the directory and rename the symbols**

```bash
git mv src/templates/iimc src/templates/superset
git grep -l "templates/iimc" -- src test | xargs sed -i "s|templates/iimc|templates/superset|g"
sed -i "s|iimcTemplate|supersetTemplate|g; s|IimcResumeData|SupersetResumeData|g; s|emptyIimcResume|emptySupersetResume|g; s|hydrateIimc|hydrateSuperset|g; s|detectIimc|detectSuperset|g; s|IimcForm|SupersetForm|g; s|IimcSectionsPanel|SupersetSectionsPanel|g" \
  $(git grep -l "iimcTemplate\|IimcResumeData\|emptyIimcResume\|hydrateIimc\|detectIimc\|IimcForm\|IimcSectionsPanel" -- src test)
```

- [ ] **Step 2: Set the template id and label**

In `src/templates/superset/index.ts`:

```ts
export const supersetTemplate: TemplateConfig<SupersetResumeData> = {
  id: 'superset',
  label: '61st batch and prior',
  description: 'Superset — the IIM Calcutta placement resume used up to the 61st batch.',
  // ...rest unchanged
};
```

In `src/templates/types.ts`:

```ts
export type TemplateKey = 'superset' | 'skynet' | 'devcv';
```

- [ ] **Step 3: Add the storage migration hop**

In `src/lib/storage.ts`, `migrateLegacyDraft()` currently moves the pre-multi-template key into the `iimc` slot. That slot no longer exists, so add a second hop. Replace the function with:

```ts
const OLD_DRAFT_KEY = 'iimc-resume-builder:draft:v1';
const IIMC_DRAFT_KEY = 'iimc-resume-builder:draft:iimc:v1';
const LAST_TEMPLATE_KEY = 'iimc-resume-builder:lastTemplateId';

/** Run once on app boot: fold pre-multi-template and pre-rename drafts into `superset`. */
function migrateLegacyDraft(): void {
  try {
    const target = draftKey('superset');
    for (const legacy of [OLD_DRAFT_KEY, IIMC_DRAFT_KEY]) {
      const old = localStorage.getItem(legacy);
      if (!old) continue;
      if (!localStorage.getItem(target)) localStorage.setItem(target, old);
      localStorage.removeItem(legacy);
    }
    if (localStorage.getItem(LAST_TEMPLATE_KEY) === 'iimc') {
      localStorage.setItem(LAST_TEMPLATE_KEY, 'superset');
    }
  } catch {
    /* ignore */
  }
}
```

Then update `getLastTemplateId()`'s fallback, which still names `iimc`:

```ts
  try {
    if (localStorage.getItem(draftKey('superset'))) return 'superset';
  } catch {
    /* ignore */
  }
  return null;
```

- [ ] **Step 4: Write the migration test**

`test/storage-migration.test.ts`:

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { loadDraft, getLastTemplateId } from '@/lib/storage';

describe('draft migration', () => {
  beforeEach(() => localStorage.clear());

  it('folds a pre-rename iimc draft into the superset slot', () => {
    localStorage.setItem('iimc-resume-builder:draft:iimc:v1', JSON.stringify({ name: 'X' }));
    expect(loadDraft<{ name: string }>('superset')).toEqual({ name: 'X' });
    expect(localStorage.getItem('iimc-resume-builder:draft:iimc:v1')).toBeNull();
  });

  it('rewrites a stored lastTemplateId of iimc to superset', () => {
    localStorage.setItem('iimc-resume-builder:draft:iimc:v1', JSON.stringify({ name: 'X' }));
    localStorage.setItem('iimc-resume-builder:lastTemplateId', 'iimc');
    expect(getLastTemplateId()).toBe('superset');
  });
});
```

This test needs a DOM for `localStorage`, so name it `.test.tsx`? No — instead add `// @vitest-environment jsdom` as the first line of the file.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run`
Expected: the golden snapshot still PASSES unchanged (proving the rename was inert), and both migration tests PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: rename iimc template to superset, migrate stored drafts"
```

---

### Task 3: Unregister devcv and remove the gallery from the UI

**Files:**
- Modify: `src/templates/registry.ts`, `src/components/Landing.tsx`, `src/App.tsx`
- Create: `test/registry.test.ts`
- Keep untouched on disk: `src/templates/devcv/`, `src/components/TemplateGallery.tsx`

**Interfaces:**
- Consumes: `supersetTemplate` (Task 2).
- Produces: `TEMPLATES` containing exactly the registered batch templates.

- [ ] **Step 1: Write the failing test**

`test/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { TEMPLATES, getTemplate, isTemplateKey } from '@/templates/registry';

describe('template registry', () => {
  it('registers only batch templates', () => {
    expect(TEMPLATES.map((t) => t.id)).toEqual(['superset']);
  });

  it('does not resolve devcv', () => {
    expect(getTemplate('devcv')).toBeUndefined();
    expect(isTemplateKey('devcv')).toBe(false);
  });
});
```

(Skynet joins this list in Task 4; the expectation is updated there.)

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/registry.test.ts`
Expected: FAIL — received `['superset', 'devcv']`.

- [ ] **Step 3: Unregister devcv**

`src/templates/registry.ts`:

```ts
import type { AnyTemplateConfig, TemplateKey } from './types';
import { supersetTemplate } from './superset';
// devcv/ is kept on disk but intentionally unregistered — re-add it to
// TEMPLATES to bring the multi-template gallery back.

export const TEMPLATES: AnyTemplateConfig[] = [supersetTemplate];

export function getTemplate(id: TemplateKey | string): AnyTemplateConfig | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function isTemplateKey(id: string): id is TemplateKey {
  return TEMPLATES.some((t) => t.id === id);
}
```

- [ ] **Step 4: Remove the gallery entry points**

In `src/App.tsx`, delete the `PreEditorView` type, the `preEditorView` state, the `gallery` branch, the `TemplateGallery` import, and the `onBrowseTemplates` prop passed to `Landing`. `onReset` sets `setTemplateId(null); setData(null);` and nothing more.

In `src/components/Landing.tsx`, delete the `onBrowseTemplates` prop from the signature and the entire `<div className="mt-5 text-center">` block containing the "Looking for something else? Browse other templates →" button.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Verify the app still builds**

Run: `npm run build`
Expected: exit 0, no TypeScript errors. Unused-import errors in `App.tsx` mean Step 4 was incomplete.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: unregister devcv and remove the template gallery UI"
```

---

### Task 4: Scaffold the Skynet template

A verbatim copy with new ids. It parses Skynet PDFs *badly* at the end of this task — that is expected and is what Tasks 6 to 10 fix, one failing test at a time.

**Files:**
- Create: `src/templates/skynet/` (copy of `src/templates/superset/`)
- Modify: `src/templates/registry.ts`
- Modify: `test/registry.test.ts`

**Interfaces:**
- Consumes: `supersetTemplate` (Task 2), `TEMPLATES` (Task 3).
- Produces: `skynetTemplate` from `@/templates/skynet` with `id: 'skynet'`; types `SkynetResumeData`, `emptySkynetResume()`, `hydrateSkynet()`, `detectSkynet()`, `parseResume()` (skynet's own).

- [ ] **Step 1: Copy and rename**

```bash
cp -r src/templates/superset src/templates/skynet
cd src/templates/skynet
sed -i "s|supersetTemplate|skynetTemplate|g; s|SupersetResumeData|SkynetResumeData|g; s|emptySupersetResume|emptySkynetResume|g; s|hydrateSuperset|hydrateSkynet|g; s|detectSuperset|detectSkynet|g; s|SupersetForm|SkynetForm|g; s|SupersetSectionsPanel|SkynetSectionsPanel|g" \
  index.ts types.ts hydrate.ts detect.ts parser.ts Form.tsx Preview.tsx SectionsPanel.tsx sample.ts form-sections/*.tsx
cd -
```

- [ ] **Step 2: Set the id, label and description**

In `src/templates/skynet/index.ts`:

```ts
export const skynetTemplate: TemplateConfig<SkynetResumeData> = {
  id: 'skynet',
  label: '62nd batch and later',
  description: 'Skynet — the IIM Calcutta placement resume used from the 62nd batch onward.',
  // ...rest unchanged for now
};
```

- [ ] **Step 3: Register it**

`src/templates/registry.ts`:

```ts
import { supersetTemplate } from './superset';
import { skynetTemplate } from './skynet';

export const TEMPLATES: AnyTemplateConfig[] = [supersetTemplate, skynetTemplate];
```

- [ ] **Step 4: Update the registry test**

In `test/registry.test.ts`, change the first expectation to:

```ts
    expect(TEMPLATES.map((t) => t.id)).toEqual(['superset', 'skynet']);
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all tests PASS and the build exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: scaffold skynet template as a copy of superset"
```

---

### Task 5: Skynet section vocabulary and types

**Files:**
- Modify: `src/templates/skynet/types.ts`, `src/templates/skynet/hydrate.ts`
- Create: `test/skynet-types.test.ts`

**Interfaces:**
- Consumes: `SkynetResumeData` (Task 4).
- Produces: `SectionKey` union of seven keys; `DEFAULT_SECTION_ORDER`; `SECTION_LABELS`; `SkynetResumeData` with `projects`, `entrepreneurial`, `hiddenSections`, and no `resumeType`; `hydrateSkynet(input): SkynetResumeData`.

- [ ] **Step 1: Write the failing test**

`test/skynet-types.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  emptySkynetResume,
} from '@/templates/skynet/types';
import { hydrateSkynet } from '@/templates/skynet/hydrate';

describe('skynet types', () => {
  it('has all seven sections in document order', () => {
    expect(DEFAULT_SECTION_ORDER).toEqual([
      'education', 'distinctions', 'projects', 'entrepreneurial',
      'industry', 'positions', 'extras',
    ]);
  });

  it('labels sections with the exact PDF header strings', () => {
    expect(SECTION_LABELS.education).toBe('Academic Profile');
    expect(SECTION_LABELS.positions).toBe('Position of Responsibility');
    expect(SECTION_LABELS.projects).toBe('Projects and Papers');
    expect(SECTION_LABELS.entrepreneurial).toBe('Entrepreneurial/Non-Profit Venture');
  });

  it('starts with nothing hidden and no ranked variant', () => {
    const empty = emptySkynetResume();
    expect(empty.hiddenSections).toEqual([]);
    expect(empty).not.toHaveProperty('resumeType');
  });

  it('repairs a draft missing the new fields', () => {
    const hydrated = hydrateSkynet({ name: 'X' } as never);
    expect(hydrated.projects).toEqual([]);
    expect(hydrated.entrepreneurial).toEqual([]);
    expect(hydrated.hiddenSections).toEqual([]);
    expect(hydrated.sectionOrder).toEqual(DEFAULT_SECTION_ORDER);
  });

  it('drops unknown keys and appends missing ones in sectionOrder', () => {
    const hydrated = hydrateSkynet({ sectionOrder: ['extras', 'bogus'] } as never);
    expect(hydrated.sectionOrder[0]).toBe('extras');
    expect(hydrated.sectionOrder).toHaveLength(7);
    expect(hydrated.sectionOrder).not.toContain('bogus');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-types.test.ts`
Expected: FAIL — `DEFAULT_SECTION_ORDER` has five entries and `SECTION_LABELS.education` is `'Academic Qualifications'`.

- [ ] **Step 3: Rewrite the type module**

Replace the top of `src/templates/skynet/types.ts` (through `emptySkynetResume`) with:

```ts
export type SectionKey =
  | 'education'
  | 'distinctions'
  | 'projects'
  | 'entrepreneurial'
  | 'industry'
  | 'positions'
  | 'extras';

export const DEFAULT_SECTION_ORDER: SectionKey[] = [
  'education',
  'distinctions',
  'projects',
  'entrepreneurial',
  'industry',
  'positions',
  'extras',
];

export const SECTION_LABELS: Record<SectionKey, string> = {
  education: 'Academic Profile',
  distinctions: 'Academic Distinctions & Co-Curricular Achievements',
  projects: 'Projects and Papers',
  entrepreneurial: 'Entrepreneurial/Non-Profit Venture',
  industry: 'Industry Experience',
  positions: 'Position of Responsibility',
  extras: 'Extra-Curricular Achievements',
};

export interface SkynetResumeData {
  name: string;
  mbaId: string;
  taglines: [string, string, string];
  sectionOrder: SectionKey[];
  hiddenSections: SectionKey[];
  education: EducationRow[];
  distinctions: BulletGroup[];
  projects: BulletGroup[];
  entrepreneurial: BulletGroup[];
  industryRightText: string;
  experience: ExperienceEntry[];
  positions: PositionEntry[];
  extras: BulletGroup[];
  email: string;
  institute: string;
}

export function emptySkynetResume(): SkynetResumeData {
  return {
    name: '',
    mbaId: '',
    taglines: ['', '', ''],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    hiddenSections: [],
    education: [],
    distinctions: [],
    projects: [],
    entrepreneurial: [],
    industryRightText: '',
    experience: [],
    positions: [],
    extras: [],
    email: '',
    institute: 'Indian Institute of Management Calcutta',
  };
}
```

Delete the `ResumeType` type and the `rank?: string` field on `EducationRow`. Keep `YearedBullet`, `BulletGroup`, `ExperienceSubSection`, `ExperienceEntry` and `PositionEntry` exactly as they are — Skynet reuses all of them.

- [ ] **Step 4: Update hydrate**

Replace `src/templates/skynet/hydrate.ts`:

```ts
import type { SkynetResumeData, SectionKey } from './types';
import { emptySkynetResume, DEFAULT_SECTION_ORDER } from './types';

export function hydrateSkynet(input: Partial<SkynetResumeData>): SkynetResumeData {
  const base = emptySkynetResume();
  const merged: SkynetResumeData = { ...base, ...input } as SkynetResumeData;

  if (!Array.isArray(merged.taglines) || merged.taglines.length !== 3) {
    merged.taglines = ['', '', ''];
  }
  for (const key of ['distinctions', 'projects', 'entrepreneurial', 'extras',
                     'education', 'experience', 'positions'] as const) {
    if (!Array.isArray(merged[key])) (merged as never as Record<string, unknown>)[key] = [];
  }

  // Repair sectionOrder: drop unknown keys, append missing defaults.
  const seen = new Set<SectionKey>();
  const cleaned: SectionKey[] = [];
  for (const k of Array.isArray(merged.sectionOrder) ? merged.sectionOrder : []) {
    if (DEFAULT_SECTION_ORDER.includes(k) && !seen.has(k)) {
      cleaned.push(k);
      seen.add(k);
    }
  }
  for (const k of DEFAULT_SECTION_ORDER) if (!seen.has(k)) cleaned.push(k);
  merged.sectionOrder = cleaned;

  merged.hiddenSections = (Array.isArray(merged.hiddenSections) ? merged.hiddenSections : [])
    .filter((k) => DEFAULT_SECTION_ORDER.includes(k));

  return merged;
}
```

- [ ] **Step 5: Fix the resulting compile errors**

`sample.ts`, `Form.tsx`, `Preview.tsx`, `SectionsPanel.tsx` and `parser.ts` in `skynet/` still reference `resumeType` and `rank`. Remove those references. In `parser.ts`, delete `resumeType: edu.ranked ? 'ranked' : 'unranked',` from the returned object and add `projects: [], entrepreneurial: [], hiddenSections: [],` as placeholders — Task 9 fills them in.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run test/skynet-types.test.ts && npm run build`
Expected: all five tests PASS and the build exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: skynet section vocabulary, hiddenSections, drop ranked variant"
```

---

### Task 6: Skynet anchors and the `■` bullet glyph

**Files:**
- Modify: `src/templates/skynet/parser.ts`
- Create: `test/skynet-parser.test.ts`

**Interfaces:**
- Consumes: `loadFixture` (Task 1), skynet types (Task 5).
- Produces: `parseResume(lines): ParseResult<SkynetResumeData>` from `@/templates/skynet/parser`, correct for education, positions and glyph stripping.

- [ ] **Step 1: Write the failing test**

`test/skynet-parser.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { parseResume } from '@/templates/skynet/parser';

const A = () => parseResume(loadFixture('skynet-a')).data;
const B = () => parseResume(loadFixture('skynet-b')).data;

describe('skynet parser: anchors and glyphs', () => {
  it('parses ACADEMIC PROFILE into education rows', () => {
    const edu = A().education!;
    expect(edu.length).toBeGreaterThanOrEqual(4);
    expect(edu.some((r) => /Indian Institute of Technology/i.test(r.institute))).toBe(true);
    expect(edu.every((r) => r.year !== '')).toBe(true);
  });

  it('parses the singular POSITION OF RESPONSIBILITY header', () => {
    expect(B().positions!.length).toBeGreaterThan(0);
  });

  it('strips the U+25A0 bullet glyph from every bullet', () => {
    const texts = [
      ...A().distinctions!.flatMap((g) => g.bullets.map((b) => b.text)),
      ...A().extras!.flatMap((g) => g.bullets.map((b) => b.text)),
      ...A().experience!.flatMap((e) => e.subSections.flatMap((s) => s.bullets)),
    ];
    expect(texts.length).toBeGreaterThan(10);
    for (const t of texts) expect(t).not.toMatch(/[■▪•]/);
  });

  it('reports no failed sections', () => {
    expect(parseResume(loadFixture('skynet-a')).failedSections).toEqual([]);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-parser.test.ts`
Expected: FAIL — education is `[]`, positions is `[]`, and bullet texts start with `■ `.

- [ ] **Step 3: Replace the anchors and glyph set**

In `src/templates/skynet/parser.ts`, replace the `ANCHORS` and `BULLET_GLYPHS` constants:

```ts
const ANCHORS = [
  'ACADEMIC PROFILE',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
  'PROJECTS AND PAPERS',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE',
  'INDUSTRY EXPERIENCE',
  'POSITION OF RESPONSIBILITY',
  'EXTRA-CURRICULAR ACHIEVEMENTS',
];

// U+25A0 BLACK SQUARE is the Skynet bullet, set in DejaVuMathTeXGyre at 3.4pt.
// The others are retained so a hand-edited resume still parses.
const BULLET_GLYPHS = '■•·●▪‣◦∙⋅';
```

Also update the local `DEFAULT_SECTION_ORDER` at the top of `parser.ts` (it duplicates the one in `types.ts`) to import from `./types` instead:

```ts
import { DEFAULT_SECTION_ORDER } from './types';
```

and delete the local `const DEFAULT_SECTION_ORDER` array.

- [ ] **Step 4: Point `parseResume` at the new section names**

In `parseResume`, change the two renamed lookups:

```ts
    () => parseEducation(getSection('ACADEMIC PROFILE')?.lines ?? []),
```

```ts
    () => parsePositions(getSection('POSITION OF RESPONSIBILITY')?.lines ?? []),
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run test/skynet-parser.test.ts`
Expected: the education, positions and failed-sections tests PASS. The glyph test may still FAIL for industry bullets — that is Task 7's `bodyLines` filter interacting with the glyph run; if so, leave it failing and note it, Task 7 resolves it.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: skynet section anchors and U+25A0 bullet glyph"
```

---

### Task 7: Industry Experience full-width bullet regime

Industry bullets run to x≈575.4 with no year column, while every other section stops at ≈547 to leave room for years at 552–575. `findYearX` derives one threshold per section and, in Industry, latches onto a number inside bullet text and clips at ≈547.

**Files:**
- Modify: `src/templates/skynet/parser.ts` (`parseIndustry`)
- Modify: `test/skynet-parser.test.ts`

**Interfaces:**
- Consumes: `parseResume` (Task 6).
- Produces: untruncated `experience[].subSections[].bullets`.

- [ ] **Step 1: Write the failing test**

Append to `test/skynet-parser.test.ts`:

```ts
describe('skynet parser: industry column regime', () => {
  it('does not truncate industry bullets', () => {
    const bullets = parseResume(loadFixture('skynet-a')).data
      .experience!.flatMap((e) => e.subSections.flatMap((s) => s.bullets));
    expect(bullets.length).toBeGreaterThan(5);
    // The known-truncated bullet: "...Environment Management in 3 mines".
    const b = bullets.find((t) => /Environment Management/.test(t));
    expect(b).toBeDefined();
    expect(b).toMatch(/mines/);
  });

  it('keeps the months banner off the bullets', () => {
    const data = parseResume(loadFixture('skynet-a')).data;
    expect(data.industryRightText).toMatch(/^\d+ MONTHS \(FULL-TIME\)$/);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-parser.test.ts -t "truncate"`
Expected: FAIL — the bullet ends at `"...Environment Management in 3"`.

- [ ] **Step 3: Force the full-width regime in `parseIndustry`**

In `src/templates/skynet/parser.ts`, inside `parseIndustry`, replace the `findYearX` call:

```ts
  // Skynet's Industry Experience has no year column — bullets run the full
  // width to x≈575 and dates live on the firm banner row. Deriving a year
  // threshold here latches onto digits inside bullet text and clips them.
  const yearX = Infinity;
```

That is a one-line substitution: the existing `const yearX = findYearX(bodyLines);` becomes the above. Leave `findYearX` itself in place — the bullet-table sections still call it.

- [ ] **Step 4: Run the tests**

Run: `npx vitest run test/skynet-parser.test.ts`
Expected: both new tests PASS.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "fix: skynet industry bullets use the full-width column regime"
```

---

### Task 8: Route rotated margin labels to `experience[].type`

`Full Time` (270 files), `Intern` (350) and `Others` (12) are rendered rotated in the left margin. The current text filter only knows two of the three and matches on text, so `Others` leaks into sub-section labels — producing `"Full Time\nInvestment\nExecution"`.

**Files:**
- Modify: `src/lib/pdfExtract.ts` (carry `rotated` on `TextItem`)
- Modify: `scripts/make-fixture.mjs`, `test/support/pdf.ts` (carry it through)
- Modify: `src/templates/skynet/parser.ts` (`parseIndustry`)
- Modify: `test/skynet-parser.test.ts`

**Interfaces:**
- Consumes: `groupIntoLines` (Task 1), `parseIndustry` (Task 7).
- Produces: `TextItem.rotated: boolean`; `experience[].type ∈ { 'Full Time', 'Intern', 'Others' }`.

- [ ] **Step 1: Write the failing test**

Append to `test/skynet-parser.test.ts`:

```ts
describe('skynet parser: rotated margin labels', () => {
  it('never leaks a margin label into a sub-section label', () => {
    for (const f of ['skynet-a', 'skynet-b', 'skynet-c']) {
      const labels = parseResume(loadFixture(f)).data
        .experience!.flatMap((e) => e.subSections.map((s) => s.label));
      for (const l of labels) {
        expect(l).not.toMatch(/Full Time|Intern|Others/);
      }
    }
  });

  it('assigns each experience entry a margin type', () => {
    const types = parseResume(loadFixture('skynet-a')).data.experience!.map((e) => e.type);
    expect(types.length).toBeGreaterThan(0);
    for (const t of types) expect(['Full Time', 'Intern', 'Others']).toContain(t);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-parser.test.ts -t "rotated"`
Expected: FAIL — a label reads `"Full Time\nInvestment\nExecution"`.

- [ ] **Step 3: Carry rotation through extraction**

Text matching is the wrong signal; rotation is structural. A rotated pdfjs item has a transform whose off-diagonal terms are non-zero. In `src/lib/pdfExtract.ts` add the field to the interface:

```ts
export interface TextItem {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontName: string;
  /** True when the glyph run is not laid out left-to-right (rotated margin labels). */
  rotated: boolean;
}
```

and set it in `extractTextItems`:

```ts
      const t = it.transform ?? [1, 0, 0, 1, 0, 0];
      items.push({
        str: it.str,
        x,
        y,
        width,
        height,
        fontName: it.fontName ?? '',
        rotated: Math.abs(t[1]) > 0.01 || Math.abs(t[2]) > 0.01,
      });
```

Apply the identical addition to `scripts/make-fixture.mjs` and to `linesFromPdf` in `test/support/pdf.ts` so all three item sources agree.

- [ ] **Step 4: Regenerate the fixtures**

The committed JSON predates the `rotated` field. Re-run the four commands from Task 1 Step 6, then re-run Task 1 Step 7's identity check.

- [ ] **Step 5: Use rotation in `parseIndustry`**

Replace the text-based `bodyLines` filter with a rotation-based split that also captures the label:

```ts
  // Rotated runs in the left margin group the entries: Full Time / Intern / Others.
  const marginLabels: { y: number; text: string }[] = [];
  const bodyLines = lines.filter((l) => {
    if (l.items.length && l.items.every((it) => it.rotated)) {
      marginLabels.push({ y: l.y, text: l.text.trim() });
      return false;
    }
    return true;
  });

  /** The margin label whose y is nearest the given banner row. */
  const typeForY = (y: number): string => {
    if (!marginLabels.length) return '';
    let best = marginLabels[0];
    for (const m of marginLabels) {
      if (Math.abs(m.y - y) < Math.abs(best.y - y)) best = m;
    }
    return best.text;
  };
```

Then where each `ExperienceEntry` is built, set `type: typeForY(block.banner.y)` in place of whatever the copied code assigns.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run`
Expected: all PASS, including the Task 6 glyph test which should now be green for industry bullets too.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "fix: detect rotated margin labels structurally and map them to experience type"
```

---

### Task 9: Projects, Entrepreneurial, and document section order

**Files:**
- Modify: `src/templates/skynet/parser.ts` (`parseResume`)
- Modify: `test/skynet-parser.test.ts`

**Interfaces:**
- Consumes: `parseBulletTable` (existing), `splitSections` (existing), skynet types (Task 5).
- Produces: `data.projects`, `data.entrepreneurial`, `data.sectionOrder` in document order, `data.hiddenSections` for sections absent from the source.

- [ ] **Step 1: Write the failing test**

Append to `test/skynet-parser.test.ts`:

```ts
describe('skynet parser: optional sections', () => {
  it('parses ENTREPRENEURIAL/NON-PROFIT VENTURE as a bullet table', () => {
    const ent = parseResume(loadFixture('skynet-a')).data.entrepreneurial!;
    expect(ent.length).toBeGreaterThan(0);
    expect(ent[0].bullets.length).toBeGreaterThan(0);
    expect(ent[0].bullets[0].year).toMatch(/\d/);
  });

  it('parses PROJECTS AND PAPERS as a bullet table', () => {
    const proj = parseResume(loadFixture('skynet-c')).data.projects!;
    expect(proj.length).toBeGreaterThan(0);
  });

  it('reports section order as it appears in the document', () => {
    // skynet-c places Projects before Industry.
    const order = parseResume(loadFixture('skynet-c')).data.sectionOrder!;
    expect(order.indexOf('projects')).toBeLessThan(order.indexOf('industry'));
  });

  it('hides sections the source document does not contain', () => {
    // skynet-a has no Projects and no Position of Responsibility.
    const hidden = parseResume(loadFixture('skynet-a')).data.hiddenSections!;
    expect(hidden).toContain('projects');
    expect(hidden).toContain('positions');
    expect(hidden).not.toContain('education');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-parser.test.ts -t "optional sections"`
Expected: FAIL — `projects` and `entrepreneurial` are the empty placeholders from Task 5, and `sectionOrder` is the hardcoded default.

- [ ] **Step 3: Parse the two new sections**

In `parseResume`, after the `distinctions` block:

```ts
  const projects = trySection(
    'projects',
    () => parseBulletTable(getSection('PROJECTS AND PAPERS')?.lines ?? []),
    [],
    failed
  );
  const entrepreneurial = trySection(
    'entrepreneurial',
    () => parseBulletTable(getSection('ENTREPRENEURIAL/NON-PROFIT VENTURE')?.lines ?? []),
    [],
    failed
  );
```

- [ ] **Step 4: Derive order and hidden sections from the document**

Still in `parseResume`, before the return:

```ts
const ANCHOR_TO_KEY: Record<string, SectionKey> = {
  'ACADEMIC PROFILE': 'education',
  'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS': 'distinctions',
  'PROJECTS AND PAPERS': 'projects',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE': 'entrepreneurial',
  'INDUSTRY EXPERIENCE': 'industry',
  'POSITION OF RESPONSIBILITY': 'positions',
  'EXTRA-CURRICULAR ACHIEVEMENTS': 'extras',
};
```

(place that constant at module scope, beside `ANCHORS`), then inside `parseResume`:

```ts
  // Order follows the document; sections the document omits start hidden.
  const present = sections
    .map((s) => ANCHOR_TO_KEY[s.name])
    .filter((k): k is SectionKey => Boolean(k));
  const seenKeys = new Set(present);
  const sectionOrder: SectionKey[] = [...present];
  const hiddenSections: SectionKey[] = [];
  for (const k of DEFAULT_SECTION_ORDER) {
    if (!seenKeys.has(k)) {
      sectionOrder.push(k);
      hiddenSections.push(k);
    }
  }
```

and use them in the returned object in place of the Task 5 placeholders:

```ts
      sectionOrder,
      hiddenSections,
      projects,
      entrepreneurial,
```

- [ ] **Step 5: Run the tests**

Run: `npx vitest run`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: parse skynet projects and entrepreneurial sections, derive order from document"
```

---

### Task 10: Fixed four-column Skynet education

**Files:**
- Modify: `src/templates/skynet/parser.ts` (`parseEducation`)
- Modify: `test/skynet-parser.test.ts`

**Interfaces:**
- Consumes: `parseResume` (Task 9).
- Produces: `parseEducation(lines): { rows: EducationRow[] }` — no `ranked` flag.

- [ ] **Step 1: Write the failing test**

Append to `test/skynet-parser.test.ts`:

```ts
describe('skynet parser: education table', () => {
  it('reads all four columns for every row', () => {
    for (const f of ['skynet-a', 'skynet-b', 'skynet-c']) {
      const rows = parseResume(loadFixture(f)).data.education!;
      expect(rows.length).toBeGreaterThanOrEqual(4);
      for (const r of rows) {
        expect(r.degree).not.toBe('');
        expect(r.institute).not.toBe('');
        expect(r.gpa).not.toBe('');
        expect(r.year).toMatch(/^(19|20)\d{2}$|^Passed$/);
      }
    }
  });

  it('does not emit a rank column', () => {
    const rows = parseResume(loadFixture('skynet-a')).data.education!;
    for (const r of rows) expect(r).not.toHaveProperty('rank');
  });

  it('excludes the column header row from the data', () => {
    const rows = parseResume(loadFixture('skynet-a')).data.education!;
    expect(rows.some((r) => /Degree\/Exam/.test(r.degree))).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-parser.test.ts -t "education table"`
Expected: FAIL on the `rank` property, which the copied `parseEducation` still emits.

- [ ] **Step 3: Simplify `parseEducation`**

Replace the whole function in `src/templates/skynet/parser.ts`. Skynet's table is always four columns, so the ranked branch and its `maxCells` fork both go:

```ts
function parseEducation(lines: PdfLine[]): { rows: EducationRow[] } {
  // Skynet's Academic Profile is always four columns:
  // Degree/Exam | Board/Institute | %/CGPA | Year. There is no Rank column.
  const filtered = lines.filter((l) => {
    const t = l.text.toLowerCase();
    return (
      !/^degree\/exam/.test(t) &&
      !/^board\/institute/.test(t) &&
      !/^%\/cgpa/.test(t) &&
      !/^year$/.test(t) &&
      !/degree.*board.*cgpa/.test(t)
    );
  });
  if (!filtered.length) return { rows: [] };

  const rows: EducationRow[] = [];
  for (const line of filtered) {
    const cells = splitByTopGaps(line.items, 4, 5);
    if (cells.length < 2) continue;
    const [degree = '', institute = '', gpa = '', year = ''] = cells;
    if (!degree && !institute && !gpa && !year) continue;
    if (/degree/i.test(degree) && /board|institute/i.test(institute)) continue;
    rows.push({ degree, institute, gpa, year });
  }
  if (rows.length > 8) {
    console.warn(`parseEducation: ${rows.length} rows found, truncating to 8`);
  }
  return { rows: rows.slice(0, 8) };
}
```

Update the call site in `parseResume` — the fallback loses its `ranked` key:

```ts
  const edu = trySection(
    'education',
    () => parseEducation(getSection('ACADEMIC PROFILE')?.lines ?? []),
    { rows: [] },
    failed
  );
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all PASS, build exits 0.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: skynet education is a fixed four-column table with no rank"
```

---

### Task 11: Skynet Preview and print geometry

**Files:**
- Modify: `src/templates/skynet/Preview.tsx`, `src/templates/skynet/styles.css`
- Modify: `src/templates/skynet/sample.ts`
- Create: `test/skynet-preview.test.tsx`

**Interfaces:**
- Consumes: `SkynetResumeData` (Task 5), `renderInline` from `@/lib/bold`.
- Produces: `Preview` forwardRef component rendering all seven sections in `sectionOrder`, skipping `hiddenSections`.

- [ ] **Step 1: Write the failing test**

`test/skynet-preview.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Preview from '@/templates/skynet/Preview';
import { SAMPLE } from '@/templates/skynet/sample';

describe('skynet preview', () => {
  it('renders every section heading in order', () => {
    render(<Preview data={SAMPLE} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).toEqual([
      'ACADEMIC PROFILE',
      'ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS',
      'PROJECTS AND PAPERS',
      'ENTREPRENEURIAL/NON-PROFIT VENTURE',
      'INDUSTRY EXPERIENCE',
      'POSITION OF RESPONSIBILITY',
      'EXTRA-CURRICULAR ACHIEVEMENTS',
    ]);
  });

  it('omits hidden sections', () => {
    render(<Preview data={{ ...SAMPLE, hiddenSections: ['projects', 'positions'] }} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings).not.toContain('PROJECTS AND PAPERS');
    expect(headings).not.toContain('POSITION OF RESPONSIBILITY');
    expect(headings).toContain('INDUSTRY EXPERIENCE');
  });

  it('honours a reordered sectionOrder', () => {
    const data = { ...SAMPLE, sectionOrder: ['extras', ...SAMPLE.sectionOrder.filter((k) => k !== 'extras')] as typeof SAMPLE.sectionOrder };
    render(<Preview data={data} />);
    const headings = screen.getAllByRole('heading', { level: 2 }).map((h) => h.textContent);
    expect(headings[0]).toBe('EXTRA-CURRICULAR ACHIEVEMENTS');
  });

  it('renders the months banner beside the industry heading', () => {
    render(<Preview data={SAMPLE} />);
    expect(screen.getByText(SAMPLE.industryRightText)).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-preview.test.tsx`
Expected: FAIL — the copied Preview renders the five Superset headings.

- [ ] **Step 3: Write the Skynet sample data**

Replace `src/templates/skynet/sample.ts` with a fully fictional 63rd-batch candidate populating all seven sections, `hiddenSections: []`, and `industryRightText: '22 MONTHS (FULL-TIME)'`. Keep the existing file's disclaimer comment. Every `experience` entry needs a `type` of `'Full Time'`, `'Intern'` or `'Others'`.

- [ ] **Step 4: Rewrite the Preview**

Two changes to `src/templates/skynet/Preview.tsx`. First, `SectionBar` must render its title as an `<h2>` so the tests can address sections by role — find its definition in the file and change the title element to:

```tsx
      <h2 className="sk-section-title">{title}</h2>
```

Second, replace the `order` computation and the `switch` with the seven-section version. `projects` and `entrepreneurial` reuse `BulletGroupTable` exactly as `distinctions` and `extras` do:

```tsx
  const hidden = new Set(data.hiddenSections ?? []);
  const order: SectionKey[] = (
    data.sectionOrder && data.sectionOrder.length ? data.sectionOrder : DEFAULT_SECTION_ORDER
  ).filter((k) => !hidden.has(k));
```

```tsx
      {order.map((key) => {
        switch (key) {
          case 'education':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ACADEMIC PROFILE" />
                <EducationTable data={data} />
              </React.Fragment>
            );
          case 'distinctions':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ACADEMIC DISTINCTIONS & CO-CURRICULAR ACHIEVEMENTS" />
                <BulletGroupTable groups={data.distinctions} />
              </React.Fragment>
            );
          case 'projects':
            return (
              <React.Fragment key={key}>
                <SectionBar title="PROJECTS AND PAPERS" />
                <BulletGroupTable groups={data.projects} />
              </React.Fragment>
            );
          case 'entrepreneurial':
            return (
              <React.Fragment key={key}>
                <SectionBar title="ENTREPRENEURIAL/NON-PROFIT VENTURE" />
                <BulletGroupTable groups={data.entrepreneurial} />
              </React.Fragment>
            );
          case 'industry':
            return (
              <React.Fragment key={key}>
                <SectionBar title="INDUSTRY EXPERIENCE" rightText={data.industryRightText} />
                <IndustryTable entries={data.experience} />
              </React.Fragment>
            );
          case 'positions':
            return (
              <React.Fragment key={key}>
                <SectionBar title="POSITION OF RESPONSIBILITY" />
                <PositionsTable data={data} />
              </React.Fragment>
            );
          case 'extras':
            return (
              <React.Fragment key={key}>
                <SectionBar title="EXTRA-CURRICULAR ACHIEVEMENTS" />
                <BulletGroupTable groups={data.extras} />
              </React.Fragment>
            );
          default:
            return null;
        }
      })}
```

Then inside `IndustryTable`, group consecutive entries by `entry.type` and render each group's type once as a rotated label in the left margin (`writing-mode: vertical-rl; transform: rotate(180deg)`), matching how the source PDFs place `Full Time` / `Intern` / `Others`.

- [ ] **Step 5: Apply the measured geometry**

In `src/templates/skynet/styles.css`, express the constants from the Global Constraints as CSS custom properties on the page root, so the print output matches the source PDFs:

```css
.skynet-page {
  --page-w: 595pt;
  --page-h: 842pt;
  --hdr-x: 19.5pt;
  --hdr-size: 11.2pt;
  --body-size: 9.9pt;
  --row-pitch: 14.6pt;
  --bullet-x: 108.4pt;
  --bullet-text-x: 113.2pt;
  --year-x: 552pt;
  --year-w: 23pt;
  --footer-size: 8.2pt;
  width: var(--page-w);
  min-height: var(--page-h);
  font-family: Calibri, Carlito, sans-serif;
  font-size: var(--body-size);
}
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run test/skynet-preview.test.tsx`
Expected: all four PASS.

- [ ] **Step 7: Verify against a real resume by eye**

Run `npm run dev`, upload `corpus-resume-A.pdf`, and compare the preview side by side with the PDF. Check column alignment, the `■` bullets, the year column and the rotated margin labels. This is the one check no unit test covers.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: skynet preview with measured A4 geometry and seven sections"
```

---

### Task 12: Skynet editor form

**Files:**
- Modify: `src/templates/skynet/Form.tsx`
- Modify: `src/templates/skynet/form-sections/EducationForm.tsx` (drop the rank field)
- Create: `test/skynet-form.test.tsx`

**Interfaces:**
- Consumes: `BulletGroupsForm` (existing, reused verbatim), `SkynetResumeData` (Task 5).
- Produces: `SkynetForm` rendering accordions for all seven sections.

- [ ] **Step 1: Write the failing test**

`test/skynet-form.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import Form from '@/templates/skynet/Form';
import { SAMPLE } from '@/templates/skynet/sample';

describe('skynet form', () => {
  it('offers an accordion for each editable section', () => {
    render(<Form data={SAMPLE} onChange={vi.fn()} />);
    for (const title of [
      'Academic Profile',
      'Academic Distinctions & Co-Curricular Achievements',
      'Projects and Papers',
      'Entrepreneurial/Non-Profit Venture',
      'Industry Experience',
      'Position of Responsibility',
      'Extra-Curricular Achievements',
    ]) {
      expect(screen.getByRole('button', { name: new RegExp(title, 'i') })).toBeTruthy();
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/skynet-form.test.tsx`
Expected: FAIL — no Projects or Entrepreneurial accordion.

- [ ] **Step 3: Add the two new section forms**

In `src/templates/skynet/Form.tsx`, insert after the distinctions block:

```tsx
      <BulletGroupsForm
        title="Projects and Papers"
        groups={data.projects}
        onChange={(projects) => onChange({ projects })}
      />
      <BulletGroupsForm
        title="Entrepreneurial/Non-Profit Venture"
        groups={data.entrepreneurial}
        onChange={(entrepreneurial) => onChange({ entrepreneurial })}
      />
```

and retitle the education and positions forms to `Academic Profile` and `Position of Responsibility`.

- [ ] **Step 4: Drop the rank field**

In `src/templates/skynet/form-sections/EducationForm.tsx`, remove the Rank input and any `resumeType` toggle — Skynet has neither.

- [ ] **Step 5: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all PASS, build exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: skynet editor form covers all seven sections"
```

---

### Task 13: Batch auto-detection on upload

**Files:**
- Modify: `src/templates/superset/detect.ts`, `src/templates/skynet/detect.ts`
- Create: `src/lib/batch.ts`
- Modify: `src/components/Landing.tsx`
- Create: `test/batch-detect.test.ts`

**Interfaces:**
- Consumes: `PdfLine` (Task 1), `loadFixture` (Task 1).
- Produces: `batchNumberFromLines(lines: PdfLine[]): number | null` and `templateForBatch(n: number): TemplateKey` from `@/lib/batch`.

- [ ] **Step 1: Write the failing test**

`test/batch-detect.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { loadFixture } from './support/pdf';
import { batchNumberFromLines, templateForBatch } from '@/lib/batch';
import { detectSkynet } from '@/templates/skynet/detect';
import { detectSuperset } from '@/templates/superset/detect';

describe('batch detection', () => {
  it('reads the batch number from the MBA id', () => {
    expect(batchNumberFromLines(loadFixture('skynet-a'))).toBe(63);
    expect(batchNumberFromLines(loadFixture('superset-a'))).toBe(61);
  });

  it('maps batch numbers to templates at the 62 boundary', () => {
    expect(templateForBatch(61)).toBe('superset');
    expect(templateForBatch(62)).toBe('skynet');
    expect(templateForBatch(63)).toBe('skynet');
    expect(templateForBatch(58)).toBe('superset');
  });

  it('returns null when no MBA id is present', () => {
    expect(batchNumberFromLines([])).toBeNull();
  });

  it('detectors agree with the id, and never both claim a file', () => {
    for (const [f, expected] of [['skynet-a', true], ['superset-a', false]] as const) {
      expect(detectSkynet(loadFixture(f))).toBe(expected);
      expect(detectSuperset(loadFixture(f))).toBe(!expected);
    }
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/batch-detect.test.ts`
Expected: FAIL — `@/lib/batch` does not exist.

- [ ] **Step 3: Write the batch helper**

`src/lib/batch.ts`:

```ts
import type { PdfLine } from './pdfExtract';
import type { TemplateKey } from '@/templates/types';

const MBA_ID_RE = /MBA\/\d+\/(\d+)/;

/** The trailing number of the MBA id is the batch, e.g. MBA/0002/63 -> 63. */
export function batchNumberFromLines(lines: PdfLine[]): number | null {
  for (const l of lines) {
    const m = l.text.match(MBA_ID_RE);
    if (m) return Number(m[1]);
  }
  return null;
}

/** The 62nd batch is the first to use the Skynet format. */
export const SKYNET_FIRST_BATCH = 62;

export function templateForBatch(batch: number): TemplateKey {
  return batch >= SKYNET_FIRST_BATCH ? 'skynet' : 'superset';
}
```

- [ ] **Step 4: Make the detectors defer to the batch number**

In `src/templates/skynet/detect.ts`:

```ts
import type { PdfLine } from '@/lib/pdfExtract';
import { batchNumberFromLines, templateForBatch } from '@/lib/batch';

const SKYNET_ANCHORS = [
  'ACADEMIC PROFILE',
  'PROJECTS AND PAPERS',
  'ENTREPRENEURIAL/NON-PROFIT VENTURE',
  'POSITION OF RESPONSIBILITY',
];

/** The MBA id is authoritative; header vocabulary is only the tiebreak. */
export function detectSkynet(lines: PdfLine[]): boolean {
  const batch = batchNumberFromLines(lines);
  if (batch !== null) return templateForBatch(batch) === 'skynet';
  const upper = lines.map((l) => l.text.toUpperCase());
  return SKYNET_ANCHORS.some((a) => upper.some((t) => t.includes(a)));
}
```

Apply the mirror-image change to `src/templates/superset/detect.ts`, keeping its existing `ACADEMIC QUALIFICATIONS` / `POSITIONS OF RESPONSIBILITY` anchors as the fallback and returning `templateForBatch(batch) === 'superset'` when an id is present.

- [ ] **Step 5: Use it in Landing**

In `src/components/Landing.tsx`, replace the "try IIMC first, then any other detector" block in `consumeFile` with:

```ts
      const batch = batchNumberFromLines(lines);
      const id = batch !== null ? templateForBatch(batch) : null;
      const chosen = id ? TEMPLATES.find((t) => t.id === id) : TEMPLATES.find((t) => t.detect?.(lines));
      if (chosen?.parse) {
        const { data: parsed, failedSections } = chosen.parse(lines);
        const merged = { ...chosen.emptyData(), ...parsed };
        onReady(chosen.id, merged, { warnBoldLost: true, failedSections });
        return;
      }
      setPendingFile(file);
      setChooserOpen(true);
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all PASS, build exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: auto-detect batch from the MBA id on upload"
```

---

### Task 14: Landing page batch cards

**Files:**
- Modify: `src/components/Landing.tsx`, `src/components/TemplateChooserModal.tsx`
- Create: `test/landing.test.tsx`

**Interfaces:**
- Consumes: `TEMPLATES` (Task 4), batch helpers (Task 13).
- Produces: `Landing` with `onReady(templateId, data, opts?)` only — no `onBrowseTemplates`.

- [ ] **Step 1: Write the failing test**

`test/landing.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Landing from '@/components/Landing';

describe('landing', () => {
  it('offers the two batch cards with their subtexts', () => {
    render(<Landing onReady={vi.fn()} />);
    expect(screen.getByText('61st batch and prior')).toBeTruthy();
    expect(screen.getByText('Superset')).toBeTruthy();
    expect(screen.getByText('62nd batch and later')).toBeTruthy();
    expect(screen.getByText('Skynet')).toBeTruthy();
  });

  it('no longer advertises other templates', () => {
    render(<Landing onReady={vi.fn()} />);
    expect(screen.queryByText(/Browse other templates/i)).toBeNull();
  });

  // The card's accessible name is "62nd batch and later Skynet"; the sample
  // link's is "See a sample — 62nd batch and later". Anchor the regexes so
  // each matches exactly one button.
  it('starts a blank resume in the chosen batch format', async () => {
    const onReady = vi.fn();
    render(<Landing onReady={onReady} />);
    await userEvent.click(screen.getByRole('button', { name: /^62nd batch and later/i }));
    expect(onReady).toHaveBeenCalledWith('skynet', expect.objectContaining({ name: '' }));
  });

  it('loads sample data from the tertiary link', async () => {
    const onReady = vi.fn();
    render(<Landing onReady={onReady} />);
    await userEvent.click(screen.getByRole('button', { name: /^See a sample.*62nd/i }));
    expect(onReady).toHaveBeenCalledWith('skynet', expect.objectContaining({ name: expect.any(String) }));
    expect(onReady.mock.calls[0][1].name).not.toBe('');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/landing.test.tsx`
Expected: FAIL — the batch card text is absent.

- [ ] **Step 3: Add `codename` to the template config**

In `src/templates/types.ts`, add to `TemplateConfig<TData>`:

```ts
  /** Batch codename shown as card subtext, e.g. "Superset". */
  codename: string;
```

Set `codename: 'Superset'` in `src/templates/superset/index.ts` and `codename: 'Skynet'` in `src/templates/skynet/index.ts`. The build fails until both are present — that is the intended guard.

- [ ] **Step 4: Replace the button pair with batch cards**

In `src/components/Landing.tsx`, replace the `grid grid-cols-2 gap-3` block containing "Start blank" / "Use sample", and the `or` divider above it, with cards derived from `TEMPLATES` so the registry stays the single source of truth:

```tsx
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-[11px] uppercase tracking-wider text-slate-400">
              or start blank
            </span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onReady(t.id, t.emptyData())}
                className="ui-transition px-4 py-3 rounded-lg border border-slate-300 hover:border-slate-900 hover:bg-slate-50 text-center"
              >
                <div className="text-sm font-semibold text-slate-800">{t.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t.codename}</div>
              </button>
            ))}
          </div>

          <div className="flex justify-center gap-4 mt-3">
            {TEMPLATES.map((t) => (
              <button
                key={t.id}
                onClick={() => onReady(t.id, t.sampleData)}
                className="ui-transition text-[11px] text-slate-400 hover:text-slate-800 underline underline-offset-2"
              >
                See a sample — {t.label}
              </button>
            ))}
          </div>
```

The sample link's accessible name contains the batch label, which is what the fourth test addresses it by.

- [ ] **Step 5: Retitle the chooser modal**

`src/components/TemplateChooserModal.tsx` already maps over `TEMPLATES`, so it now lists exactly the two batches. Only its default copy needs to change, since it no longer offers templates:

```tsx
  title = "Couldn't work out which batch this is",
  body = 'Pick the format your resume uses.',
```

and replace the per-row subtext with the codename:

```tsx
              <div className="text-[11px] text-slate-500">{t.codename}</div>
```

- [ ] **Step 6: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all PASS, build exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: landing page offers the two batch formats"
```

---

### Task 15: Header switcher and cross-batch carry-over

**Files:**
- Create: `src/lib/migrateBatch.ts`
- Modify: `src/App.tsx`, `src/components/AppHeader.tsx`
- Create: `test/migrate-batch.test.ts`

**Interfaces:**
- Consumes: `SupersetResumeData` (Task 2), `SkynetResumeData` (Task 5).
- Produces: `migrateBetweenBatches(from: TemplateKey, to: TemplateKey, data: unknown): { data: unknown; dropped: string[] }` from `@/lib/migrateBatch`.

- [ ] **Step 1: Write the failing test**

`test/migrate-batch.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { migrateBetweenBatches } from '@/lib/migrateBatch';
import { SAMPLE as SKYNET } from '@/templates/skynet/sample';
import { SAMPLE as SUPERSET } from '@/templates/superset/sample';

describe('cross-batch carry-over', () => {
  it('carries the shared sections from skynet to superset', () => {
    const { data } = migrateBetweenBatches('skynet', 'superset', SKYNET) as never as
      { data: typeof SUPERSET };
    expect(data.name).toBe(SKYNET.name);
    expect(data.mbaId).toBe(SKYNET.mbaId);
    expect(data.taglines).toEqual(SKYNET.taglines);
    expect(data.education).toEqual(SKYNET.education);
    expect(data.distinctions).toEqual(SKYNET.distinctions);
    expect(data.extras).toEqual(SKYNET.extras);
    expect(data.resumeType).toBe('unranked');
  });

  it('reports the sections dropped going skynet -> superset', () => {
    const { dropped } = migrateBetweenBatches('skynet', 'superset', SKYNET);
    expect(dropped).toEqual(['Projects and Papers', 'Entrepreneurial/Non-Profit Venture']);
  });

  it('reports nothing dropped when those sections are empty', () => {
    const bare = { ...SKYNET, projects: [], entrepreneurial: [] };
    expect(migrateBetweenBatches('skynet', 'superset', bare).dropped).toEqual([]);
  });

  it('is lossless going superset -> skynet', () => {
    const { data, dropped } = migrateBetweenBatches('superset', 'skynet', SUPERSET) as never as
      { data: typeof SKYNET; dropped: string[] };
    expect(dropped).toEqual([]);
    expect(data.projects).toEqual([]);
    expect(data.entrepreneurial).toEqual([]);
    expect(data.name).toBe(SUPERSET.name);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/migrate-batch.test.ts`
Expected: FAIL — `@/lib/migrateBatch` does not exist.

- [ ] **Step 3: Write the mapper**

`src/lib/migrateBatch.ts`:

```ts
import type { TemplateKey } from '@/templates/types';
import { hydrateSuperset } from '@/templates/superset/hydrate';
import { hydrateSkynet } from '@/templates/skynet/hydrate';

const SHARED_KEYS = [
  'name', 'mbaId', 'taglines', 'education', 'distinctions',
  'experience', 'industryRightText', 'positions', 'extras', 'email', 'institute',
] as const;

/** Sections that exist only in Skynet, with the labels shown in the confirm. */
const SKYNET_ONLY: { key: string; label: string }[] = [
  { key: 'projects', label: 'Projects and Papers' },
  { key: 'entrepreneurial', label: 'Entrepreneurial/Non-Profit Venture' },
];

export function migrateBetweenBatches(
  from: TemplateKey,
  to: TemplateKey,
  data: unknown
): { data: unknown; dropped: string[] } {
  const src = (data ?? {}) as Record<string, unknown>;
  const carried: Record<string, unknown> = {};
  for (const k of SHARED_KEYS) {
    if (src[k] !== undefined) carried[k] = src[k];
  }

  const dropped: string[] = [];
  if (from === 'skynet' && to === 'superset') {
    for (const { key, label } of SKYNET_ONLY) {
      const v = src[key];
      if (Array.isArray(v) && v.length > 0) dropped.push(label);
    }
    return { data: hydrateSuperset(carried as never), dropped };
  }

  return { data: hydrateSkynet(carried as never), dropped };
}
```

- [ ] **Step 4: Wire the switcher into App**

In `src/App.tsx`, replace `onChangeTemplate` with a batch toggle that migrates and confirms only when something would be lost:

```ts
  function onChangeTemplate() {
    if (!templateId) return;
    const next: TemplateKey = templateId === 'skynet' ? 'superset' : 'skynet';
    const { data: migrated, dropped } = migrateBetweenBatches(templateId, next, data);
    if (dropped.length) {
      const list = dropped.join(' and ');
      if (!confirm(`The ${getTemplate(next)!.label} format has no ${list} section. Switching will delete that content. Continue?`)) {
        return;
      }
    }
    setTemplateId(next);
    setData(migrated);
    setLastTemplateId(next);
  }
```

- [ ] **Step 5: Update the header button label**

In `src/components/AppHeader.tsx`, change the button's `title` to `Switch resume format (your content is carried over)` and replace the `Template` chip label with `Format`.

- [ ] **Step 6: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all PASS, build exits 0.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: switch batch format in place, carrying content across"
```

---

### Task 16: Section show/hide toggles

Applies to both templates, so Superset's data gains `hiddenSections` too.

**Files:**
- Modify: `src/templates/superset/types.ts`, `src/templates/superset/hydrate.ts`, `src/templates/superset/Preview.tsx`, `src/templates/superset/SectionsPanel.tsx`
- Modify: `src/templates/skynet/SectionsPanel.tsx`
- Create: `test/sections-panel.test.tsx`

**Interfaces:**
- Consumes: `SECTION_LABELS`, `hiddenSections` (Task 5 for skynet; added here for superset).
- Produces: both `SectionsPanel`s emit `onChange({ hiddenSections })`.

- [ ] **Step 1: Write the failing test**

`test/sections-panel.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SkynetPanel from '@/templates/skynet/SectionsPanel';
import { SAMPLE } from '@/templates/skynet/sample';

describe('sections panel', () => {
  it('shows a checkbox per section, all checked when nothing is hidden', () => {
    render(<SkynetPanel data={SAMPLE} onChange={vi.fn()} />);
    const boxes = screen.getAllByRole('checkbox');
    expect(boxes).toHaveLength(7);
    for (const b of boxes) expect((b as HTMLInputElement).checked).toBe(true);
  });

  it('hides a section when its checkbox is unticked', async () => {
    const onChange = vi.fn();
    render(<SkynetPanel data={SAMPLE} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Projects and Papers/i }));
    expect(onChange).toHaveBeenCalledWith({ hiddenSections: ['projects'] });
  });

  it('unhides a section when its checkbox is reticked', async () => {
    const onChange = vi.fn();
    render(<SkynetPanel data={{ ...SAMPLE, hiddenSections: ['projects'] }} onChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: /Projects and Papers/i }));
    expect(onChange).toHaveBeenCalledWith({ hiddenSections: [] });
  });

  it('still reorders sections', async () => {
    const onChange = vi.fn();
    render(<SkynetPanel data={SAMPLE} onChange={onChange} />);
    await userEvent.click(screen.getByRole('button', { name: /Move Academic Distinctions.*up/i }));
    expect(onChange).toHaveBeenCalledWith({
      sectionOrder: ['distinctions', 'education', 'projects', 'entrepreneurial',
                     'industry', 'positions', 'extras'],
    });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run test/sections-panel.test.tsx`
Expected: FAIL — no checkboxes are rendered.

- [ ] **Step 3: Add `hiddenSections` to Superset**

In `src/templates/superset/types.ts` add `hiddenSections: SectionKey[];` to the interface and `hiddenSections: []` to `emptySupersetResume()`. In `hydrate.ts` add the same filtering line used in `hydrateSkynet`. This changes stored data shape, so `hydrate` is what protects existing drafts.

- [ ] **Step 4: Add the checkbox to both panels**

In each `SectionsPanel.tsx`, inside the `<li>` and before the label span:

```tsx
            <input
              type="checkbox"
              checked={!hidden.includes(key)}
              onChange={() =>
                onChange({
                  hiddenSections: hidden.includes(key)
                    ? hidden.filter((k) => k !== key)
                    : [...hidden, key],
                })
              }
              aria-label={SECTION_LABELS[key]}
              className="w-3.5 h-3.5 accent-slate-900"
            />
```

with `const hidden = data.hiddenSections ?? [];` above the return. Give the label span `className={'flex-1 ' + (hidden.includes(key) ? 'text-slate-400 line-through' : 'text-slate-800')}` so hidden sections read as hidden.

- [ ] **Step 5: Carry `hiddenSections` across a batch switch**

Task 15's `SHARED_KEYS` predates Superset having the field. Add it now, so a switch preserves what the user hid:

```ts
const SHARED_KEYS = [
  'name', 'mbaId', 'taglines', 'education', 'distinctions',
  'experience', 'industryRightText', 'positions', 'extras', 'email', 'institute',
  'hiddenSections',
] as const;
```

Both `hydrate` functions already filter `hiddenSections` against their own `DEFAULT_SECTION_ORDER`, so a Skynet-only key such as `projects` is dropped automatically on the way into Superset.

- [ ] **Step 6: Skip hidden sections in both Previews**

In each `Preview.tsx`, filter the rendered order:

```tsx
  const hidden = new Set(data.hiddenSections ?? []);
  const order = (data.sectionOrder ?? DEFAULT_SECTION_ORDER).filter((k) => !hidden.has(k));
```

Because the preview is what `window.print()` captures, this covers the export with no separate print change.

- [ ] **Step 7: Run the tests**

Run: `npx vitest run && npm run build`
Expected: all PASS — including the Task 11 preview test that already asserts hidden sections are omitted — and the build exits 0.

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "feat: show/hide toggles for resume sections in both formats"
```

---

### Task 17: Full-corpus verification

The unit tests cover three resumes. This runs the parser over all 450 and is the evidence that Skynet parsing actually works. It never commits corpus data.

**Files:**
- Create: `test/corpus.test.ts`
- Modify: `README.md`

**Interfaces:**
- Consumes: `linesFromPdf` (Task 1), `parseResume` (Tasks 6–10), `batchNumberFromLines` (Task 13).
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the corpus test**

`test/corpus.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { linesFromPdf } from './support/pdf';
import { parseResume } from '@/templates/skynet/parser';
import { batchNumberFromLines } from '@/lib/batch';

const DIR = process.env.SKYNET_CORPUS_DIR;

// Opt-in: the corpus is real students' resumes and is never committed.
describe.skipIf(!DIR)('skynet corpus', () => {
  const files = DIR ? readdirSync(DIR).filter((f) => f.endsWith('.pdf')) : [];

  it('has the expected corpus size', () => {
    expect(files.length).toBe(450);
  });

  it('parses every resume without failed sections', async () => {
    const problems: string[] = [];
    let withIndustry = 0, withPositions = 0, withProjects = 0, withEntrepreneurial = 0;

    for (const f of files) {
      const lines = await linesFromPdf(join(DIR!, f));
      const { data, failedSections } = parseResume(lines);

      if (failedSections.length) problems.push(`${f}: failed ${failedSections.join()}`);
      if (batchNumberFromLines(lines) !== 63) problems.push(`${f}: batch not 63`);
      if ((data.education?.length ?? 0) < 3) problems.push(`${f}: education ${data.education?.length}`);

      const bullets = [
        ...(data.distinctions ?? []).flatMap((g) => g.bullets.map((b) => b.text)),
        ...(data.extras ?? []).flatMap((g) => g.bullets.map((b) => b.text)),
        ...(data.experience ?? []).flatMap((e) => e.subSections.flatMap((s) => s.bullets)),
      ];
      for (const b of bullets) {
        if (/[■▪•]/.test(b)) problems.push(`${f}: glyph retained`);
      }
      for (const l of (data.experience ?? []).flatMap((e) => e.subSections.map((s) => s.label))) {
        if (/Full Time|Intern|Others/.test(l)) problems.push(`${f}: margin label leaked`);
      }

      if ((data.experience?.length ?? 0) > 0) withIndustry++;
      if ((data.positions?.length ?? 0) > 0) withPositions++;
      if ((data.projects?.length ?? 0) > 0) withProjects++;
      if ((data.entrepreneurial?.length ?? 0) > 0) withEntrepreneurial++;
    }

    expect(problems.slice(0, 20)).toEqual([]);
    // Independently counted from the raw PDFs during spec research.
    expect(withIndustry).toBe(445);
    expect(withPositions).toBe(164);
    expect(withProjects).toBe(121);
    expect(withEntrepreneurial).toBe(17);
  }, 600_000);
});
```

- [ ] **Step 2: Run it against the corpus**

```bash
SKYNET_CORPUS_DIR="$SKYNET_CORPUS_DIR" npx vitest run test/corpus.test.ts
```

Expected: PASS. If `problems` is non-empty, the first 20 entries name the files and the failure mode — fix the parser and re-run. If a section count is off by a few, check whether those files genuinely lack the section (some have an empty heading) before changing the expected number.

- [ ] **Step 3: Confirm the corpus is not staged**

```bash
git status --porcelain | grep -i -E "\.pdf|RESUMES" || echo "clean: no corpus files staged"
```

Expected: `clean: no corpus files staged`.

- [ ] **Step 4: Document the two formats and the corpus flag**

In `README.md`, replace the "F1 only" limitation bullet with a Formats section naming Superset (61st and prior) and Skynet (62nd and later), noting that batch is auto-detected from the MBA id. Add a Testing section:

````markdown
## Testing

```bash
npm test          # unit tests against committed, anonymised fixtures
```

The full 450-resume corpus check is opt-in and never committed:

```bash
SKYNET_CORPUS_DIR="/path/to/resumes" npx vitest run test/corpus.test.ts
```
````

- [ ] **Step 5: Run everything one last time**

Run: `npx vitest run && npm run build`
Expected: all tests PASS (corpus test reported as skipped without the env var) and the build exits 0.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "test: opt-in full-corpus parser verification, document both formats"
```

---

## Deviations from the spec

Two, both deliberate. Executors read the spec alongside this plan, so the differences are recorded rather than left to be discovered.

1. **The corpus check is a Vitest test, not `scripts/parse-corpus.mjs`.** The spec named a standalone script. Task 1 introduces Vitest for the TDD cycle, so a second runner would be redundant; `test/corpus.test.ts` makes exactly the assertions the spec listed and gains `describe.skipIf` for the opt-in gate.
2. **`scripts/test-parse.mjs` is not fixed, and `esbuild` is not added.** The spec called for a Windows path fix and an `esbuild` devDependency because the old harness bundles TypeScript before running it. Vitest imports TypeScript directly, so `scripts/test-parse.mjs` becomes dead weight — delete it in Task 1 rather than repairing it.

## Notes for the executor

- **Task 6 Step 5 may leave one test red.** That is called out in the step and Task 7 fixes it. Do not paper over it by weakening the assertion.
- **Fixtures are regenerated in Task 8** because `TextItem` gains a field. Re-run the Task 1 Step 7 identity check every time fixtures are regenerated — it is the only thing standing between this repo and 450 people's personal data.
- **Superset has one fixture.** If a folder of 61st-batch resumes turns up, add them via `make-fixture.mjs` and extend `test/superset-golden.test.ts`; the single snapshot is thin cover for Tasks 2, 15 and 16.
- **Task 11 Step 7 is a manual visual check.** No unit test can confirm the preview matches the source PDF's geometry; do not skip it.
