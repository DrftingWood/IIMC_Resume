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

## Known limitations

- **Bold formatting is not recovered on upload.** PDF text extraction loses inline weight information. Re-apply with the **B** button in each editor field.
- **Calibri is not bundled.** On Windows the system Calibri is used automatically; on macOS / Linux / Vercel servers, the metric-compatible **Carlito** font is loaded as a fallback. Minor pixel differences are possible.
- **F1 only.** F2/F3 templates are out of scope for v1 (data schema is template-agnostic so they can plug in later).

## Tech

Vite · React 18 · TypeScript · Tailwind CSS · pdfjs-dist · react-to-print

## License

MIT
