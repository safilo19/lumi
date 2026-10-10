# NoteWeaver

Turn your lectures into clean, beautiful study notes. Record a class, get
organised notes with summaries, diagrams, formulas and a glossary — editable
and exportable to PDF. Free for every CUST student.

NoteWeaver is a **Progressive Web App (PWA)**: one codebase that installs like a
native app on Android, iPhone/iPad, Windows, macOS and Linux, and updates itself
in place — no app store, no download, no cost.

## Install it on your device

**Android (Chrome):** open the site → menu (⋮) → **Add to Home screen** / **Install app**.

**iPhone & iPad (Safari):** open the site → **Share** → **Add to Home Screen**.

**Windows / macOS / Linux (Chrome or Edge):** open the site → click the **install
icon** in the address bar (or menu → **Install NoteWeaver**).

Once installed it runs in its own window and keeps its icon on your home screen
or desktop.

## Automatic updates

Every time a new version ships, your installed app notices on its own and shows
a **"A new version is ready"** bar at the bottom. Tap **Update** and it reloads
into the latest version — nothing to re-download or reinstall.

## Develop

```bash
npm install
npm run dev        # http://localhost:3000
```

The service worker is **production-only** (so it never fights dev hot-reload).
To test installability and the update prompt, run a production build:

```bash
npm run build
npm start
```

`scripts/gen-sw.mjs` runs automatically before `dev` and `build`, stamping a
fresh `BUILD_ID` into `public/sw.js` so browsers detect each new deploy.

## Ship a release

CI builds the app on every push. To cut a versioned GitHub Release:

```bash
npm version patch        # bumps package.json + creates a git tag
git push --follow-tags   # pushes the commit and the tag
```

Pushing a `v*` tag triggers `.github/workflows/release.yml`, which builds and
publishes a GitHub Release with auto-generated notes.
