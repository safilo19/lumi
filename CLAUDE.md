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
  (`--font-mono`), **Patrick Hand** (`--font-hand`, handwriting — used for note
  content on screen + export).
- `@phosphor-icons/react` 2.1.10. TypeScript 5, ESLint 9
  (`eslint-config-next` 16.4.0 — `react-hooks/set-state-in-effect` is strict;
  prefer deriving state or `useSyncExternalStore` over setState-in-effect).

## Project structure

- `src/app/(app)/` — route group (does NOT affect URLs). The app:
  `/` dashboard, `/courses`, `/courses/[id]`, `/library`, `/notes/[id]`,
  `/notes/[id]/edit`, `/record`, `/review` (flashcards), `/quiz`, `/search`,
  `/settings`. Ask-your-notes is embedded per-note (`components/app/ask-note.tsx`
  on the note view), not a separate route.
- `src/app/about/` — marketing landing (`/about`): SiteNav, Hero, HowItWorks,
  Features, FreeForever, ClosingCta, SiteFooter.
- `src/app/api/notes/create/` — server-side AI note generation (keys stay
  server-side; the note's id is assigned client-side).
- `src/app/api/quiz/`, `src/app/api/ask/` — AI quiz generation + ask-your-notes
  (both call FreeRouter `freeChat`; client sends note context, keys stay server).
- `src/app/api/visual/` — AI generates one diagram/flowchart/mindmap/illustration
  (SVG) block from note context. `src/app/api/photo/` — free no-key image search
  (Openverse). Note blocks now include `image` + `illustration`.
- `src/lib/local/cards.ts` — flashcards in IndexedDB (`cards` store, DB v2) +
  deterministic card generation from note blocks. `src/lib/study/` — `sm2.ts`
  (spaced repetition) + `quiz.ts` (type). `src/lib/notes/text.ts` —
  `noteToPlainText` (AI context + search haystack).
- `src/app/api/mcp/` — MCP server endpoint.
- `src/lib/local/` — IndexedDB store (`notes.ts`) + loader hooks
  (`use-notes.ts`: `useNotes`, `useCourseNotes`, `useNote`, `useNoteCounts`).
- `src/lib/freerouter/` — AI pipeline / provider failover.
- `src/lib/mock-data.ts` — the `Note` type + `NoteBlock` union (summary,
  heading, paragraph, bullets, keyterm, callout, glossary, formula, diagram,
  flowchart, mindmap) + `courses`. `src/lib/freerouter/types.ts` MUST mirror
  `NoteBlock` exactly. Renderer: `components/app/note-blocks.tsx`.
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

- 2026-10-11 — Draggable diagram canvas (not committed): diagram/flowchart/
  mindmap blocks now render in `diagram-canvas.tsx` via `@xyflow/react` — nodes
  are draggable, the canvas pans/zooms (Controls + fit view) with a fullscreen
  toggle; replaced the old static SVG renderers (removed DiagramFlow/Flowchart/
  Mindmap + helpers from `note-blocks.tsx`). Build (clean), lint, tsc green.
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
- 2026-10-11 — Media + AI visuals + interactive diagrams (not committed): added
  `image` + `illustration` note blocks. Editor gained an "Add with AI and media"
  panel: AI-generate illustration/flowchart/mindmap/diagram from the note
  (`/api/visual`), upload an image, or find a free photo (`/api/photo`,
  Openverse). Diagrams now render in a shared `FigureFrame` with expand-to-
  fullscreen; mindmap branches are collapsible (`<details>`). `blocksToText`
  exported from `lib/notes/text.ts`. Build, lint, tsc green.
- 2026-10-11 — Handwriting font fix + note visual redesign (committed `e7c5479`,
  NOT yet pushed — prod-deploy gate): swapped Patrick Hand (single static weight,
  wasn't applying) for the Caveat variable font (`--font-hand-src` → `--font-hand`),
  applied across note view, note cards, and export; scaled note typography.
  Added `components/app/note-art.tsx` — a seeded generative SVG header per note
  (deterministic from note id). Build, lint, tsc green.
- 2026-10-11 — Study features + diagram polish (Phases 6-9 + 3; not committed):
  flashcards + SM-2 spaced repetition (`/review`, `lib/local/cards.ts`,
  `lib/study/sm2.ts`, `cards` IndexedDB store, DB v2); AI quiz (`/quiz`,
  `/api/quiz`); ask-your-notes AI chat with local keyword retrieval (`/ask`,
  `/api/ask`); global search + `tags` on notes (`/search`, topbar wired,
  editor tag input, chips on note view). FreeRouter gained `freeChat`.
  Note page gained Study/Quiz buttons; sidebar + dashboard gained the tools.
  Polished flowchart (diamond decisions, arrow connectors) + mindmap connector.
  Build, lint, tsc green.
- 2026-10-11 — First-run tour (Phase 5; not committed): animated 5-step
  welcome walkthrough (`components/app/first-run-tour.tsx`, `motion`/
  `AnimatePresence`, respects reduced motion) mounted in `(app)/layout.tsx`,
  gated by `localStorage` key `lumi-tour-done`; last step routes to `/record`.
  Build, lint, tsc green.
- 2026-10-11 — Export overhaul (Phase 4; not committed): new branded
  `ExportDialog` (`components/app/export-dialog.tsx`) with format (PDF / PNG
  image / Word .docx) + paper style (handwritten / clean / minimal). PDF drives
  browser print with `data-paper` on `<html>` + new print/paper CSS in
  `globals.css`; PNG via `html-to-image`; `.docx` via `src/lib/export/docx.ts`
  (`docx`). Added `.lumi-mark` highlighter on key terms. `NoteToolbar` now takes
  `note` and shows Edit + Export (dropped the Share stub). Build, lint, tsc green.
- 2026-10-11 — Notes redesign (Phase 2 of the overhaul; not committed):
  expanded `NoteBlock` with `keyterm`, `callout` (tip/important/example/
  warning), `glossary`, `flowchart`, `mindmap` (mirrored in `types.ts`);
  rewrote `NOTE_SYSTEM_PROMPT` for the branded Lumi format + LaTeX; extended
  `llm.ts` sanitizer. Rebuilt `note-blocks.tsx` (branded render + KaTeX +
  custom SVG-ish flowchart/mindmap) and `note-editor.tsx` (editors for all new
  kinds). Added `katex` + Patrick Hand handwriting font applied to note
  content. Build, lint, tsc green.
- 2026-10-11 — English-only pipeline + empty library (Phase 1 of a notes
  overhaul; not committed): STT now translates to English via Groq
  `/audio/translations` (whisper-large-v3), falling back to verbatim
  transcription — `STT_CHAIN` gained a `mode` (`config.ts`, `stt.ts`); note
  prompt forces English output (`prompt.ts`). Removed sample-note seeding so
  fresh installs start empty (`src/lib/local/notes.ts`, dropped `ensureSeeded`);
  added a `/library` empty state. Build, lint, tsc green.
- 2026-10-10 — Local-first conversion (commit `1d004cb`, pushed to `main`):
  removed all auth + the Postgres data layer (`src/lib/auth`, `src/lib/db`,
  `src/proxy.ts`, login/signup, `/api/auth/*`, `PATCH /api/notes/[id]`,
  `db/schema.sql`); notes persist in IndexedDB (`src/lib/local`); dropped `pg`,
  `@types/pg`, `@vercel/functions`; marketing CTAs point to `/`. Build, lint,
  tsc green.