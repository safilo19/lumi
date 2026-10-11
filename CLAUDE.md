# CLAUDE.md — Lumi

> Project guide for Claude Code. **Hard cap: 200 lines — never exceed.**
> **Standing rule:** after any change I apply to this app, I update this file
> (stack, structure, conventions, and the Recent changes log) in the same turn.
> Keep entries terse; trim the oldest Recent-changes bullets before hitting 200.

## What Lumi is

A 100%-free web/PWA for CUST University students: record a lecture → transcribe
→ generate aesthetic study notes (summaries, glossary, Mermaid diagrams, KaTeX)
→ organise by course → edit → export PDF. Mixed English + Urdu.

- **Local-first, no accounts.** Like Obsidian used without login: every note
  lives on the user's own device via IndexedDB. No auth, no shared cloud DB —
  each device sees only its own notes.
- **FreeRouter**: server-side auto-failover across free AI APIs so the app
  stays free. API keys never leave the server and never ship in installers.
- Distributed as installers via GitHub Releases (`android/`, `desktop/`).

## Hard rules (do not break)

- **NO emojis anywhere** in UI, code, or content. Icons = Phosphor only
  (`@phosphor-icons/react`).
- **AI keys** (`GROQ_API_KEY`, `GEMINI_API_KEY`, `OPENROUTER_API_KEY`) live
  ONLY in `.env.local` (gitignored). Never echo their values; never bundle
  them into any downloadable/installer build.
- **Read `node_modules/next/dist/docs/` before writing Next.js code** — this
  is a modified Next 16 (see AGENTS.md); APIs differ from training data.
- **Never push to `main` without explicit permission** — `main` is wired to a
  Vercel production deploy.
- **Never commit** keystores / `.p12` / `.jks` or signing passwords (the cert
  SHA-256 in `assetlinks.json` is public; the keystore + password are secret).
- Git identity is **repo-local only**: `Safi Zahid
  <177297944+safilo19@users.noreply.github.com>`. Leave global config alone.
- Commit messages end with `Co-Authored-By: Claude Opus 4.8
  <noreply@anthropic.com>`; PR descriptions end with the "Generated with
  Claude Code" line.

## Stack

- Next.js **16.4.0** (Turbopack, App Router). `params` is a `Promise`
  (`await` in Server Components, `use()` in Client Components).
- React **19.3.0** / react-dom 19.3.0, `motion` 14.1.0.
- Tailwind CSS 4, `class-variance-authority`, `clsx`, `tailwind-merge`, `geist`.
- `katex` for math (`formula.expr` is LaTeX); CSS imported in `layout.tsx`.
- Export: `docx` (Word) + `html-to-image` (PNG); PDF is browser print. Logic in
  `src/lib/export/` + `components/app/export-dialog.tsx`.
- `@xyflow/react` (React Flow) powers the draggable/zoomable diagram canvas
  (`components/app/diagram-canvas.tsx`) for diagram/flowchart/mindmap blocks.
- Fonts: Fredoka (`--font-display`), Nunito (`--font-sans`), Geist Mono
  (`--font-mono`), Caveat (`--font-hand`), Fraunces (`--font-serif`, editorial
  reading view — note titles/headings/drop caps).
- `@phosphor-icons/react` 2.1.10. TypeScript 5, ESLint 9
  (`eslint-config-next` 16.4.0 — `react-hooks/set-state-in-effect` is strict;
  prefer deriving state or `useSyncExternalStore` over setState-in-effect).

## Project structure

- `src/app/(app)/` — route group (does NOT affect URLs). The app:
  `/` dashboard, `/courses`, `/courses/[id]`, `/library`, `/notes/[id]`,
  `/notes/[id]/edit`, `/record`, `/review` (flashcards), `/quiz`, `/exam`
  (practice exam), `/analytics` (weak-spots), `/graph` (knowledge graph),
  `/occlusion` (image-occlusion), `/search`, `/settings`. Ask-your-notes is
  embedded per-note (`components/app/ask-note.tsx`), not a route.
- `src/app/about/` — marketing landing (`/about`): SiteNav, Hero, HowItWorks,
  Features, FreeForever, ClosingCta, SiteFooter.
- `src/app/api/notes/create/` — server-side AI note generation (keys stay
  server-side; the note's id is assigned client-side).
- `src/app/api/quiz/`, `src/app/api/ask/` — AI quiz generation + ask-your-notes
  (both call FreeRouter `freeChat`; client sends note context, keys stay server).
  `src/app/api/brief/` (TL;DR + key points) and `src/app/api/translate/`
  (string-array translate, structure-preserving) back the premium note tools.
  Also: `api/level` (difficulty rewrite via `generateNote`), `api/recap` (spoken
  recap script), `api/exam` (practice exam JSON), `api/embed` (Gemini embeddings
  for semantic search).
- `src/app/api/visual/` — AI generates one diagram/flowchart/mindmap/illustration
  (SVG) block from note context. `src/app/api/photo/` — free no-key image search
  (Openverse). Note blocks now include `image` + `illustration`.
- `src/lib/local/cards.ts` — flashcards in IndexedDB (`cards` store, DB v2) +
  deterministic card generation from note blocks. `src/lib/study/` — `sm2.ts`
  (spaced repetition) + `quiz.ts` (type). `src/lib/notes/text.ts` —
  `noteToPlainText` (AI context + search haystack).
- `src/app/api/mcp/` — MCP server endpoint.
- `src/lib/local/` — IndexedDB store (DB `lumi`, v5; stores: `notes`, `meta`,
  `cards`, `courses`, `highlights`, `attachments`, `audio`, `quizResults`,
  `embeddings`, `occlusions`). `notes.ts` (incl. `deleteNote`/`restoreNote`),
  `courses.ts` (user-created courses, no defaults), loader hooks `use-notes.ts`
  + `use-courses.ts` (`useCourses` + `addCourse`/`removeCourse`, shared cache).
- `src/lib/freerouter/` — AI pipeline / provider failover.
- `src/lib/mock-data.ts` — TYPES ONLY now (`Note`, `NoteBlock` union, `Course`);
  no data. `src/lib/freerouter/types.ts` MUST mirror `NoteBlock`. Renderer:
  `components/app/note-blocks.tsx`.
- `src/components/app/overlays.tsx` — global `confirmAction()` (delete
  confirmation modal) + `showUndo()` (undo snackbar); `<Overlays/>` mounts in
  `(app)/layout.tsx`. Use these for any destructive action.
- `src/components/` — `marketing/`, `app/` (sidebar, note-editor), `ui/`,
  `brand/`, plus `note-preview.tsx` (live sample note: hero + in-app card).
- `scripts/gen-sw.mjs` — service-worker generator (predev/prebuild).

## Conventions

- **Design:** "Playful & vivid" — electric indigo `#5b4df6` + lime + coral on
  soft cream `#fbf5e9`; chunky rounded display (Fredoka/Nunito); 3D pressable
  buttons. Use CSS tokens (`--radius-card`, `--shadow-pop`, `bg-surface`,
  `text-ink`, …), not raw hex in components.
- **Button** (`src/components/ui/button.tsx`) variants ONLY: `primary`, `lime`,
  `coral` (= destructive), `secondary`, `soft`, `ghost`. `buttonVariants` is
  exported for `cn()`. There is no `danger` variant.
- Dark mode via `data-theme` on `<html>` + `localStorage` key `lumi-theme`.
- Write/Edit in ≤50-line chunks. Never run `npm audit fix --force`.

## Commands

- `npm run dev` — dev server (predev runs `gen-sw.mjs`).
- `npm run build` / `npm run start` — production build / serve.
- Verify after changes: `npx eslint` → `npx tsc --noEmit` → `npx next build`
  (all must exit 0 before a change is "done").

## Git & deploy

- Remote `origin`: `github.com/safilo19/lumi.git`, branch `main`.
- `main` → Vercel production deploy. Stage specific files; keep `.env.local`
  out (already gitignored). Push only on request.

## Recent changes

- 2026-10-11 — Real study streak: `lib/local/streak.ts` (`useStreak` marks today
  active in the `meta` store, counts consecutive days); dashboard badge now live
  (was a hardcoded "4-day streak"). Exported `META` from `notes.ts`.

- 2026-10-11 — Study-suite batch (9 features; DB → v5). Difficulty levels
  (`/api/level` + Level menu in `note-reader`), Audio recap (`/api/recap` → read
  aloud), Attach slides/PDF (`note-attachments.tsx` + `attachments` store),
  Jump-to-moment audio (record saves blob → `audio` store → `note-audio.tsx`
  player with marker seeks), Practice exams (`/api/exam` + `/exam` page),
  Weak-spot analytics (`quizResults` store, quiz/exam log results, `/analytics`),
  Knowledge graph (`/graph`, xyflow, notes linked by shared key terms), Semantic
  search (`/api/embed` Gemini embeddings cached in `embeddings` store, cosine, in
  `/search` with keyword fallback), Image-occlusion (`/occlusion` + `occlusions`
  store, draw/hide/reveal boxes). All AI routes live-tested. Sidebar + note
  toolbar link the new pages.

- 2026-10-11 — Exhaustive, high-detail notes (`NOTE_SYSTEM_PROMPT`, `MAX_TOKENS` 8192):
  cover EVERY detail, no block cap (30-60+). Math → LaTeX `formula` blocks + every teacher
  example reproduced step by step; mindmaps/flowcharts end-to-end (explanations/example values,
  not heading links); `generateNote`/`generateNoteFromMedia` auto-add 1 best-effort SVG
  `illustration` for the first worked example (`illustrateExamples` + `generateIllustration`/
  `sanitizeSvg` in `llm.ts`, retry once). Live-tested: 42-47 blocks with formulas + illustration.
- 2026-10-11 — Premium note view, Phases A–C (Editorial luxe + cinematic, all 8
  tools) orchestrated by `note-reader.tsx`: Fraunces serif + editorial CSS
  (`.note-dropcap`/`.editorial-rule`/`.note-aurora`/`.reader-serif`),
  `note-masthead.tsx`, `reading-progress.tsx`, serif headings + drop cap +
  scroll-reveal, shimmer skeleton, `note-toc.tsx` (TOC + per-section cards/quiz),
  `focus-reader.tsx`, `read-aloud.tsx`, highlights (`highlights.ts` +
  `highlight-dom.ts`), `selection-tools.tsx` (Explain/Simplify/… via `/api/ask`),
  `note-brief.tsx` (`/api/brief`), translate (`/api/translate` + `translate.ts`).
  `#note-print-area`/`.no-print` preserved.

- 2026-10-11 — Scanner: instant + lightweight auto-crop + autofocus (pushed): no
  OpenCV (the 10MB wasm hung on "Preparing"). `doc-scanner.tsx` is dependency-free —
  live camera + alignment frame, instant multi-page capture, grayscale/contrast
  enhance; the AI reads pages server-side. Lightweight crop `src/lib/scan/crop.ts`
  (pure-canvas page bounding-box, runs in ms, returns null→full frame if unsure;
  Auto-crop toggle, default on). Camera requests continuous autofocus
  (`applyContinuousFocus`, feature-detected) + 1920x1080 for sharpness. Gemini 404
  fix kept: NOTE_CHAIN/VISION use `gemini-3.5-flash` + lite fallbacks (PDF 200).
- 2026-10-11 — Capture hub `/new` (pushed `c0df7b6`): create a note by Write /
  Scan / Import PDF / Upload audio / Paste text or link. Routes `/api/scan`
  (`generateNoteFromMedia`) + `/api/notes/from-text`. Course "Revision sheet" button.
- 2026-10-11 — Record screen overhaul (pushed `c9af589`): canvas visualizer
  `orbital-bloom.tsx`, Pause/Resume, "Mark moment" bookmarks, silence alert, Wake
  Lock, live transcript. STT requests `verbose_json`; `[IMPORTANT MOMENT]` tags.
- 2026-10-11 — User courses + delete/undo (pushed `aa5d698`): student-created
  courses (`courses` store), delete-with-confirm-and-undo via `overlays.tsx`
  (`confirmAction` + `showUndo`); `mock-data.ts` types-only, lookups via `useCourses`.
- 2026-10-11 — Android APK fixed (pushed `c67ffd9`): bumped `twa-manifest.json`
  minSdk 21→24 (androidbrowserhelper needs 24); rebuilt, replaced `lumi.apk`.
- 2026-10-11 — PWA SW hardening (`scripts/gen-sw.mjs`): network-first nav with a
  4s timeout so a stalled launch can't white-screen; offline "Try again" button.
- 2026-10-11 — Draggable diagram canvas (pushed `7099816`): diagram/flowchart/
  mindmap render in `diagram-canvas.tsx` via `@xyflow/react` (drag, pan/zoom, fullscreen).
- 2026-10-11 — Font/ask/diagram pass (committed `e148cbd`, not pushed): handwriting (Caveat) now
  only on headings + titles; note body reverted to clean sans. Ask-your-notes is
  embedded in every note (`ask-note.tsx`), standalone `/ask` route + nav removed;
  `/api/ask` gives a clear "AI not configured" message when keys are missing, and
  `NOTE_CHAIN` model ids updated to standard free ids (needs real keys in the
  deploy env). Diagrams/flowcharts/mindmaps gained pan + zoom in the fullscreen
  view (`FigureFrame`). Build (clean), lint, tsc green.
- 2026-10-11 — Inline WYSIWYG note editor (committed `8dbd7b4`, pushed): `note-editor.tsx`
  rewritten so the note is edited in place as it looks — text is editable via an
  uncontrolled contentEditable `Editable` (commits on blur, no caret jumps), each
  block has hover move/delete controls, visuals render read-only via the exported
  `Block` from `note-blocks.tsx`. Keeps the structured block model (flashcards/
  quiz/search still work). Landing `note-preview.tsx` refreshed to handwriting.
  Build (clean), lint, tsc green.
- 2026-10-11 — Media + AI visuals (`image`/`illustration` blocks; editor AI panel → `/api/visual` + `/api/photo`; `FigureFrame`).
- 2026-10-11 — Export: `ExportDialog` PDF/PNG/docx + `[data-paper]` paper styles; `.lumi-mark` highlighter.