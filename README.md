# IIM-C F1 Resume Builder

A static web app for IIM Calcutta students to upload their existing F1 placement resume PDF, edit it in a live side-by-side preview, and export a pixel-faithful PDF.

## Live demo

_(deploy URL placeholder)_

## Local development

```bash
npm install
npm run dev
```

App runs at `http://localhost:5173`.

## Build & deploy

```bash
npm run build
npm run preview   # serve dist/ locally
```

Push to Vercel — no configuration required (static build of `dist/`).

## Formats

Two IIM Calcutta resume templates are supported:

- **Superset** — 61st batch and prior.
- **Skynet** — 62nd batch and later.

The batch number is auto-detected from the MBA id on the resume (`MBA/xxxx/<batch>`), so the correct template is picked automatically on upload.

## Sample data

Each template ships a fictional sample resume (`src/templates/*/sample.ts`) used
for the gallery thumbnail and the "start from sample" flow. Every achievement,
metric and organisation in them is invented.

Because these ship in a public app, the *identifying* fields are chosen so they
cannot resolve to a real person, rather than merely looking made-up:

- **Roll numbers use the `9xxx` block**, which IIMC does not issue — the same
  convention `scripts/make-fixture.mjs` applies to scrubbed fixtures. Never put
  a real-range id (`MBA/0247/63`) in a sample or a form placeholder: it belongs
  to somebody.
- **Emails use the RFC 2606 reserved `example.com`**, never the live
  `email.iimcal.ac.in` domain. Any plausible local part on the real domain may
  be, or later become, a student's actual mailbox.
- **Web and social links avoid invented vanity domains** (`<surname>.dev` and
  friends are usually already registered to someone); phone numbers stay in the
  non-assignable `+1 555` range.

A common first name and surname on their own identify nobody — the risk comes
from pairing one with a routable address or a real-range roll number, so keep
those two properties independent when editing the samples.

## Known limitations

- **Bold formatting is not recovered on upload.** PDF text extraction loses inline weight information. Re-apply with the **B** button in each editor field.
- **Calibri is not bundled.** On Windows the system Calibri is used automatically; on macOS / Linux / Vercel servers, the metric-compatible **Carlito** font is loaded as a fallback. Minor pixel differences are possible.

## Testing

```bash
npm test
```

**Test fixtures are not committed.** They are `PdfLine[]` dumps generated from real
student resumes, and this repository is public. Even with names, roll numbers and
email addresses scrubbed, the achievement text is verbatim and re-identifying, so
`test/fixtures/` is git-ignored and you must generate it locally before the suite
will pass:

```bash
node scripts/make-fixture.mjs <source.pdf> test/fixtures/<name>.json "<Fake Name>" "MBA/9001/63"
```

Five fixtures are expected: `skynet-a` through `skynet-d` (62nd-batch format) and
`superset-a` (61st-batch). `skynet-a` needs an Entrepreneurial section, `skynet-b`
a Position of Responsibility, `skynet-c` a Projects and Papers section placed before
Industry Experience, and `skynet-d` both a Full Time and an Intern margin group.

`make-fixture.mjs` refuses to write a file if any identifier survives scrubbing —
it checks the MBA id, email addresses, that the name substitution actually fired,
and that no token of the source filename appears in the output. Do not bypass it.

The full 450-resume corpus check is opt-in and is skipped without the env var:

```bash
SKYNET_CORPUS_DIR="/path/to/resumes" npx vitest run test/corpus.test.ts
```

Nothing under that directory is ever read into a committed file.

## Tech

Vite · React 18 · TypeScript · Tailwind CSS · pdfjs-dist · react-to-print

## License

MIT
